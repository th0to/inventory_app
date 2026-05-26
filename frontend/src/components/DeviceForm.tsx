import { useState } from 'react'
import type { DeviceCreatePayload } from '../services/devicesApi'
import type { NamedReference } from '../services/referencesApi'

interface DeviceFormProps {
  categories: NamedReference[]
  entities: NamedReference[]
  locations: NamedReference[]
  owners: NamedReference[]
  isSubmitting: boolean
  canSubmit: boolean
  onSubmit: (payload: DeviceCreatePayload) => Promise<void>
}

interface DeviceFormValues {
  serialNumber: string
  modelName: string
  categoryId: string
  entityId: string
  locationId: string
  ownerId: string
  orderNumber: string
}

type FormErrors = Partial<Record<keyof DeviceFormValues, string>>

const INITIAL_VALUES: DeviceFormValues = {
  serialNumber: '',
  modelName: '',
  categoryId: '',
  entityId: '',
  locationId: '',
  ownerId: '',
  orderNumber: '',
}

function buildValidationErrors(values: DeviceFormValues): FormErrors {
  const errors: FormErrors = {}

  if (!values.serialNumber.trim()) {
    errors.serialNumber = 'Le numéro de série est obligatoire.'
  }

  if (!values.modelName.trim()) {
    errors.modelName = 'Le modèle est obligatoire.'
  }

  if (!values.categoryId) {
    errors.categoryId = 'La catégorie est obligatoire.'
  }

  if (!values.entityId) {
    errors.entityId = 'L’entité est obligatoire.'
  }

  if (!values.locationId) {
    errors.locationId = 'Le lieu est obligatoire.'
  }

  if (!values.ownerId) {
    errors.ownerId = 'Le propriétaire est obligatoire.'
  }

  return errors
}

export default function DeviceForm({
  categories,
  entities,
  locations,
  owners,
  isSubmitting,
  canSubmit,
  onSubmit,
}: DeviceFormProps) {
  const [values, setValues] = useState<DeviceFormValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<FormErrors>({})

  const isDisabled = isSubmitting || !canSubmit

  const updateValue = (key: keyof DeviceFormValues, value: string) => {
    setValues((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => {
      if (!previous[key]) {
        return previous
      }

      const next = { ...previous }
      delete next[key]
      return next
    })
  }


  const selectedEntity = entities.find((e) => String(e.id) === values.entityId)
  const isZurich = selectedEntity?.name.toLowerCase() === 'zurich'

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = buildValidationErrors(values)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0 || isDisabled) {
      return
    }

    try {
      await onSubmit({
        serial_number: values.serialNumber.trim(),
        model_name: values.modelName.trim(),
        category_id: Number(values.categoryId),
        entity_id: Number(values.entityId),
        location_id: Number(values.locationId),
        owner_id: Number(values.ownerId),
        order_number: isZurich ? values.orderNumber.trim() : null,
      })

      setValues(INITIAL_VALUES)
      setErrors({})
    } catch {
      return
    }
  }

  return (
    <form className="add-device-form" onSubmit={handleSubmit} noValidate>
      <label>
        Numéro de série *
        <input
          type="text"
          value={values.serialNumber}
          onChange={(event) => {
            updateValue('serialNumber', event.target.value)
          }}
          disabled={isDisabled}
          aria-invalid={Boolean(errors.serialNumber)}
        />
        {errors.serialNumber ? <span className="add-device-form__error">{errors.serialNumber}</span> : null}
      </label>

      <label>
        Modèle *
        <input
          type="text"
          value={values.modelName}
          onChange={(event) => {
            updateValue('modelName', event.target.value)
          }}
          disabled={isDisabled}
          aria-invalid={Boolean(errors.modelName)}
        />
        {errors.modelName ? <span className="add-device-form__error">{errors.modelName}</span> : null}
      </label>

      <label>
        Catégorie *
        <select
          value={values.categoryId}
          onChange={(event) => {
            updateValue('categoryId', event.target.value)
          }}
          disabled={isDisabled}
          aria-invalid={Boolean(errors.categoryId)}
        >
          <option value="">Sélectionner une catégorie</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>
        {errors.categoryId ? <span className="add-device-form__error">{errors.categoryId}</span> : null}
      </label>

      <label>
        Entité *
        <select
          value={values.entityId}
          onChange={(event) => {
            updateValue('entityId', event.target.value)
          }}
          disabled={isDisabled}
          aria-invalid={Boolean(errors.entityId)}
        >
          <option value="">Sélectionner une entité</option>
          {entities.map((entity) => (
            <option key={entity.id} value={String(entity.id)}>
              {entity.name}
            </option>
          ))}
        </select>
        {errors.entityId ? <span className="add-device-form__error">{errors.entityId}</span> : null}
      </label>

      {isZurich ? (
        <label>
          Numéro de commande
          <input
            type="text"
            value={values.orderNumber}
            onChange={(event) => {
              updateValue('orderNumber', event.target.value)
            }}
            disabled={isDisabled}
          />
        </label>
      ) : null}

      <label>
        Lieu *
        <select
          value={values.locationId}
          onChange={(event) => {
            updateValue('locationId', event.target.value)
          }}
          disabled={isDisabled}
          aria-invalid={Boolean(errors.locationId)}
        >
          <option value="">Sélectionner un lieu</option>
          {locations.map((location) => (
            <option key={location.id} value={String(location.id)}>
              {location.name}
            </option>
          ))}
        </select>
        {errors.locationId ? <span className="add-device-form__error">{errors.locationId}</span> : null}
      </label>

      <label>
        Propriétaire *
        <select
          value={values.ownerId}
          onChange={(event) => {
            updateValue('ownerId', event.target.value)
          }}
          disabled={isDisabled}
          aria-invalid={Boolean(errors.ownerId)}
        >
          <option value="">Sélectionner un propriétaire</option>
          {owners.map((owner) => (
            <option key={owner.id} value={String(owner.id)}>
              {owner.name}
            </option>
          ))}
        </select>
        {errors.ownerId ? <span className="add-device-form__error">{errors.ownerId}</span> : null}
      </label>

      <div className="add-device-form__actions">
        <button type="submit" disabled={isDisabled}>
          {isSubmitting ? 'Création...' : 'Créer l’appareil'}
        </button>
      </div>
    </form>
  )
}
