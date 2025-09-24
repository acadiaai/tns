#!/bin/bash

# Generate OpenAPI documentation from Go comments
echo "🔄 Generating OpenAPI documentation..."
$(go env GOPATH)/bin/swag init -g cmd/server/main.go

# Copy the generated spec to shared directory
echo "📋 Copying API spec to shared directory..."
mkdir -p ../shared
cp docs/swagger.json ../shared/api-spec.json

echo "✅ API documentation generated successfully!"
echo "📄 Swagger UI available at: http://localhost:8083/swagger/index.html"
echo "📄 API spec available at: ../shared/api-spec.json" 