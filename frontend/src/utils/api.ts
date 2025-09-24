/**
 * API utility for making HTTP requests
 * Uses relative paths so it works with both local dev proxy and production
 */

export const API_BASE_URL = ''; // Empty string means relative to current origin

export async function apiRequest(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  const response = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await apiRequest(path);
  return response.json();
}

export async function apiPost<T>(path: string, data: unknown): Promise<T> {
  const response = await apiRequest(path, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}