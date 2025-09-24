package api

import (
	"net/http"
	"therapy-navigation-system/internal/mcp"

	"github.com/sirupsen/logrus"
)

var (
	mcpServer    *mcp.MCPServer
	mcpTransport *mcp.MCPTransport
)

// InitializeMCPServer initializes the MCP server
func InitializeMCPServer(logger *logrus.Logger, broadcast func(event interface{})) error {
	logger.Info("🔧 STARTING MCP SERVER INITIALIZATION")

	// Create MCP server
	logger.Info("🔧 Creating NewMCPServer...")
	mcpServer = mcp.NewMCPServer(logger, broadcast)
	logger.Info("✅ MCP server created successfully")
	
	// Create MCP transport
	logger.Info("🔧 Creating MCP transport...")
	mcpTransport = mcp.NewMCPTransport(mcpServer, logger)
	logger.Info("✅ MCP transport created successfully")
	
	logger.Info("🎉 MCP server initialized successfully")
	return nil
}

// MCPHTTPHandler handles MCP requests over HTTP
func MCPHTTPHandler(w http.ResponseWriter, r *http.Request) {
	if mcpTransport == nil {
		http.Error(w, "MCP server not initialized", http.StatusServiceUnavailable)
		return
	}
	
	// Set CORS headers for MCP
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	
	mcpTransport.ServeHTTP(w, r)
}

// MCPWebSocketHandler handles MCP requests over WebSocket
func MCPWebSocketHandler(w http.ResponseWriter, r *http.Request) {
	if mcpTransport == nil {
		http.Error(w, "MCP server not initialized", http.StatusServiceUnavailable)
		return
	}
	
	mcpTransport.HandleWebSocket(w, r)
}

// GetMCPServer returns the MCP server instance
func GetMCPServer() *mcp.MCPServer {
	return mcpServer
}