import { createContext } from 'react'

type UserRole = string | null

export interface JwtPayload {
  sub?: string
  username?: string
  role?: string
  exp?: number
}

export interface AuthContextValue {
  token: string | null
  role: UserRole
  username: string | null
  isAuthenticated: boolean
  login: (token: string) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
