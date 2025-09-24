# Build stage
FROM --platform=linux/amd64 golang:1.23 AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application with CGO for SQLite
RUN CGO_ENABLED=1 go build -o main cmd/server/main.go

# Runtime stage
FROM --platform=linux/amd64 debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates sqlite3 && rm -rf /var/lib/apt/lists/*

WORKDIR /root/

# Copy the binary from builder
COPY --from=builder /app/main .

# Copy any necessary config files or assets
# COPY --from=builder /app/internal/templates ./internal/templates

# Expose port
EXPOSE 8080

# Run the application
CMD ["./main"]