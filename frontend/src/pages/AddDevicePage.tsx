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
import './add-device.css'

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
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadReferences()

    return () => {
      cancelled = true
    }
  }, [token])

  const canSubmit = role === 'admin'

  const handleCreateDevice = async (payload: DeviceCreatePayload) => {
    if (!token) {
      throw new Error('Session invalide. Veuillez vous reconnecter.')
    }

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
    }
  }

  return (
    <AuthenticatedLayout title="Ajouter un appareil">
      <section className="add-device-page">
        {isLoading ? <p>Chargement du formulaire…</p> : null}

        {!isLoading && !canSubmit ? (
          <p role="alert" className="add-device-warning">
            Seuls les administrateurs peuvent ajouter un appareil.
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="add-device-error">
            {error}
          </p>
        ) : null}

        {successMessage ? (
          <p role="status" className="add-device-success">
            {successMessage}
          </p>
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
