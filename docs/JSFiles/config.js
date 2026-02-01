// URL base do backend
const API_URL = "https://hackeando-seu-treino.onrender.com";

// Fetch wrapper que inclui credentials para cookies cross-origin
function apiFetch(endpoint, options = {}) {
  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
}

window.API_URL = API_URL;
window.apiFetch = apiFetch;
