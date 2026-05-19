import { createAuthHeaders } from './apiAuth'
import { buildApiUrl } from '../config/api'

export interface NamedReference {
  id: number
  name: string
}

interface OwnerReference {
  id: number
  username: string
}

function createResponseError(response: Response, genericMessage: string): Error | null {
  if (response.status === 404) {
    // Fallback intentionally supports both legacy `/api/ref/*` and current `/api/references/*`.
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

    const normalizedError = createResponseError(response, genericMessage)
    if (normalizedError) {
      throw normalizedError
    }
  }

  throw new Error(genericMessage)
}

export async function fetchCategories(token: string): Promise<NamedReference[]> {
  return fetchReferencesPayload<NamedReference[]>(
    token,
    [buildApiUrl('/ref/categories'), buildApiUrl('/references/categories')],
    'Impossible de charger la liste des catégories.',
  )
}

export async function fetchEntities(token: string): Promise<NamedReference[]> {
  return fetchReferencesPayload<NamedReference[]>(
    token,
    [buildApiUrl('/ref/entities'), buildApiUrl('/references/entities')],
    'Impossible de charger la liste des entités.',
  )
}

export async function fetchLocations(token: string): Promise<NamedReference[]> {
  return fetchReferencesPayload<NamedReference[]>(
    token,
    [buildApiUrl('/ref/locations'), buildApiUrl('/references/locations')],
    'Impossible de charger la liste des lieux.',
  )
}

export async function fetchOwners(token: string): Promise<NamedReference[]> {
  const owners = await fetchReferencesPayload<OwnerReference[]>(
    token,
    [buildApiUrl('/ref/owners'), buildApiUrl('/references/owners')],
    'Impossible de charger la liste des propriétaires.',
  )

  return owners.map((owner) => ({ id: owner.id, name: owner.username }))
}
