const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api' : 'https://portfolioserverpy.onrender.com');

export function apiFetch(path, options) {
  return fetch(`${apiBaseUrl.replace(/\/$/, '')}${path}`, options);
}
