# Frontend build stage
FROM --platform=linux/amd64 node:20-alpine AS frontend-builder

WORKDIR /frontend

# Copy frontend package files
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend (skip type generation since we're in Docker)
RUN npm run build-only

# Backend build stage
FROM --platform=linux/amd64 golang:1.23 AS backend-builder

WORKDIR /app

# Copy go mod files
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy backend source code
COPY backend/ .

# Copy frontend build to embed in Go binary
COPY --from=frontend-builder /frontend/dist ./internal/api/static

# Build the application with CGO for SQLite
RUN CGO_ENABLED=1 go build -ldflags="-s -w" -o main cmd/server/main.go

# Runtime stage
FROM --platform=linux/amd64 debian:bookworm-slim

# Install ca-certificates and sqlite3
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates sqlite3 && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -r -u 1001 -s /bin/false appuser

WORKDIR /app

# Copy the binary from builder
COPY --from=backend-builder /app/main .

# Create directory for database with proper permissions
RUN mkdir -p /app/data && chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]