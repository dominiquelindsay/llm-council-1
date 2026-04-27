# Use Python 3.11 slim image for a small production footprint
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DATA_DIR=/app/data/conversations

# Set working directory
WORKDIR /app

# Install system dependencies required for some Python packages (like Pillow)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast and reliable dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency files from the project root (context should be the project root)
COPY pyproject.toml uv.lock ./

# Install project dependencies into the system site-packages
# Including the missing dependencies found in the codebase
RUN uv pip install --system \
    PyPDF2 \
    python-docx \
    openpyxl \
    reportlab \
    Pillow \
    requests

# Install the rest of the dependencies from pyproject.toml
RUN uv pip install --system -r pyproject.toml

# Copy the backend source code
# Since the Dockerfile is in /backend, we copy the contents of the current context's backend folder
COPY backend/ .

# Create the data directory
RUN mkdir -p /app/data/conversations

# Expose port 5000
EXPOSE 5000

# Start the application with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
