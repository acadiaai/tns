package mcp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"time"
)

// MCPClient is a JSON-RPC 2.0 client for MCP over HTTP
// This is used by the WebSocket handler to execute tool calls from Gemini
type MCPClient struct {
	baseURL    string
	httpClient *http.Client
}

func NewMCPClientFromEnv() *MCPClient {
	base := os.Getenv("MCP_URL")
	if base == "" {
		// Use PORT environment variable if set (Cloud Run sets this)
		port := os.Getenv("PORT")
		if port == "" {
			port = "8083" // Default for local development
		}
		base = fmt.Sprintf("http://localhost:%s/api/mcp", port)
	}
	return &MCPClient{
		baseURL:    base,
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}
}

type jsonrpcRequest struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      string      `json:"id"`
	Method  string      `json:"method"`
	Params  interface{} `json:"params,omitempty"`
}

type jsonrpcResponse struct {
	JSONRPC string           `json:"jsonrpc"`
	ID      string           `json:"id"`
	Result  *json.RawMessage `json:"result,omitempty"`
	Error   *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (c *MCPClient) call(ctx context.Context, method string, params interface{}) (*json.RawMessage, error) {
	reqBody := jsonrpcRequest{
		JSONRPC: "2.0",
		ID:      fmt.Sprintf("%d", time.Now().UnixNano()),
		Method:  method,
		Params:  params,
	}

	data, _ := json.Marshal(reqBody)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL, bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var jr jsonrpcResponse
	if err := json.NewDecoder(resp.Body).Decode(&jr); err != nil {
		return nil, err
	}

	if jr.Error != nil {
		return nil, fmt.Errorf("jsonrpc error %d: %s", jr.Error.Code, jr.Error.Message)
	}

	return jr.Result, nil
}

func (c *MCPClient) Initialize(ctx context.Context) error {
	_, err := c.call(ctx, "initialize", map[string]interface{}{
		"protocolVersion": "2025-06-18",
		"capabilities":    map[string]interface{}{},
		"clientInfo":      map[string]string{"name": "therapy-nav", "version": "1.0"},
	})
	return err
}

func (c *MCPClient) ToolsList(ctx context.Context) (*json.RawMessage, error) {
	return c.call(ctx, "tools/list", nil)
}

func (c *MCPClient) ToolsCall(ctx context.Context, name string, arguments json.RawMessage) (interface{}, error) {
	result, err := c.call(ctx, "tools/call", map[string]interface{}{
		"name":      name,
		"arguments": arguments,
	})
	if err != nil {
		return nil, err
	}

	// Parse the result to extract the actual tool response
	if result != nil {
		var response map[string]interface{}
		if err := json.Unmarshal(*result, &response); err == nil {
			if data, ok := response["data"]; ok {
				return data, nil
			}
			return response, nil
		}
	}

	return result, nil
}