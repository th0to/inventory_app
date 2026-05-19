const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

const normalizedApiBaseUrl = (configuredApiBaseUrl && configuredApiBaseUrl.length > 0 ? configuredApiBaseUrl : '/api').replace(/\/+$/, '')

export function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedApiBaseUrl}${normalizedPath}`
}

