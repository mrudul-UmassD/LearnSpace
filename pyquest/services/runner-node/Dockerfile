# Node.js Runner Service - Secure Docker Image
# Uses minimal Node.js image with strict security controls

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    # Remove npm cache to reduce image size
    npm cache clean --force && \
    # Remove npm to prevent runtime installations
    npm uninstall -g npm

# Copy application code
COPY server.js .

# Create temp directory for code execution (only writable location)
RUN mkdir -p /tmp && chmod 1777 /tmp

# Create non-root user for running the service
RUN adduser -D -u 1000 runner

# Security: Make filesystem read-only except /tmp
# This is enforced at container runtime

# Expose port
EXPOSE 8081

# Switch to non-root user
USER runner

# Health check - verifies Express server is running
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8081/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Run the Node application
CMD ["node", "server.js"]
