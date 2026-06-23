import { useEffect, useMemo, useState } from 'react'
import DeviceTable from '../components/DeviceTable'
import DeviceDetailDrawer from '../components/DeviceDetailDrawer'
import FilterBar, { type InventoryFilters } from '../components/FilterBar'
import AuthenticatedLayout from '../components/AuthenticatedLayout'
import { useAuth } from '../context/useAuth'
import { fetchDevices, type Device } from '../services/devicesApi'
import {
  fetchCategories,
  fetchEntities,
  fetchLocations,
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
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_FILTERS)
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    const loadInventoryData = async () => {
      if (!token) {
        if (!isCancelled) setError('Session invalide. Veuillez vous reconnecter.')
        return
      }

      try {
        const [devicesData, categoriesData, entitiesData, locationsData] = await Promise.all([
          fetchDevices(token),
          fetchCategories(token),
          fetchEntities(token),
          fetchLocations(token),
        ])

        if (!isCancelled) {
          setDevices(devicesData)
          setCategories(categoriesData)
          setEntities(entitiesData)
          setLocations(locationsData)
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
            />
          </>
        ) : null}
      </section>

      <DeviceDetailDrawer device={selectedDevice} onClose={() => setSelectedDevice(null)} />
    </AuthenticatedLayout>
  )
}
