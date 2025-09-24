package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"sync/atomic"

	"github.com/gorilla/websocket"
	"github.com/sirupsen/logrus"
)

// JSON-RPC 2.0 message types
type JSONRPCRequest struct {
	JSONRPC string          `json:"jsonrpc"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
	ID      interface{}     `json:"id,omitempty"`
}

type JSONRPCResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	Result  interface{}     `json:"result,omitempty"`
	Error   *JSONRPCError   `json:"error,omitempty"`
	ID      interface{}     `json:"id"`
}

type JSONRPCError struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// JSON-RPC 2.0 error codes
const (
	ParseError     = -32700
	InvalidRequest = -32600
	MethodNotFound = -32601
	InvalidParams  = -32602
	InternalError  = -32603
)

// MCPTransport handles JSON-RPC 2.0 communication
type MCPTransport struct {
	server        *MCPServer
	logger        *logrus.Logger
	capabilities  map[string]bool
	sessionInfo   map[string]interface{}
	mu            sync.RWMutex
	requestID     atomic.Uint64
}

// NewMCPTransport creates a new MCP transport handler
func NewMCPTransport(server *MCPServer, logger *logrus.Logger) *MCPTransport {
	return &MCPTransport{
		server: server,
		logger: logger,
		capabilities: map[string]bool{
			"tools":         true,
			"prompts":       false,
			"resources":     false,
			"logging":       true,
			"experimental":  true,
		},
		sessionInfo: make(map[string]interface{}),
	}
}

// HandleRequest processes a JSON-RPC 2.0 request
func (t *MCPTransport) HandleRequest(ctx context.Context, req JSONRPCRequest) JSONRPCResponse {
	t.logger.WithFields(logrus.Fields{
		"method": req.Method,
		"id":     req.ID,
	}).Debug("Handling MCP request")

	switch req.Method {
	case "initialize":
		return t.handleInitialize(ctx, req)
	case "tools/list":
		return t.handleToolsList(ctx, req)
	case "tools/call":
		return t.handleToolsCall(ctx, req)
	case "notifications/message":
		return t.handleNotification(ctx, req)
	case "logging/setLevel":
		return t.handleSetLogLevel(ctx, req)
	default:
		return JSONRPCResponse{
			JSONRPC: "2.0",
			Error: &JSONRPCError{
				Code:    MethodNotFound,
				Message: fmt.Sprintf("Method not found: %s", req.Method),
			},
			ID: req.ID,
		}
	}
}

// handleInitialize handles the MCP initialization handshake
func (t *MCPTransport) handleInitialize(ctx context.Context, req JSONRPCRequest) JSONRPCResponse {
	var params struct {
		ProtocolVersion string                 `json:"protocolVersion"`
		Capabilities    map[string]interface{} `json:"capabilities"`
		ClientInfo      struct {
			Name    string `json:"name"`
			Version string `json:"version"`
		} `json:"clientInfo"`
	}

	if req.Params != nil {
		if err := json.Unmarshal(req.Params, &params); err != nil {
			return JSONRPCResponse{
				JSONRPC: "2.0",
				Error: &JSONRPCError{
					Code:    InvalidParams,
					Message: "Invalid parameters",
					Data:    err.Error(),
				},
				ID: req.ID,
			}
		}
	}

	// Store client info
	t.mu.Lock()
	t.sessionInfo["clientInfo"] = params.ClientInfo
	t.sessionInfo["protocolVersion"] = params.ProtocolVersion
	t.mu.Unlock()

	// Return server capabilities
	return JSONRPCResponse{
		JSONRPC: "2.0",
		Result: map[string]interface{}{
			"protocolVersion": "2025-06-18", // Latest MCP version
			"capabilities":    t.capabilities,
			"serverInfo": map[string]interface{}{
				"name":    "therapy-conductor",
				"version": "1.0.0",
			},
		},
		ID: req.ID,
	}
}

// handleToolsList returns the list of available tools
func (t *MCPTransport) handleToolsList(ctx context.Context, req JSONRPCRequest) JSONRPCResponse {
	tools := t.server.GetTools()
	
	return JSONRPCResponse{
		JSONRPC: "2.0",
		Result: map[string]interface{}{
			"tools": tools,
		},
		ID: req.ID,
	}
}

// handleToolsCall executes a tool
func (t *MCPTransport) handleToolsCall(ctx context.Context, req JSONRPCRequest) JSONRPCResponse {
	var params struct {
		Name      string          `json:"name"`
		Arguments json.RawMessage `json:"arguments"`
	}

	if err := json.Unmarshal(req.Params, &params); err != nil {
		return JSONRPCResponse{
			JSONRPC: "2.0",
			Error: &JSONRPCError{
				Code:    InvalidParams,
				Message: "Invalid parameters",
				Data:    err.Error(),
			},
			ID: req.ID,
		}
	}

	// Execute the tool
	result, err := t.server.CallTool(ctx, params.Name, params.Arguments)
	if err != nil {
		return JSONRPCResponse{
			JSONRPC: "2.0",
			Error: &JSONRPCError{
				Code:    InternalError,
				Message: fmt.Sprintf("Tool execution failed: %v", err),
			},
			ID: req.ID,
		}
	}

	return JSONRPCResponse{
		JSONRPC: "2.0",
		Result: map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": fmt.Sprintf("Tool %s executed successfully", params.Name),
				},
			},
			"data": result,
		},
		ID: req.ID,
	}
}

// handleNotification handles incoming notifications
func (t *MCPTransport) handleNotification(ctx context.Context, req JSONRPCRequest) JSONRPCResponse {
	// Notifications don't require a response in JSON-RPC 2.0
	if req.ID == nil {
		t.logger.WithField("method", req.Method).Debug("Received notification")
		return JSONRPCResponse{} // Empty response for notifications
	}

	return JSONRPCResponse{
		JSONRPC: "2.0",
		Result:  map[string]interface{}{"acknowledged": true},
		ID:      req.ID,
	}
}

// handleSetLogLevel handles log level changes
func (t *MCPTransport) handleSetLogLevel(ctx context.Context, req JSONRPCRequest) JSONRPCResponse {
	var params struct {
		Level string `json:"level"`
	}

	if err := json.Unmarshal(req.Params, &params); err != nil {
		return JSONRPCResponse{
			JSONRPC: "2.0",
			Error: &JSONRPCError{
				Code:    InvalidParams,
				Message: "Invalid parameters",
			},
			ID: req.ID,
		}
	}

	// Set log level
	level, err := logrus.ParseLevel(params.Level)
	if err != nil {
		return JSONRPCResponse{
			JSONRPC: "2.0",
			Error: &JSONRPCError{
				Code:    InvalidParams,
				Message: fmt.Sprintf("Invalid log level: %s", params.Level),
			},
			ID: req.ID,
		}
	}

	t.logger.SetLevel(level)

	return JSONRPCResponse{
		JSONRPC: "2.0",
		Result:  map[string]interface{}{"level": params.Level},
		ID:      req.ID,
	}
}

// ServeHTTP implements the HTTP handler for MCP over HTTP
func (t *MCPTransport) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Read request body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		t.sendErrorResponse(w, ParseError, "Failed to read request body", nil)
		return
	}

	// Parse JSON-RPC request
	var req JSONRPCRequest
	if err := json.Unmarshal(body, &req); err != nil {
		t.sendErrorResponse(w, ParseError, "Invalid JSON", nil)
		return
	}

	// Validate JSON-RPC version
	if req.JSONRPC != "2.0" {
		t.sendErrorResponse(w, InvalidRequest, "Invalid JSON-RPC version", req.ID)
		return
	}

	// Handle the request
	resp := t.HandleRequest(r.Context(), req)

	// Send response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// sendErrorResponse sends a JSON-RPC error response
func (t *MCPTransport) sendErrorResponse(w http.ResponseWriter, code int, message string, id interface{}) {
	resp := JSONRPCResponse{
		JSONRPC: "2.0",
		Error: &JSONRPCError{
			Code:    code,
			Message: message,
		},
		ID: id,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// HandleWebSocket handles MCP over WebSocket
func (t *MCPTransport) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			// TODO: Implement proper origin checking
			return true
		},
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		t.logger.WithError(err).Error("Failed to upgrade WebSocket")
		return
	}
	defer conn.Close()

	t.logger.Info("MCP WebSocket connection established")

	// Send initialization notification
	initNotification := map[string]interface{}{
		"jsonrpc": "2.0",
		"method":  "notifications/initialized",
		"params": map[string]interface{}{
			"meta": map[string]interface{}{
				"connectionId": fmt.Sprintf("ws-%d", t.requestID.Add(1)),
			},
		},
	}
	conn.WriteJSON(initNotification)

	// Handle messages
	for {
		var req JSONRPCRequest
		if err := conn.ReadJSON(&req); err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				t.logger.WithError(err).Error("WebSocket error")
			}
			break
		}

		// Handle the request
		resp := t.HandleRequest(context.Background(), req)

		// Send response if not a notification
		if req.ID != nil {
			if err := conn.WriteJSON(resp); err != nil {
				t.logger.WithError(err).Error("Failed to send response")
				break
			}
		}
	}

	t.logger.Info("MCP WebSocket connection closed")
}

// SendNotification sends a JSON-RPC notification to connected clients
func (t *MCPTransport) SendNotification(method string, params interface{}) {
	// This would be sent to all connected WebSocket clients
	// For now, just log it
	t.logger.WithFields(logrus.Fields{
		"method": method,
		"params": params,
	}).Debug("Sending MCP notification")
	
	// TODO: Implement actual WebSocket broadcast to connected clients
	// notification := map[string]interface{}{
	//     "jsonrpc": "2.0",
	//     "method":  method,
	//     "params":  params,
	// }
}