import { OpenAPI } from './generated';

// Initialize API client with Firebase token
export const initializeApiClient = (token: string | null) => {
  if (token) {
    // Set the token as a Bearer token
    OpenAPI.TOKEN = token;
    OpenAPI.HEADERS = {
      'Authorization': `Bearer ${token}`
    };
  } else {
    // Clear token if null
    OpenAPI.TOKEN = undefined;
    OpenAPI.HEADERS = undefined;
  }
};

// Update the base URL if needed (e.g., for production)
export const setApiBaseUrl = (url: string) => {
  OpenAPI.BASE = url;
};

// Get current API configuration
export const getApiConfig = () => ({
  base: OpenAPI.BASE,
  hasToken: !!OpenAPI.TOKEN
});