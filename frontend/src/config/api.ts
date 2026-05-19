function normalizeApiBaseUrl(apiBaseUrl?: string): string {
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
