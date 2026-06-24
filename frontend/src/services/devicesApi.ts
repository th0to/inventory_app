import { createAuthHeaders, createJsonAuthHeaders } from './apiAuth'
import { buildApiUrl, apiFetch } from '../config/api'

export interface Device {
  id: number
  serial_number: string
  model_name: string
  generation: string | null
  category_id: number
  category: string
  entity_id: number
  entity: string
  order_number: string | null
  location_id: number
  location: string
  owner_id: number
  owner: string
  client_id: number | null
  client: string | null
  is_pv: boolean
  cpu: string | null
  ram_gb: number | null
  storage_gb: number | null
  screen_size: string | null
  power_w: number | null
  comment: string | null
  is_archived: boolean
  created_by: number
  updated_by: number | null
  created_at: string
  updated_at: string
}

export interface DeviceCreatePayload {
  serial_number: string
  model_name: string
  category_id: number
  entity_id: number
  location_id: number
  owner_id: number
  order_number?: string | null
  generation?: string | null
  client?: string | null
  is_pv?: boolean
  cpu?: string | null
  ram_gb?: number | null
  storage_gb?: number | null
  screen_size?: string | null
  power_w?: number | null
  comment?: string | null
}

export async function fetchDevices(token: string): Promise<Device[]> {
  const response = await apiFetch(buildApiUrl('/devices'), {
    method: 'GET',
    headers: createAuthHeaders(token),
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Votre session a expiré. Veuillez vous reconnecter.')
    }

    if (response.status >= 500) {
      throw new Error('Le serveur est indisponible pour les appareils.')
    }

    throw new Error('Impossible de charger la liste des appareils.')
  }

  return (await response.json()) as Device[]
}

export async function createDevice(token: string, payload: DeviceCreatePayload): Promise<Device> {
  const response = await apiFetch(buildApiUrl('/devices'), {
    method: 'POST',
    headers: createJsonAuthHeaders(token),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    if (response.status === 400) {
      throw new Error('Les données du formulaire sont invalides.')
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error('Vous n’avez pas les droits pour ajouter un appareil.')
    }

    if (response.status >= 500) {
      throw new Error('Le serveur est indisponible pour la création d’appareil.')
    }

    throw new Error('Impossible d’ajouter l’appareil.')
  }

  return (await response.json()) as Device
}

export async function updateDevice(
  token: string,
  id: number,
  payload: DeviceCreatePayload,
): Promise<Device> {
  const response = await apiFetch(buildApiUrl(`/devices/${id}`), {
    method: 'PUT',
    headers: createJsonAuthHeaders(token),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    if (response.status === 400) {
      // Le backend renvoie aussi 400 « Aucun changement détecté » si rien n'a bougé.
      const detail = await response.json().then((d) => d?.detail).catch(() => null)
      throw new Error(typeof detail === 'string' ? detail : 'Les données du formulaire sont invalides.')
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error('Vous n’avez pas les droits pour modifier un appareil.')
    }
    if (response.status === 404) {
      throw new Error('Appareil introuvable.')
    }
    if (response.status >= 500) {
      throw new Error('Le serveur est indisponible pour la modification d’appareil.')
    }
    throw new Error('Impossible de modifier l’appareil.')
  }

  return (await response.json()) as Device
}

export async function deleteDevice(token: string, id: number): Promise<void> {
  const response = await apiFetch(buildApiUrl(`/devices/${id}`), {
    method: 'DELETE',
    headers: createAuthHeaders(token),
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Vous n’avez pas les droits pour supprimer un appareil.')
    }
    if (response.status === 404) {
      throw new Error('Appareil introuvable.')
    }
    if (response.status >= 500) {
      throw new Error('Le serveur est indisponible pour la suppression d’appareil.')
    }
    throw new Error('Impossible de supprimer l’appareil.')
  }
}
