// Couleurs des badges de lieu et d'entité, partagées entre le tableau d'inventaire
// (DeviceTable) et les cartes du Dashboard pour éviter toute duplication.

export function getLocationBadgeColors(location: string): string {
  const norm = location.toLowerCase()
  if (norm.includes('stock')) return 'bg-green-100 text-green-800'
  if (norm.includes('client')) return 'bg-blue-100 text-blue-800'
  if (norm.includes('showroom')) return 'bg-purple-100 text-purple-800'
  if (norm.includes('test')) return 'bg-yellow-100 text-yellow-800'
  return 'bg-gray-100 text-gray-800' // Default type 5ème / Smart locker
}

export function getEntityBadgeColors(entity: string): string {
  const norm = entity.toLowerCase()
  if (norm.includes('gva')) return 'bg-[#0096D6]/10 text-[#0096D6]'
  if (norm.includes('zurich')) return 'bg-orange-100 text-orange-800'
  if (norm.includes('cds')) return 'bg-red-100 text-red-800'
  if (norm.includes('fix')) return 'bg-purple-100 text-purple-800'
  return 'bg-gray-100 text-gray-800'
}
