export function createAuthHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
  }
}

export function createJsonAuthHeaders(token: string): HeadersInit {
  return {
    ...createAuthHeaders(token),
    'Content-Type': 'application/json',
  }
}
