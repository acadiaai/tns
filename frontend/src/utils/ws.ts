/**
 * Compute a WebSocket URL for a given API path
 * Uses relative paths for production, localhost for development
 */
export function getWebSocketUrl(path: string): string {
  const { protocol, hostname, port } = window.location;

  // Determine WebSocket protocol
  const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';

  // Normalize path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  // In development (port 5173), connect to backend on port 8083
  // In production, connect to same host
  const targetPort = port === '5173' ? '8083' : port;
  const wsUrl = `${wsProto}//${hostname}:${targetPort}${normalizedPath}`;

  console.log('WebSocket URL:', wsUrl);
  return wsUrl;
}