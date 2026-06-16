FROM python:3.10-slim

# Set environment variable to optimize logs output
ENV PYTHONUNBUFFERED=1

WORKDIR /workspace

# Install system dependencies (build-essential and libpq are needed for postgres drivers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install pip dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all files
COPY . .

# Set PYTHONPATH to include backend so app can find backend module
ENV PYTHONPATH=/workspace/backend

# Expose server port (Hugging Face Spaces expects 7860)
EXPOSE 7860

# Start backend application
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "7860"]
