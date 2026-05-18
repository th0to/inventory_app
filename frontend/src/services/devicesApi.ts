import { createAuthHeaders, createJsonAuthHeaders } from './apiAuth'

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
}

export async function fetchDevices(token: string): Promise<Device[]> {
  const response = await fetch('/api/devices', {
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
  const response = await fetch('/api/devices', {
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
