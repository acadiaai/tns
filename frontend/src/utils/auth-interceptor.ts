import { auth } from '../services/firebase';

/**
 * Adds Firebase authentication token to fetch requests
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const user = auth?.currentUser;

  if (user) {
    try {
      const token = await user.getIdToken();
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      };
    } catch (error) {
      console.error('Failed to get auth token:', error);
    }
  }

  return fetch(url, options);
}