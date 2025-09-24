/**
 * Compute a WebSocket URL for a given API path, honoring VITE_API_URL when set,
 * and defaulting to localhost backend dev port 8083 when running via Vite.
 */
export function getWebSocketUrl(path: string): string {
  // If VITE_API_URL is set, derive ws/wss from it
  const apiUrl = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
  if (apiUrl) {
    try {
      const base = new URL(apiUrl);
      // Convert http/https to ws/wss
      base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
      // Ensure we join path correctly
      base.pathname = path.startsWith('/') ? path : `/${path}`;
      return base.toString();
    } catch {
      // fall through to local heuristic
    }
  }

  // Local dev heuristic: if front-end is on 5173, backend is on 8083
  const { protocol, hostname, port } = window.location;
  const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
  const defaultBackendPort = port === '5173' || port === '3000' ? '8083' : port || '8083';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${wsProto}//${hostname}:${defaultBackendPort}${normalizedPath}`;
}



