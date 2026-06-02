import { useEffect, useState } from 'react'
import DeviceForm from '../components/DeviceForm'
import AuthenticatedLayout from '../components/AuthenticatedLayout'
import { useAuth } from '../context/useAuth'
import { createDevice, type DeviceCreatePayload } from '../services/devicesApi'
import {
  fetchCategories,
  fetchEntities,
  fetchLocations,
  fetchOwners,
  type NamedReference,
} from '../services/referencesApi'

export default function AddDevicePage() {
  const { token, role } = useAuth()
  const [categories, setCategories] = useState<NamedReference[]>([])
  const [entities, setEntities] = useState<NamedReference[]>([])
  const [locations, setLocations] = useState<NamedReference[]>([])
  const [owners, setOwners] = useState<NamedReference[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadReferences = async () => {
      if (!token) {
        if (!cancelled) {
          setError('Session invalide. Veuillez vous reconnecter.')
          setIsLoading(false)
        }
        return
      }

      try {
        const [categoriesData, entitiesData, locationsData, ownersData] = await Promise.all([
          fetchCategories(token),
          fetchEntities(token),
          fetchLocations(token),
          fetchOwners(token),
        ])

        if (!cancelled) {
          setCategories(categoriesData)
          setEntities(entitiesData)
          setLocations(locationsData)
          setOwners(ownersData)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Impossible de charger les référentiels du formulaire.',
          )
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadReferences()
    return () => { cancelled = true }
  }, [token])

  const canSubmit = role === 'admin'

  const handleCreateDevice = async (payload: DeviceCreatePayload) => {
    if (!token) throw new Error('Session invalide. Veuillez vous reconnecter.')

    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      await createDevice(token, payload)
      setSuccessMessage('Appareil ajouté avec succès.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’ajouter l’appareil.')
      throw err
    } finally {
      setIsSubmitting(false)
      // Hide success notification after 5s
      setTimeout(() => setSuccessMessage(null), 5000)
    }
  }

  return (
    <AuthenticatedLayout title="">
      <section className="space-y-6">
        {isLoading ? <p className="text-center font-medium text-[#555555] py-10">Chargement du formulaire…</p> : null}

        {!isLoading && !canSubmit ? (
          <div className="bg-[#FF6B00]/10 border border-[#FF6B00] text-[#FF6B00] px-4 py-3 rounded-md text-sm font-medium">
            Seuls les administrateurs peuvent ajouter un appareil.
          </div>
        ) : null}

        {error ? (
          <div className="bg-[#CC0000]/10 border border-[#CC0000] text-[#CC0000] px-4 py-3 rounded-md text-sm font-medium">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="bg-[#007A33]/10 border border-[#007A33] text-[#007A33] px-4 py-3 rounded-md text-sm font-medium">
            {successMessage}
          </div>
        ) : null}

        {!isLoading ? (
          <DeviceForm
            categories={categories}
            entities={entities}
            locations={locations}
            owners={owners}
            isSubmitting={isSubmitting}
            canSubmit={canSubmit}
            onSubmit={handleCreateDevice}
          />
        ) : null}
      </section>
    </AuthenticatedLayout>
  )
}
