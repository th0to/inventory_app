import { useCallback, useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import DeviceTable from '../components/DeviceTable'
import DeviceDetailDrawer from '../components/DeviceDetailDrawer'
import DeviceForm from '../components/DeviceForm'
import FilterBar, { type InventoryFilters } from '../components/FilterBar'
import AuthenticatedLayout from '../components/AuthenticatedLayout'
import { useAuth } from '../context/useAuth'
import {
  fetchDevices,
  updateDevice,
  deleteDevice,
  type Device,
  type DeviceCreatePayload,
} from '../services/devicesApi'
import {
  fetchCategories,
  fetchEntities,
  fetchLocations,
  fetchOwners,
  type NamedReference,
} from '../services/referencesApi'

const DEFAULT_FILTERS: InventoryFilters = {
  categoryId: '',
  entityId: '',
  locationId: '',
  searchString: '',
}

export default function InventoryPage() {
  const { token, role } = useAuth()
  const [devices, setDevices] = useState<Device[]>([])
  const [categories, setCategories] = useState<NamedReference[]>([])
  const [entities, setEntities] = useState<NamedReference[]>([])
  const [locations, setLocations] = useState<NamedReference[]>([])
  const [owners, setOwners] = useState<NamedReference[]>([])
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_FILTERS)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [editingDevice, setEditingDevice] = useState<Device | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const notify = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text })
    setTimeout(() => setNotice(null), 5000)
  }

  const reloadDevices = useCallback(async () => {
    if (!token) return
    setDevices(await fetchDevices(token))
  }, [token])

  useEffect(() => {
    let isCancelled = false

    const loadInventoryData = async () => {
      if (!token) {
        if (!isCancelled) setError('Session invalide. Veuillez vous reconnecter.')
        return
      }

      try {
        const [devicesData, categoriesData, entitiesData, locationsData, ownersData] = await Promise.all([
          fetchDevices(token),
          fetchCategories(token),
          fetchEntities(token),
          fetchLocations(token),
          fetchOwners(token),
        ])

        if (!isCancelled) {
          setDevices(devicesData)
          setCategories(categoriesData)
          setEntities(entitiesData)
          setLocations(locationsData)
          setOwners(ownersData)
          setError(null)
        }
      } catch (err) {
        if (!isCancelled) setError(err instanceof Error ? err.message : 'Impossible de charger les données d\'inventaire.')
      } finally {
        if (!isCancelled) setIsLoading(false)
      }
    }

    loadInventoryData()
    return () => { isCancelled = true }
  }, [token])

  // Fermeture de la modale d'édition à la touche Échap.
  useEffect(() => {
    if (!editingDevice) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEditingDevice(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editingDevice])

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      if (filters.categoryId && device.category_id !== Number(filters.categoryId)) return false
      if (filters.entityId && device.entity_id !== Number(filters.entityId)) return false
      if (filters.locationId && device.location_id !== Number(filters.locationId)) return false
      if (filters.searchString) {
        const s = filters.searchString.toLowerCase();
        const scm = `${device.serial_number} ${device.model_name}`.toLowerCase();
        if (!scm.includes(s)) return false;
      }
      return true
    })
  }, [devices, filters.categoryId, filters.entityId, filters.locationId, filters.searchString])

  const isAdmin = role === 'admin'

  const activeCategoryName = useMemo(() => {
    if (!filters.categoryId) return null
    return categories.find((c) => c.id === Number(filters.categoryId))?.name ?? null
  }, [filters.categoryId, categories])

  const handleEdit = (device: Device) => {
    setSelectedDevice(null)
    setEditError(null)
    setEditingDevice(device)
  }

  const handleUpdate = async (payload: DeviceCreatePayload) => {
    if (!token || !editingDevice) throw new Error('Session invalide.')
    setIsSaving(true)
    setEditError(null)
    try {
      await updateDevice(token, editingDevice.id, payload)
      await reloadDevices()
      notify('success', `Appareil « ${editingDevice.serial_number} » mis à jour.`)
      setEditingDevice(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Impossible de modifier l’appareil.')
      throw err // empêche DeviceForm de réinitialiser / considérer le submit réussi
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (device: Device) => {
    if (!token) return
    if (!window.confirm(
      `Supprimer définitivement l’appareil « ${device.model_name} » (${device.serial_number}) ?\nCette action est irréversible.`,
    )) {
      return
    }
    try {
      await deleteDevice(token, device.id)
      if (selectedDevice?.id === device.id) setSelectedDevice(null)
      await reloadDevices()
      notify('success', `Appareil « ${device.serial_number} » supprimé.`)
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Impossible de supprimer l’appareil.')
    }
  }

  return (
    <AuthenticatedLayout title="Inventaire">
      <section className="space-y-6">
        {isLoading ? <p className="text-[#555555] font-medium flex items-center justify-center p-12">Chargement de l&apos;inventaire…</p> : null}

        {!isLoading && error ? (
          <div className="bg-[#CC0000]/10 border border-[#CC0000] text-[#CC0000] px-4 py-3 rounded-md text-sm font-medium">
            {error}
          </div>
        ) : null}

        {!isLoading && !error ? (
          <>
            {notice ? (
              <div className={`px-4 py-3 rounded-md text-sm font-medium border ${
                notice.type === 'success'
                  ? 'bg-[#007A33]/10 border-[#007A33] text-[#007A33]'
                  : 'bg-[#CC0000]/10 border-[#CC0000] text-[#CC0000]'
              }`}>
                {notice.text}
              </div>
            ) : null}

            <FilterBar
              filters={filters}
              categories={categories}
              entities={entities}
              locations={locations}
              onFiltersChange={setFilters}
            />

            <p className="text-sm text-[#555555] font-medium flex items-center gap-2">
              <span className="text-[#1A1A1A] font-semibold">{filteredDevices.length} appareil(s) affiché(s)</span>
              <span>•</span>
              <span>{devices.length} appareil(s) au total</span>
            </p>

            <DeviceTable
              devices={filteredDevices}
              isAdmin={isAdmin}
              activeCategoryName={activeCategoryName}
              onRowClick={setSelectedDevice}
              onEdit={isAdmin ? handleEdit : undefined}
              onDelete={isAdmin ? handleDelete : undefined}
            />
          </>
        ) : null}
      </section>

      <DeviceDetailDrawer device={selectedDevice} onClose={() => setSelectedDevice(null)} />

      {/* Modale d'édition (admin) */}
      {editingDevice ? (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4"
          onClick={() => setEditingDevice(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Modifier l'appareil"
        >
          <div className="min-h-full flex items-start justify-center py-6">
            <div className="relative w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setEditingDevice(null)}
                className="absolute -top-2 -right-2 z-10 bg-white p-2 rounded-full shadow text-[#555555] hover:bg-[#F4F4F4] transition-colors"
                title="Fermer"
              >
                <X size={20} />
              </button>

              {editError ? (
                <div className="bg-[#CC0000]/10 border border-[#CC0000] text-[#CC0000] px-4 py-3 rounded-md text-sm font-medium mb-4">
                  {editError}
                </div>
              ) : null}

              <DeviceForm
                categories={categories}
                entities={entities}
                locations={locations}
                owners={owners}
                isSubmitting={isSaving}
                canSubmit={isAdmin}
                onSubmit={handleUpdate}
                initialDevice={editingDevice}
                title="Modifier l’appareil"
                submitLabel="Enregistrer les modifications"
                submittingLabel="Enregistrement..."
                resetAfterSubmit={false}
              />
            </div>
          </div>
        </div>
      ) : null}
    </AuthenticatedLayout>
  )
}
