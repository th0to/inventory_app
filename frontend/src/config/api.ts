export function normalizeApiBaseUrl(apiBaseUrl?: string): string {
  const defaultApiBaseUrl = '/api'
  const configuredApiBaseUrl = apiBaseUrl?.trim()
  const selectedApiBaseUrl =
    configuredApiBaseUrl && configuredApiBaseUrl.length > 0
      ? configuredApiBaseUrl
      : defaultApiBaseUrl

  return selectedApiBaseUrl.replace(/\/+$/, '')
}

const normalizedApiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedApiBaseUrl}${normalizedPath}`
}

let onUnauthorizedCallback: (() => void) | null = null;
export function setUnauthorizedCallback(callback: () => void) {
  onUnauthorizedCallback = callback;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 401) {
    if (onUnauthorizedCallback) {
      onUnauthorizedCallback();
    }
  }
  return response;
}
