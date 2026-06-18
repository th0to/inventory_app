import { createAuthHeaders, createJsonAuthHeaders } from './apiAuth'
import { buildApiUrl, apiFetch } from '../config/api'

export type UserRole = 'visitor' | 'user' | 'admin'

export interface User {
  id: number
  username: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface UserCreatePayload {
  username: string
  email: string
  password: string
  role?: UserRole
}

export interface UserUpdatePayload {
  username?: string
  email?: string
  password?: string
  role?: UserRole
  is_active?: boolean
}

function messageForStatus(status: number, fallback: string): string {
  if (status === 401 || status === 403) {
    return 'Vous n’avez pas les droits pour gérer les comptes utilisateurs.'
  }
  if (status === 409) {
    return 'Ce nom d’utilisateur ou cet email est déjà utilisé.'
  }
  if (status === 400) {
    return 'Opération refusée (ex. action sur votre propre compte).'
  }
  if (status >= 500) {
    return 'Le serveur est indisponible pour la gestion des comptes.'
  }
  return fallback
}

export async function fetchUsers(token: string): Promise<User[]> {
  const response = await apiFetch(buildApiUrl('/users'), {
    method: 'GET',
    headers: createAuthHeaders(token),
  })
  if (!response.ok) {
    throw new Error(messageForStatus(response.status, 'Impossible de charger les utilisateurs.'))
  }
  return (await response.json()) as User[]
}

export async function createUser(token: string, payload: UserCreatePayload): Promise<User> {
  const response = await apiFetch(buildApiUrl('/users'), {
    method: 'POST',
    headers: createJsonAuthHeaders(token),
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(messageForStatus(response.status, 'Impossible de créer le compte.'))
  }
  return (await response.json()) as User
}

export async function updateUser(
  token: string,
  id: number,
  payload: UserUpdatePayload,
): Promise<User> {
  const response = await apiFetch(buildApiUrl(`/users/${id}`), {
    method: 'PUT',
    headers: createJsonAuthHeaders(token),
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw new Error(messageForStatus(response.status, 'Impossible de modifier le compte.'))
  }
  return (await response.json()) as User
}

export async function deleteUser(token: string, id: number): Promise<void> {
  const response = await apiFetch(buildApiUrl(`/users/${id}`), {
    method: 'DELETE',
    headers: createAuthHeaders(token),
  })
  if (!response.ok) {
    throw new Error(messageForStatus(response.status, 'Impossible de désactiver le compte.'))
  }
}
