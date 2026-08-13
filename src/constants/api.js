// API Base URL - you'll need to replace this with your actual hosted API URL
// For development, you can use your local IP (e.g., http://192.168.1.108:8081)
export const API_BASE_URL = "http://192.168.16.108:5000"
// export const API_BASE_URL = "https://growmax-backend.onrender.com"
// "https://your-api-domain.com";

// Helper function to get full API URL
export const getApiUrl = (path) => {
  return `${API_BASE_URL}${path}`;
};

const inFlightRequests = new Map();

const getRequestKey = (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  const method = init?.method || "GET";
  const body = init?.body ? String(init.body) : "";
  return `${method}:${url}:${body}`;
};

export const safeFetch = async (input, init) => {
  const key = getRequestKey(input, init);

  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key).then((res) => res.clone());
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  const promise = fetch(input, {
    ...init,
    signal: init?.signal || controller.signal,
  })
    .then((response) => {
      const clone = response.clone();
      clearTimeout(timeoutId);
      return clone;
    })
    .finally(() => {
      clearTimeout(timeoutId);
      setTimeout(() => inFlightRequests.delete(key), 100);
    });

  inFlightRequests.set(key, promise);

  return promise;
};
