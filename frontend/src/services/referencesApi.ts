import { createAuthHeaders } from './apiAuth'

export interface NamedReference {
  id: number
  name: string
}

interface OwnerReference {
  id: number
  username: string
}

function normalizeResponseError(response: Response, genericMessage: string): Error | null {
  if (response.status === 404) {
    return null
  }

  if (response.status === 401 || response.status === 403) {
    return new Error('Votre session a expiré. Veuillez vous reconnecter.')
  }

  if (response.status >= 500) {
    return new Error('Le serveur est indisponible pour les référentiels.')
  }

  return new Error(genericMessage)
}

async function fetchReferencesPayload<T>(
  token: string,
  endpoints: string[],
  genericMessage: string,
): Promise<T> {
  for (const endpoint of endpoints) {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: createAuthHeaders(token),
    })

    if (response.ok) {
      return (await response.json()) as T
    }

    const normalizedError = normalizeResponseError(response, genericMessage)
    if (normalizedError) {
      throw normalizedError
    }
  }

  throw new Error(genericMessage)
}

export async function fetchCategories(token: string): Promise<NamedReference[]> {
  return fetchReferencesPayload<NamedReference[]>(
    token,
    ['/api/ref/categories', '/api/references/categories'],
    'Impossible de charger la liste des catégories.',
  )
}

export async function fetchEntities(token: string): Promise<NamedReference[]> {
  return fetchReferencesPayload<NamedReference[]>(
    token,
    ['/api/ref/entities', '/api/references/entities'],
    'Impossible de charger la liste des entités.',
  )
}

export async function fetchLocations(token: string): Promise<NamedReference[]> {
  return fetchReferencesPayload<NamedReference[]>(
    token,
    ['/api/ref/locations', '/api/references/locations'],
    'Impossible de charger la liste des lieux.',
  )
}

export async function fetchOwners(token: string): Promise<NamedReference[]> {
  const owners = await fetchReferencesPayload<OwnerReference[]>(
    token,
    ['/api/ref/owners', '/api/references/owners'],
    'Impossible de charger la liste des propriétaires.',
  )

  return owners.map((owner) => ({ id: owner.id, name: owner.username }))
}
