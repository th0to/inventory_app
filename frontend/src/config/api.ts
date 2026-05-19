const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const defaultApiBaseUrl = '/api'
const selectedApiBaseUrl =
  configuredApiBaseUrl && configuredApiBaseUrl.length > 0
    ? configuredApiBaseUrl
    : defaultApiBaseUrl
const normalizedApiBaseUrl = selectedApiBaseUrl.replace(/\/+$/, '')

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedApiBaseUrl}${normalizedPath}`
}
