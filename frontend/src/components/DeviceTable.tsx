import { useState } from 'react'
import type { Device } from '../services/devicesApi'
import { Pencil, Trash2, Package } from 'lucide-react'
import { getEntityBadgeColors, getLocationBadgeColors } from '../utils/badgeColors'

interface DeviceTableProps {
  devices: Device[]
  isAdmin: boolean
  // Nom de la catégorie filtrée (null si « Toutes ») : déclenche les colonnes dynamiques.
  activeCategoryName?: string | null
  onRowClick?: (device: Device) => void
  onEdit?: (device: Device) => void
  onDelete?: (device: Device) => void
}

// Options du sélecteur de pagination. `null` = « Tout afficher ».
const PAGE_SIZE_OPTIONS: { label: string; value: number | null }[] = [
  { label: '10', value: 10 },
  { label: '20', value: 20 },
  { label: '50', value: 50 },
  { label: 'Tout', value: null },
]

interface ColumnDef {
  key: string
  label: string
  render: (device: Device) => React.ReactNode
}

function renderValue(value: string | number | null): React.ReactNode {
  if (value === null || value === undefined || value === '') return '—'
  return value
}

// Colonnes supplémentaires affichées quand une seule catégorie est filtrée.
const SPEC_COLUMNS: ColumnDef[] = [
  { key: 'cpu', label: 'Processeur', render: (d) => renderValue(d.cpu) },
  { key: 'ram_gb', label: 'RAM (GB)', render: (d) => renderValue(d.ram_gb) },
  { key: 'storage_gb', label: 'Stockage (GB)', render: (d) => renderValue(d.storage_gb) },
]
const SCREEN_COLUMN: ColumnDef[] = [
  { key: 'screen_size', label: 'Taille (pouces)', render: (d) => renderValue(d.screen_size) },
]
const POWER_COLUMN: ColumnDef[] = [
  { key: 'power_w', label: 'Puissance (W)', render: (d) => renderValue(d.power_w) },
]

const CATEGORY_COLUMNS: Record<string, ColumnDef[]> = {
  laptop: SPEC_COLUMNS,
  desktop: SPEC_COLUMNS,
  'mobile workstation': SPEC_COLUMNS,
  workstation: SPEC_COLUMNS,
  display: SCREEN_COLUMN,
  docking: POWER_COLUMN,
}

function extraColumnsFor(categoryName?: string | null): ColumnDef[] {
  if (!categoryName) return []
  return CATEGORY_COLUMNS[categoryName.trim().toLowerCase()] ?? []
}

export default function DeviceTable({ devices, isAdmin, activeCategoryName, onRowClick, onEdit, onDelete }: DeviceTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number | null>(10)

  const extraColumns = extraColumnsFor(activeCategoryName)
  const totalPages = pageSize === null ? 1 : Math.max(1, Math.ceil(devices.length / pageSize))

  // Garde-fou : si le filtrage réduit le nombre de pages sous la page courante,
  // on borne la page affichée pendant le rendu (évite un tableau vide) sans
  // stocker de valeur hors limites dans le state.
  const safePage = Math.min(currentPage, totalPages)

  const displayedDevices =
    pageSize === null
      ? devices
      : devices.slice((safePage - 1) * pageSize, safePage * pageSize)

  const baseColCount = isAdmin ? 8 : 7
  const totalColCount = baseColCount + extraColumns.length

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F4F4F4] text-[#1A1A1A] font-semibold text-sm border-b border-[#E0E0E0]">
              <th className="px-6 py-4 font-semibold">ID</th>
              <th className="px-6 py-4 font-semibold">Numéro de série</th>
              <th className="px-6 py-4 font-semibold">Modèle</th>
              <th className="px-6 py-4 font-semibold">Catégorie</th>
              <th className="px-6 py-4 font-semibold">Entité</th>
              <th className="px-6 py-4 font-semibold">Lieu</th>
              <th className="px-6 py-4 font-semibold">Propriétaire</th>
              {extraColumns.map((col) => (
                <th key={col.key} className="px-6 py-4 font-semibold">{col.label}</th>
              ))}
              {isAdmin ? <th className="px-6 py-4 font-semibold text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="text-sm text-[#555555]">
            {devices.length === 0 ? (
              <tr>
                <td colSpan={totalColCount} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Package size={48} className="my-4 text-[#E0E0E0]" />
                    <p className="font-semibold text-lg text-[#1A1A1A]">Aucun appareil trouvé</p>
                    <p className="text-sm text-[#555555]">Ajustez vos filtres pour voir des résultats.</p>
                  </div>
                </td>
              </tr>
            ) : (
              displayedDevices.map((device) => (
                <tr
                  key={device.id}
                  onClick={() => onRowClick?.(device)}
                  className="hover:bg-[#F4F4F4] transition-colors border-b border-[#E0E0E0] last:border-0 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">{device.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-[#1A1A1A]">{device.serial_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{device.model_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{device.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getEntityBadgeColors(device.entity)}`}>
                      {device.entity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getLocationBadgeColors(device.location)}`}>
                      {device.location}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{device.owner}</td>
                  {extraColumns.map((col) => (
                    <td key={col.key} className="px-6 py-4 whitespace-nowrap">{col.render(device)}</td>
                  ))}
                  {isAdmin ? (
                    <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onEdit?.(device)}
                          className="p-2 text-[#0096D6] hover:bg-blue-50 rounded transition-colors"
                          title="Modifier"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete?.(device)}
                          className="p-2 text-[#CC0000] hover:bg-red-50 rounded transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {devices.length > 0 && (
        <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#E0E0E0] bg-white">
          <label className="flex items-center gap-2 text-sm text-[#555555] font-medium">
            <span>Afficher</span>
            <select
              value={pageSize === null ? 'all' : String(pageSize)}
              onChange={(e) => {
                const v = e.target.value
                setPageSize(v === 'all' ? null : Number(v))
                setCurrentPage(1)
              }}
              className="border border-[#E0E0E0] rounded p-1.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0096D6]"
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt.label} value={opt.value === null ? 'all' : String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span>par page</span>
          </label>

          {totalPages > 1 && (
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                disabled={safePage === 1}
                className="px-4 py-2 border border-[#E0E0E0] rounded text-sm text-[#555555] font-medium hover:bg-[#F4F4F4] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Précédent
              </button>
              <span className="px-4 py-2 text-sm text-[#1A1A1A] font-medium self-center">
                {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                disabled={safePage === totalPages}
                className="px-4 py-2 border border-[#E0E0E0] rounded text-sm text-[#555555] font-medium hover:bg-[#F4F4F4] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
