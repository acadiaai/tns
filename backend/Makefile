.PHONY: build run openapi-spec generate-frontend-client clean

# Build the backend
build:
	go build -ldflags "-X main.buildTime=$(shell date -u '+%Y-%m-%d_%H:%M:%S_UTC')" -o bin/server cmd/server/main.go

# Build and generate OpenAPI spec
build-and-swagger:
	@echo "Building backend..."
	go build -ldflags "-X main.buildTime=$(shell date -u '+%Y-%m-%d_%H:%M:%S_UTC')" -o ./tmp/main ./cmd/server
	@echo "Generating OpenAPI spec..."
	@if command -v swag &> /dev/null; then \
		swag init -g cmd/server/main.go -o docs --parseDependency --parseInternal; \
		echo "OpenAPI spec generated at docs/swagger.json"; \
		echo "Copying spec to shared directory..."; \
		mkdir -p ../shared; \
		cp docs/swagger.json ../shared/api-spec.json; \
		echo "Generating frontend TypeScript client..."; \
		cd ../frontend && npm run generate-api-client > /dev/null 2>&1 || echo "Frontend client generation failed (frontend may not be ready)"; \
	else \
		echo "swag not installed, skipping OpenAPI generation"; \
	fi
	@echo "Generating WebSocket TypeScript types..."
	@go run scripts/generate-types.go ../frontend/src/types/websocket.ts > /dev/null 2>&1 || echo "WebSocket type generation failed"

# Build with type generation
build-with-types:
	@echo "Checking for ChromaDB API changes..."
	@if curl -s http://localhost:8001/openapi.json > /dev/null 2>&1; then \
		cd ../chromadb-service && $(MAKE) generate-go-client; \
	fi
	go build -o ./tmp/main ./cmd/server

# Run the backend
run:
	air


# Generate OpenAPI spec using swag
openapi-spec:
	@echo "Generating OpenAPI spec..."
	@if ! command -v swag &> /dev/null; then \
		echo "Installing swag..."; \
		go install github.com/swaggo/swag/cmd/swag@latest; \
	fi
	swag init -g cmd/server/main.go -o docs
	@echo "OpenAPI spec saved to docs/swagger.json"

# Generate TypeScript client for frontend
generate-frontend-client:
	@echo "Generating TypeScript client..."
	@if [ ! -f "docs/swagger.json" ]; then \
		echo "OpenAPI spec not found. Running 'make openapi-spec' first..."; \
		$(MAKE) openapi-spec; \
	fi
	@cd ../frontend && npm run generate-api-client
	@echo "TypeScript client generated"

# Generate WebSocket TypeScript types from Go structs
generate-websocket-types:
	@echo "Generating WebSocket TypeScript types..."
	@go run scripts/generate-types.go ../frontend/src/types/websocket.ts
	@echo "WebSocket types generated at frontend/src/types/websocket.ts"

# Clean build artifacts
clean:
	rm -rf bin/ docs/ tmp/

# Full setup
setup: openapi-spec
	@echo "Backend setup complete!"

# Development mode with auto-reload and frontend updates
dev: openapi-spec generate-frontend-client generate-websocket-types
	air

# Generate flow diagrams from Go code using static analysis
generate-diagrams:
	@echo "🔍 Analyzing Go code structure and generating flow diagrams..."
	@mkdir -p docs/diagrams
	@echo "Analyzing WebSocket handler logic flow..."
	@go run scripts/diagram-generator.go internal/api/session_websocket_handler.go > docs/diagrams/websocket-flow.md
	@echo "✅ WebSocket flow diagram saved to docs/diagrams/websocket-flow.md"
	@echo "Analyzing main handlers..."
	@find internal/api -name "*_handlers.go" -exec go run scripts/diagram-generator.go {} \; > docs/diagrams/handlers-flow.md
	@echo "✅ Handlers flow diagram saved to docs/diagrams/handlers-flow.md"

# Analyze specific handler file
analyze-handler:
	@if [ -z "$(FILE)" ]; then \
		echo "Usage: make analyze-handler FILE=path/to/handler.go"; \
		exit 1; \
	fi
	@echo "🔍 Analyzing $(FILE)..."
	@go run scripts/diagram-generator.go $(FILE)

# Generate WebSocket specific flow analysis
analyze-websocket:
	@echo "🔍 Deep analysis of WebSocket handler branching logic..."
	@go run scripts/websocket-analyzer.go internal/api/session_websocket_handler.go > docs/diagrams/websocket-branches.md
	@echo "✅ WebSocket branching analysis saved to docs/diagrams/websocket-branches.md"

# Visualize all entry points for the app
analyze-entry-points:
	@echo "🔍 Analyzing application entry points..."
	@mkdir -p docs/diagrams
	@echo "# Application Entry Points Analysis" > docs/diagrams/entry-points.md
	@echo "" >> docs/diagrams/entry-points.md
	@echo "## WebSocket Endpoints" >> docs/diagrams/entry-points.md
	@grep -n "WebSocket\|websocket" internal/api/*.go | head -20 >> docs/diagrams/entry-points.md
	@echo "" >> docs/diagrams/entry-points.md
	@echo "## HTTP Handlers" >> docs/diagrams/entry-points.md
	@grep -n "func.*Handler\|r\\..*(" internal/api/router.go >> docs/diagrams/entry-points.md
	@echo "✅ Entry points analysis saved to docs/diagrams/entry-points.md"