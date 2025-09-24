#!/bin/bash

# Template Frontend Build Script
# This script builds the frontend with TypeScript type generation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log files
LOG_DIR="../logs"
BUILD_LOG="$LOG_DIR/frontend-build.log"
TYPES_LOG="$LOG_DIR/typescript-generation.log"

# Ensure logs directory exists
mkdir -p "$LOG_DIR"

# Clear previous build logs
echo "🧹 Clearing previous frontend build logs..." | tee "$BUILD_LOG"
echo "=================================================" | tee -a "$BUILD_LOG"
echo "Frontend Build Started: $(date)" | tee -a "$BUILD_LOG"
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
log_info "🚀 Starting Template Frontend Build"

# Step 1: Install dependencies
run_logged "npm ci" "Installing Node.js dependencies"

# Step 2: Generate TypeScript types from OpenAPI spec
log_info "🔧 Generating TypeScript types from OpenAPI specification"
echo "TypeScript generation started: $(date)" | tee "$TYPES_LOG"
echo "----------------------------------------" | tee -a "$TYPES_LOG"

# Check if OpenAPI spec exists
API_SPEC="../shared/api-spec.json"
if [ ! -f "$API_SPEC" ]; then
    log_warning "OpenAPI spec not found at $API_SPEC"
    log_info "Running backend build first to generate API spec..."
    (cd ../backend && chmod +x scripts/build.sh && ./scripts/build.sh)
fi

if [ -f "$API_SPEC" ]; then
    log_info "Found OpenAPI spec, generating TypeScript types..."
    
    # Generate TypeScript client
    GENERATOR_CMD="npx openapi-typescript-codegen --input $API_SPEC --output src/generated --client axios"
    echo "Command: $GENERATOR_CMD" | tee -a "$TYPES_LOG"
    echo "----------------------------------------" | tee -a "$TYPES_LOG"
    
    if eval "$GENERATOR_CMD" >> "$TYPES_LOG" 2>&1; then
        log_success "TypeScript types generated successfully"
        echo "Generated files:" | tee -a "$TYPES_LOG"
        ls -la src/generated/ | tee -a "$TYPES_LOG"
    else
        log_warning "TypeScript generation failed, creating fallback types..."
        
        # Create fallback types
        mkdir -p src/generated
        cat > src/generated/index.ts << 'EOF'
// Fallback API types for Template
export interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user: User;
}

export interface CreateUserRequest {
  name: string;
  email: string;
}

export interface CreateMessageRequest {
  user_id: string;
  content: string;
}

export interface HealthResponse {
  status: string;
  message: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
}
EOF
        log_success "Fallback TypeScript types created"
    fi
else
    log_error "OpenAPI spec not found and backend build failed"
    exit 1
fi

# Step 3: TypeScript compilation check
run_logged "npx tsc --noEmit" "TypeScript compilation check"

# Step 4: Build production bundle
run_logged "npm run build" "Building production bundle"

# Step 5: Verify build
if [ -d "dist" ]; then
    log_success "Production build created successfully"
    echo "Build info:" | tee -a "$BUILD_LOG"
    ls -la dist/ | tee -a "$BUILD_LOG"
else
    log_error "Production build not found"
    exit 1
fi

# Build summary
echo "=================================================" | tee -a "$BUILD_LOG"
echo "Frontend Build Completed Successfully: $(date)" | tee -a "$BUILD_LOG"
echo "=================================================" | tee -a "$BUILD_LOG"

log_success "🎉 Frontend build completed successfully!"
echo ""
echo "📊 Build artifacts:"
echo "  • Production bundle: dist/"
echo "  • TypeScript types: src/generated/"
echo "  • Build logs: $BUILD_LOG"
echo "  • Types logs: $TYPES_LOG"
echo ""
echo "🚀 Ready to serve: npm run preview" 