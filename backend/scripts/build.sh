#!/bin/bash

# Template Backend Build Script
# This script builds the backend with OpenAPI documentation generation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log files
LOG_DIR="../logs"
BUILD_LOG="$LOG_DIR/backend-build.log"
SWAGGER_LOG="$LOG_DIR/swagger-build.log"

# Ensure logs directory exists
mkdir -p "$LOG_DIR"

# Clear previous build logs
echo "🧹 Clearing previous build logs..." | tee "$BUILD_LOG"
echo "=================================================" | tee -a "$BUILD_LOG"
echo "Backend Build Started: $(date)" | tee -a "$BUILD_LOG"
echo "=================================================" | tee -a "$BUILD_LOG"

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}" | tee -a "$BUILD_LOG"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$BUILD_LOG"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$BUILD_LOG"
}

log_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$BUILD_LOG"
}

# Function to run command with logging
run_logged() {
    local cmd="$1"
    local desc="$2"
    log_info "Running: $desc"
    echo "Command: $cmd" >> "$BUILD_LOG"
    echo "----------------------------------------" >> "$BUILD_LOG"
    
    if eval "$cmd" >> "$BUILD_LOG" 2>&1; then
        log_success "$desc completed"
    else
        log_error "$desc failed"
        exit 1
    fi
    echo "----------------------------------------" >> "$BUILD_LOG"
}

# Build Steps
log_info "🚀 Starting Template Backend Build"

# Step 1: Go mod tidy
run_logged "go mod tidy" "Go module dependency resolution"

# Step 2: Go mod download
run_logged "go mod download" "Go module download"

# Step 3: Generate Swagger documentation
log_info "📚 Generating OpenAPI documentation"

# Check if swag is installed
if ! command -v swag &> /dev/null; then
    log_info "Installing swag for OpenAPI generation..."
    go install github.com/swaggo/swag/cmd/swag@latest
fi

SWAGGER_CMD="swag init -g cmd/server/main.go -o docs --parseDependency --parseInternal"
echo "Swagger generation started: $(date)" | tee "$SWAGGER_LOG"
echo "Command: $SWAGGER_CMD" | tee -a "$SWAGGER_LOG"
echo "----------------------------------------" | tee -a "$SWAGGER_LOG"

if eval "$SWAGGER_CMD" >> "$SWAGGER_LOG" 2>&1; then
    log_success "OpenAPI documentation generated"
    echo "Files generated:" | tee -a "$SWAGGER_LOG"
    ls -la docs/ | tee -a "$SWAGGER_LOG"
else
    log_error "OpenAPI documentation generation failed"
    exit 1
fi

# Step 4: Build binary
run_logged "go build -o bin/template-server cmd/server/main.go" "Building server binary"

# Step 5: Verify build
if [ -f "bin/template-server" ]; then
    log_success "Server binary created successfully"
    echo "Binary info:" | tee -a "$BUILD_LOG"
    ls -la bin/template-server | tee -a "$BUILD_LOG"
else
    log_error "Server binary not found"
    exit 1
fi

# Step 6: Copy OpenAPI spec to shared location
log_info "📋 Copying OpenAPI spec for frontend"
mkdir -p "../shared"
cp docs/swagger.json ../shared/api-spec.json
cp docs/swagger.yaml ../shared/api-spec.yaml
log_success "OpenAPI spec copied to shared directory"

# Build summary
echo "=================================================" | tee -a "$BUILD_LOG"
echo "Backend Build Completed Successfully: $(date)" | tee -a "$BUILD_LOG"
echo "=================================================" | tee -a "$BUILD_LOG"

log_success "🎉 Backend build completed successfully!"
echo ""
echo "📊 Build artifacts:"
echo "  • Server binary: bin/template-server"
echo "  • OpenAPI docs: docs/"
echo "  • Build logs: $BUILD_LOG"
echo "  • Swagger logs: $SWAGGER_LOG"
echo ""
echo "🚀 Ready to run: ./bin/template-server" 