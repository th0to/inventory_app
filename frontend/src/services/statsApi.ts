import { createAuthHeaders } from './apiAuth'
import { buildApiUrl, apiFetch } from '../config/api'

export interface StatCount {
  id: number
  name: string
  count: number
}

export interface StatBucket {
  label: string
  count: number
}

export interface StatsSummary {
  total_devices: number
  active_devices: number
  archived_devices: number
  by_category: StatCount[]
  by_location: StatCount[]
  by_entity: StatCount[]
  by_owner: StatCount[]
  by_generation: StatBucket[]
}

export async function fetchStatsSummary(token: string): Promise<StatsSummary> {
  const response = await apiFetch(buildApiUrl('/stats/summary'), {
    method: 'GET',
    headers: createAuthHeaders(token),
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Votre session a expiré. Veuillez vous reconnecter.')
    }

    if (response.status >= 500) {
      throw new Error('Le serveur est indisponible pour les statistiques.')
    }

    throw new Error('Impossible de charger les statistiques du dashboard.')
  }

  return (await response.json()) as StatsSummary
}
