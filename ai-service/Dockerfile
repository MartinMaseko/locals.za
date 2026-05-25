# ── Stage 1: builder ─────────────────────────────────────────────────────────
# Full build environment — gcc/g++ needed to compile wheels for easyocr/numpy.
# We do all the heavy work here and copy only the results to the runtime stage.
FROM python:3.11-slim AS builder

WORKDIR /app

# Install C build tools + OpenCV runtime libs that easyocr links against.
# --no-install-recommends keeps the layer small.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first — Docker caches this layer independently.
# If requirements.txt hasn't changed, pip install is skipped on the next build.
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# ── Pre-bake EasyOCR model weights ────────────────────────────────────────────
# EasyOCR downloads ~100 MB of CRAFT (detection) + CRNN (recognition) weights
# from GitHub on first use. If we let this happen at container startup:
#   • First request takes 2+ minutes — Ozow receipt API calls will timeout.
#   • Azure Container Apps scales to zero — every cold start pays the penalty.
# Running this at BUILD time bakes the weights into the image layer so the
# container starts instantly regardless of scale-to-zero.
# gpu=False — Azure Container Apps has no GPU; CPU inference is fine for OCR.
RUN python -c "import easyocr; easyocr.Reader(['en'], gpu=False)"

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
# Lean runtime image — no gcc/g++. Final image size ≈ 900 MB vs ≈ 1.6 GB single-stage.
FROM python:3.11-slim AS runtime

WORKDIR /app

# Only the runtime .so libraries needed to run (not to build) the packages.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Copy compiled Python packages from builder — avoids re-downloading everything.
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy the pre-downloaded EasyOCR model cache (~100 MB, instant at startup).
COPY --from=builder /root/.EasyOCR /root/.EasyOCR

# Copy application source files only — no venv/, no __pycache__, no .vscode/.
COPY main.py parser.py weights.json ./

# SHARED_SECRET is overridden by the Azure Container App environment variable.
# This default is only a fallback and must never be used in production.
ENV SHARED_SECRET=change-me-in-azure
ENV PORT=8000

EXPOSE 8000

# Single worker — EasyOCR loads a large model into RAM.
# Multiple workers would multiply memory usage (e.g. 3 workers × 500 MB = 1.5 GB).
# No --reload in production (caused infinite restart loop in dev when model was downloading).
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
