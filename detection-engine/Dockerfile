# ── detection-engine: FastAPI ML conduct-detection service ────────────────────
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MPLBACKEND=Agg \
    MPLCONFIGDIR=/tmp/matplotlib

WORKDIR /app

# Install curl for container healthcheck
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy metadata + source and install package
COPY pyproject.toml README.md ./
COPY src ./src

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir .

# Generate the synthetic dataset and train the calibrated model at image build time
# so container startup is instantaneous and reproducible.
RUN mkdir -p data/sample models \
    && python -m detection_engine.generate_dataset \
    && python -m detection_engine.train

# Run as non-root user
RUN useradd --create-home --shell /bin/sh appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8000/health || exit 1

CMD ["uvicorn", "detection_engine.app:app", "--host", "0.0.0.0", "--port", "8000"]
