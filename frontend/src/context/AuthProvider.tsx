import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue, type JwtPayload } from './authContext'

const TOKEN_STORAGE_KEY = 'inventory_app_token'

function decodeJwtPayload(token: string): JwtPayload {
  const tokenParts = token.split('.')

  if (tokenParts.length < 2) {
    throw new Error('Token JWT invalide')
  }

  const base64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')
  const paddedBase64 = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const jsonPayload = atob(paddedBase64)

  return JSON.parse(jsonPayload) as JwtPayload
}

function readStoredToken(): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

function clearStoredToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredToken())

  const payload = useMemo(() => {
    if (!token) {
      return null
    }

    try {
      return decodeJwtPayload(token)
    } catch {
      return null
    }
  }, [token])

  const isAuthenticated = Boolean(token && payload)

  const login = useCallback((nextToken: string) => {
    decodeJwtPayload(nextToken)

    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_STORAGE_KEY, nextToken)
    }

    setToken(nextToken)
  }, [])

  const logout = useCallback(() => {
    clearStoredToken()
    setToken(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      role: isAuthenticated ? (payload?.role ?? null) : null,
      username: isAuthenticated ? (payload?.username ?? payload?.sub ?? null) : null,
      isAuthenticated,
      login,
      logout,
    }),
    [isAuthenticated, login, logout, payload?.role, payload?.sub, payload?.username, token],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
