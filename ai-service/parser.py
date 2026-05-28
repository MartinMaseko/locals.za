import json
import re
from pathlib import Path
import io
import numpy as np
from PIL import Image
import easyocr

# Load once at import time — model download happens on first run (~100MB, stored in ~/.EasyOCR)
_reader = easyocr.Reader(['en'], gpu=False, verbose=False)

_weights_path = Path(__file__).parent / "weights.json"
with open(_weights_path) as f:
    WEIGHT_TABLE: dict[str, float] = json.load(f)


def _extract_text(image_bytes: bytes) -> list[str]:
    """Run EasyOCR and return a flat list of recognised text lines."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    arr = np.array(img)
    result = _reader.readtext(arr)
    # result is list of ([bbox], text, confidence)
    return [text.strip() for (_, text, conf) in result if conf > 0.3 and text.strip()]


def _find_field(lines: list[str], patterns: list[str]) -> str | None:
    for line in lines:
        for pat in patterns:
            m = re.search(pat, line, re.IGNORECASE)
            if m:
                try:
                    return m.group(1).strip()
                except IndexError:
                    return m.group(0).strip()
    return None


def _parse_amount(text: str) -> float | None:
    cleaned = re.sub(r"[R\s,]", "", text)
    try:
        return float(cleaned)
    except ValueError:
        return None


def _estimate_kg(description: str, qty: int) -> float:
    desc_lower = description.lower()
    for keyword, kg_per_unit in WEIGHT_TABLE.items():
        if keyword in desc_lower:
            return round(kg_per_unit * qty, 2)
    return round(0.5 * qty, 2)


def _parse_items(lines: list[str]) -> list[dict]:
    items = []
    item_pat = re.compile(
        r"^(.+?)\s+(\d+)\s*[Xx@]?\s*(\d[\d\s,\.]*)\s+(\d[\d\s,\.]*)$"
    )
    simple_pat = re.compile(r"^(.+?)\s{2,}(\d[\d\s,\.]*)$")

    for line in lines:
        m = item_pat.match(line)
        if m:
            desc     = m.group(1).strip()
            qty      = int(m.group(2))
            unit_p   = _parse_amount(m.group(3)) or 0.0
            line_tot = _parse_amount(m.group(4)) or 0.0
            items.append({
                "description": desc,
                "qty":         qty,
                "unitPrice":   unit_p,
                "lineTotal":   line_tot,
                "estimatedKg": _estimate_kg(desc, qty),
            })
            continue
        m = simple_pat.match(line)
        if m:
            desc     = m.group(1).strip()
            line_tot = _parse_amount(m.group(2)) or 0.0
            if line_tot > 0:
                items.append({
                    "description": desc,
                    "qty":         1,
                    "unitPrice":   line_tot,
                    "lineTotal":   line_tot,
                    "estimatedKg": _estimate_kg(desc, 1),
                })
    return items


def _weight_class(kg: float) -> str:
    if kg <= 10: return "light"
    if kg <= 30: return "medium"
    if kg <= 80: return "heavy"
    return "bulk"


def _quality_score(data: dict) -> tuple[float, list[str]]:
    score, warnings = 1.0, []
    for field, msg in [
        ("orderNumber", "Could not find order/receipt number"),
        ("storeName",   "Could not identify store name"),
        ("date",        "Could not find receipt date"),
        ("total",       "Could not find receipt total"),
    ]:
        if not data.get(field):
            score -= 0.15
            warnings.append(msg)
    if not data.get("items"):
        score -= 0.2
        warnings.append("No line items found — receipt may be unclear or upside down")
    return round(max(score, 0.0), 2), warnings


def parse_receipt(image_bytes: bytes) -> dict:
    lines = _extract_text(image_bytes)

    order_number = _find_field(lines, [
        r"(?:order|receipt|invoice|slip|no\.?|#)[:\s#]*([A-Z0-9\-]{4,})",
        r"([A-Z]{2,}\d{4,})",
    ])
    store_name = _find_field(lines, [
        r"^([A-Z][A-Za-z\s&]+(?:Cash\s*&?\s*Carry|Wholesale|Supermarket|Mart|Store))",
    ]) or (lines[0] if lines else None)
    date = _find_field(lines, [
        r"(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
        r"(\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})",
    ])

    subtotal = total = None
    for line in lines:
        if re.search(r"subtotal|sub total|sub-total", line, re.IGNORECASE):
            nums = re.findall(r"\d[\d\s,\.]+", line)
            if nums: subtotal = _parse_amount(nums[-1])
        if re.search(r"\btotal\b(?!\s*items)", line, re.IGNORECASE):
            nums = re.findall(r"\d[\d\s,\.]+", line)
            if nums: total = _parse_amount(nums[-1])

    items           = _parse_items(lines)
    total_weight_kg = round(sum(i["estimatedKg"] for i in items), 2)

    result = {
        "orderNumber":        order_number,
        "storeName":          store_name,
        "date":               date,
        "subtotal":           subtotal,
        "total":              total,
        "items":              items,
        "estimatedWeightKg":  total_weight_kg,
        "weightClass":        _weight_class(total_weight_kg),
    }
    result["qualityScore"], result["warnings"] = _quality_score(result)
    return result
