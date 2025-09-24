/**
 * Compute a WebSocket URL for a given API path, honoring VITE_API_URL when set,
 * and defaulting to localhost backend dev port 8083 when running via Vite.
 */
export function getWebSocketUrl(path: string): string {
  // If VITE_API_URL is set, derive ws/wss from it
  const apiUrl = import.meta.env.VITE_API_URL;

  // Add logging to debug the issue
  console.log('WebSocket URL generation:', {
    apiUrl,
    path,
    metaEnv: import.meta.env
  });

  if (apiUrl) {
    try {
      const base = new URL(apiUrl);
      // Convert http/https to ws/wss
      base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
      // Ensure we join path correctly
      base.pathname = path.startsWith('/') ? path : `/${path}`;
      const wsUrl = base.toString();
      console.log('Generated WebSocket URL:', wsUrl);
      return wsUrl;
    } catch (error) {
      console.error('Failed to parse VITE_API_URL:', error);
      // fall through to local heuristic
    }
  }

  // For production, if VITE_API_URL isn't available, use a hardcoded backend URL
  // This is a fallback for when environment variables aren't properly built in
  if (window.location.hostname === 'tns-acadia-sh.web.app' ||
      window.location.hostname === 'tns-acadia-sh.firebaseapp.com') {
    const wsUrl = `wss://tns-backend-385615458061.us-central1.run.app${path.startsWith('/') ? path : `/${path}`}`;
    console.log('Using hardcoded production WebSocket URL:', wsUrl);
    return wsUrl;
  }

  // Local dev heuristic: if front-end is on 5173, backend is on 8083
  const { protocol, hostname, port } = window.location;
  const wsProto = protocol === 'https:' ? 'wss:' : 'ws:';
  const defaultBackendPort = port === '5173' || port === '3000' ? '8083' : port || '8083';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const wsUrl = `${wsProto}//${hostname}:${defaultBackendPort}${normalizedPath}`;
  console.log('Using local dev WebSocket URL:', wsUrl);
  return wsUrl;
}



