# syntax=docker/dockerfile:1
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies (if any)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    libopenblas-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python packages
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download FastEmbed model to avoid runtime issues
RUN python -c "from fastembed import TextEmbedding; TextEmbedding(model_name='BAAI/bge-small-en-v1.5')"

# Copy application code
COPY backend/ .

# Expose port (FastAPI default)
EXPOSE 8000

# Environment variables (override in prod)
ENV PYTHONUNBUFFERED=1

# Command to run the FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
