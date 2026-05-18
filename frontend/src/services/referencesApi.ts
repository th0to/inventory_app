import { createAuthHeaders } from './apiAuth'

export interface NamedReference {
  id: number
  name: string
}

async function fetchNamedReferences(token: string, endpoint: string): Promise<NamedReference[]> {
  const response = await fetch(endpoint, {
    method: 'GET',
    headers: createAuthHeaders(token),
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Votre session a expiré. Veuillez vous reconnecter.')
    }

    if (response.status >= 500) {
      throw new Error('Le serveur est indisponible pour les référentiels.')
    }

    throw new Error('Impossible de charger les listes de filtres.')
  }

  return (await response.json()) as NamedReference[]
}

export async function fetchCategories(token: string): Promise<NamedReference[]> {
  return fetchNamedReferences(token, '/api/references/categories')
}

export async function fetchEntities(token: string): Promise<NamedReference[]> {
  return fetchNamedReferences(token, '/api/references/entities')
}

export async function fetchLocations(token: string): Promise<NamedReference[]> {
  return fetchNamedReferences(token, '/api/references/locations')
}
