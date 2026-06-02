import { useState } from 'react'
import type { Device } from '../services/devicesApi'
import { Pencil, Trash2, Package } from 'lucide-react'

interface DeviceTableProps {
  devices: Device[]
  isAdmin: boolean
}

const ITEMS_PER_PAGE = 10;

function getLocationBadgeColors(location: string): string {
  const norm = location.toLowerCase();
  if (norm.includes('stock')) return 'bg-green-100 text-green-800'
  if (norm.includes('client')) return 'bg-blue-100 text-blue-800'
  if (norm.includes('showroom')) return 'bg-purple-100 text-purple-800'
  if (norm.includes('test')) return 'bg-yellow-100 text-yellow-800'
  return 'bg-gray-100 text-gray-800' // Default type 5ème / Smart locker
}

function getEntityBadgeColors(entity: string): string {
  const norm = entity.toLowerCase();
  if (norm.includes('gva')) return 'bg-[#0096D6]/10 text-[#0096D6]'
  if (norm.includes('zurich')) return 'bg-orange-100 text-orange-800'
  if (norm.includes('cds')) return 'bg-red-100 text-red-800'
  if (norm.includes('fix')) return 'bg-purple-100 text-purple-800'
  return 'bg-gray-100 text-gray-800'
}

export default function DeviceTable({ devices, isAdmin }: DeviceTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(devices.length / ITEMS_PER_PAGE);

  const displayedDevices = devices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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
              {isAdmin ? <th className="px-6 py-4 font-semibold text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="text-sm text-[#555555]">
            {devices.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Package size={48} className="my-4 text-[#E0E0E0]" />
                    <p className="font-semibold text-lg text-[#1A1A1A]">Aucun appareil trouvé</p>
                    <p className="text-sm text-[#555555]">Ajustez vos filtres pour voir des résultats.</p>
                  </div>
                </td>
              </tr>
            ) : (
              displayedDevices.map((device) => (
                <tr key={device.id} className="hover:bg-[#F4F4F4] transition-colors border-b border-[#E0E0E0] last:border-0">
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
                  {isAdmin ? (
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="p-2 text-[#0096D6] hover:bg-blue-50 rounded transition-colors"
                          title="Modifier"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          type="button"
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
      
      {totalPages > 1 && (
        <div className="px-6 py-4 flex items-center justify-end border-t border-[#E0E0E0] bg-white">
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-[#E0E0E0] rounded text-sm text-[#555555] font-medium hover:bg-[#F4F4F4] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <span className="px-4 py-2 text-sm text-[#1A1A1A] font-medium self-center">
              {currentPage} / {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-[#E0E0E0] rounded text-sm text-[#555555] font-medium hover:bg-[#F4F4F4] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
