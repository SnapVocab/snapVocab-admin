/** Empty base URL uses the current origin (dev proxy or production reverse proxy). */
export const apiBaseUrl = import.meta.env?.VITE_API_BASE_URL?.trim() ?? '';

/** API endpoints already include /api; baseUrl is the backend origin or a gateway prefix. */
export function buildApiUrl(endpoint: string, baseUrl: string = apiBaseUrl): string {
  return `${baseUrl.trim().replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
}
