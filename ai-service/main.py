import os
from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from fastapi.responses import JSONResponse
from parser import parse_receipt

app = FastAPI(title="LocalsZA Receipt OCR", docs_url="/docs")

SHARED_SECRET = os.environ.get("SHARED_SECRET", "dev-secret")


def _verify(x_shared_secret: str | None):
    if x_shared_secret != SHARED_SECRET:
        raise HTTPException(status_code=401, detail="Invalid shared secret")


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/parse-receipt")
async def parse_receipt_endpoint(
    file: UploadFile = File(...),
    x_shared_secret: str | None = Header(default=None),
):
    _verify(x_shared_secret)
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    image_bytes = await file.read()
    if len(image_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large — max 10 MB")
    try:
        result = parse_receipt(image_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")
    return JSONResponse(content=result)
