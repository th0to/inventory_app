import { useEffect, useMemo, useState } from 'react'
import DeviceTable from '../components/DeviceTable'
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
import './inventory.css'

const DEFAULT_FILTERS: InventoryFilters = {
  categoryId: '',
  entityId: '',
  locationId: '',
}

export default function InventoryPage() {
  const { token, role } = useAuth()
  const [devices, setDevices] = useState<Device[]>([])
  const [categories, setCategories] = useState<NamedReference[]>([])
  const [entities, setEntities] = useState<NamedReference[]>([])
  const [locations, setLocations] = useState<NamedReference[]>([])
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_FILTERS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    const loadInventoryData = async () => {
      if (!token) {
        if (!isCancelled) {
          setError('Session invalide. Veuillez vous reconnecter.')
          setIsLoading(false)
        }
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
        if (!isCancelled) {
          setError(
            err instanceof Error ? err.message : 'Impossible de charger les données d\'inventaire.',
          )
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadInventoryData()

    return () => {
      isCancelled = true
    }
  }, [token])

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      if (filters.categoryId && device.category_id !== Number(filters.categoryId)) {
        return false
      }

      if (filters.entityId && device.entity_id !== Number(filters.entityId)) {
        return false
      }

      if (filters.locationId && device.location_id !== Number(filters.locationId)) {
        return false
      }

      return true
    })
  }, [devices, filters.categoryId, filters.entityId, filters.locationId])

  const isAdmin = role === 'admin'

  return (
    <AuthenticatedLayout title="Inventaire">
      <section className="inventory-page">
        {isLoading ? <p>Chargement de l&apos;inventaire…</p> : null}

        {!isLoading && error ? (
          <p role="alert" className="inventory-error">
            {error}
          </p>
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

            <p className="inventory-meta">
              <span>{filteredDevices.length} appareil(s) affiché(s)</span>
              <span>{devices.length} appareil(s) au total</span>
            </p>

            <DeviceTable devices={filteredDevices} isAdmin={isAdmin} />
          </>
        ) : null}
      </section>
    </AuthenticatedLayout>
  )
}
