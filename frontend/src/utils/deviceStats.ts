import type { Device } from '../services/devicesApi'

export interface Bucket {
  label: string
  count: number
}

/**
 * Compte les appareils regroupés par une clé textuelle, triés du plus grand au
 * plus petit. Les valeurs vides/null tombent dans `emptyLabel`.
 */
export function countByKey(
  devices: Device[],
  keyFn: (device: Device) => string | null | undefined,
  emptyLabel = 'Non renseigné',
): Bucket[] {
  const map = new Map<string, number>()
  for (const device of devices) {
    const raw = keyFn(device)
    const label = raw && String(raw).trim() !== '' ? String(raw).trim() : emptyLabel
    map.set(label, (map.get(label) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

/** Un appareil est « disponible » s'il est en stock (et non archivé). */
export function isAvailable(device: Device): boolean {
  return !device.is_archived && device.location.toLowerCase().includes('stock')
}

export interface Availability {
  total: number
  available: number
  immobilized: number
  archived: number
  availablePct: number
}

/** Synthèse de disponibilité du parc : disponible / immobilisé / archivé. */
export function computeAvailability(devices: Device[]): Availability {
  const total = devices.length
  const archived = devices.filter((d) => d.is_archived).length
  const available = devices.filter((d) => isAvailable(d)).length
  const immobilized = total - archived - available
  const availablePct = total === 0 ? 0 : Math.round((available / total) * 100)
  return { total, available, immobilized, archived, availablePct }
}
