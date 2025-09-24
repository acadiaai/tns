// API Configuration - Use relative paths when served from backend, localhost for dev server
const isDevServer = window.location.port === '5173';
export const API_BASE_URL = isDevServer ? 'http://localhost:8083' : '';

// WebSocket URL (convert http to ws, https to wss)
export const WS_BASE_URL = API_BASE_URL
  .replace('https://', 'wss://')
  .replace('http://', 'ws://');

// Helper to construct API URLs
export const apiUrl = (path: string) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

// Helper to construct WebSocket URLs
export const wsUrl = (path: string) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${WS_BASE_URL}${cleanPath}`;
};