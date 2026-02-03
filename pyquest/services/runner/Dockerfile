# PyQuest Runner Service - Secure Docker Image
# Uses minimal Python slim image with strict security controls

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .

# Create temp directory for code execution (only writable location)
RUN mkdir -p /tmp && chmod 1777 /tmp

# Create non-root user for running the service
RUN useradd -m -u 1000 runner

# Security: Make filesystem read-only except /tmp
# This is enforced at container runtime via docker-compose

# Expose port
EXPOSE 8080

# Switch to non-root user
USER runner

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python3 -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health').read()" || exit 1

# Run the Flask application
CMD ["python3", "app.py"]
