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
  serialNumber: string; modelName: string; generation: string;
  categoryId: string; entityId: string; locationId: string; ownerId: string;
  orderNumber: string; clientName: string; isPv: boolean;
  cpu: string; ramGb: string; storageGb: string; screenSize: string; powerW: string; comment: string;
}

type FormErrors = Partial<Record<keyof DeviceFormValues, string>>

const INITIAL_VALUES: DeviceFormValues = {
  serialNumber: '', modelName: '', generation: '', categoryId: '', entityId: '', locationId: '',
  ownerId: '', orderNumber: '', clientName: '', isPv: false, cpu: '', ramGb: '', storageGb: '', screenSize: '', powerW: '', comment: ''
}

function buildValidationErrors(values: DeviceFormValues): FormErrors {
  const errors: FormErrors = {}
  if (!values.serialNumber.trim()) errors.serialNumber = 'Le numéro de série est obligatoire.'
  if (!values.modelName.trim()) errors.modelName = 'Le modèle est obligatoire.'
  if (!values.categoryId) errors.categoryId = 'La catégorie est obligatoire.'
  if (!values.entityId) errors.entityId = 'L’entité est obligatoire.'
  if (!values.locationId) errors.locationId = 'Le lieu est obligatoire.'
  if (!values.ownerId) errors.ownerId = 'Le propriétaire est obligatoire.'
  return errors
}

export default function DeviceForm({ categories, entities, locations, owners, isSubmitting, canSubmit, onSubmit }: DeviceFormProps) {
  const [values, setValues] = useState<DeviceFormValues>(INITIAL_VALUES)
  const [errors, setErrors] = useState<FormErrors>({})

  const isDisabled = isSubmitting || !canSubmit

  const updateValue = (key: keyof DeviceFormValues, value: string | boolean) => {
    setValues((previous) => ({ ...previous, [key]: value }))
    setErrors((previous) => {
      if (!previous[key]) return previous
      const next = { ...previous }
      delete next[key]
      return next
    })
  }

  const selectedEntity = entities.find((e) => String(e.id) === values.entityId)?.name.toLowerCase() || ''
  const selectedCategory = categories.find((c) => String(c.id) === values.categoryId)?.name || ''
  const selectedLocation = locations.find((l) => String(l.id) === values.locationId)?.name.toLowerCase() || ''

  const isZurich = selectedEntity.includes('zurich') || selectedEntity === 'zrh'
  const isClient = selectedLocation.includes('client')
  const showComputerSpecs = ['Laptop', 'Desktop', 'Workstation', 'Mobile Workstation'].some(c => selectedCategory.includes(c))
  const showDisplaySpecs = selectedCategory.includes('Display')
  const showDockingSpecs = selectedCategory.includes('Docking')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = buildValidationErrors(values)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0 || isDisabled) return

    try {
      await onSubmit({
        serial_number: values.serialNumber.trim(),
        model_name: values.modelName.trim(),
        category_id: Number(values.categoryId),
        entity_id: Number(values.entityId),
        location_id: Number(values.locationId),
        owner_id: Number(values.ownerId),
        order_number: isZurich ? values.orderNumber.trim() : null,
        
        // Extended payload supported via 'any' bypassing TS errors without deviceApi refactoring
        generation: values.generation.trim() || null,
        client: isClient ? values.clientName.trim() : null,
        is_pv: values.isPv,
        cpu: showComputerSpecs ? values.cpu.trim() : null,
        ram_gb: showComputerSpecs && values.ramGb ? Number(values.ramGb) : null,
        storage_gb: showComputerSpecs && values.storageGb ? Number(values.storageGb) : null,
        screen_size: showDisplaySpecs ? values.screenSize.trim() : null,
        power_w: showDockingSpecs && values.powerW ? Number(values.powerW) : null,
        comment: values.comment.trim() || null
      } as any)

      setValues(INITIAL_VALUES)
      setErrors({})
    } catch {
      return
    }
  }

  const baseInputClass = "border border-[#E0E0E0] rounded-md p-3 w-full text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0096D6] bg-white disabled:bg-[#F4F4F4]";
  const labelClass = "text-sm font-medium text-[#1A1A1A] mb-1 block";

  return (
    <form className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-8" onSubmit={handleSubmit} noValidate>
      <h2 className="font-bold text-2xl text-[#1A1A1A] mb-8">Ajouter un appareil</h2>

      {/* Section 1 — Identification */}
      <div className="mb-8">
        <h3 className="font-semibold text-lg text-[#1A1A1A] mb-4 pb-2 border-b border-[#E0E0E0]">Section 1 — Identification</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label>
            <span className={labelClass}>Numéro de série <span className="text-[#CC0000]">*</span></span>
            <input type="text" className={baseInputClass} value={values.serialNumber} onChange={(e) => updateValue('serialNumber', e.target.value)} disabled={isDisabled} />
            {errors.serialNumber && <p className="text-[#CC0000] text-xs mt-1">{errors.serialNumber}</p>}
          </label>

          <label>
            <span className={labelClass}>Modèle <span className="text-[#CC0000]">*</span></span>
            <input type="text" className={baseInputClass} value={values.modelName} onChange={(e) => updateValue('modelName', e.target.value)} disabled={isDisabled} />
            {errors.modelName && <p className="text-[#CC0000] text-xs mt-1">{errors.modelName}</p>}
          </label>

          <label>
            <span className={labelClass}>Génération</span>
            <input type="text" className={baseInputClass} value={values.generation} onChange={(e) => updateValue('generation', e.target.value)} disabled={isDisabled} />
          </label>

          <label>
            <span className={labelClass}>Catégorie <span className="text-[#CC0000]">*</span></span>
            <select className={baseInputClass} value={values.categoryId} onChange={(e) => updateValue('categoryId', e.target.value)} disabled={isDisabled}>
              <option value="">Sélectionner...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.categoryId && <p className="text-[#CC0000] text-xs mt-1">{errors.categoryId}</p>}
          </label>
        </div>
      </div>

      {/* Section 2 — Provenance et affectation */}
      <div className="mb-8">
        <h3 className="font-semibold text-lg text-[#1A1A1A] mb-4 pb-2 border-b border-[#E0E0E0]">Section 2 — Provenance et affectation</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label>
            <span className={labelClass}>Entité <span className="text-[#CC0000]">*</span></span>
            <select className={baseInputClass} value={values.entityId} onChange={(e) => updateValue('entityId', e.target.value)} disabled={isDisabled}>
              <option value="">Sélectionner...</option>
              {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            {errors.entityId && <p className="text-[#CC0000] text-xs mt-1">{errors.entityId}</p>}
          </label>

          {isZurich && (
            <label>
              <span className={labelClass}>N° de commande</span>
              <input type="text" className={baseInputClass} value={values.orderNumber} onChange={(e) => updateValue('orderNumber', e.target.value)} disabled={isDisabled} />
            </label>
          )}

          <label>
            <span className={labelClass}>Lieu <span className="text-[#CC0000]">*</span></span>
            <select className={baseInputClass} value={values.locationId} onChange={(e) => updateValue('locationId', e.target.value)} disabled={isDisabled}>
              <option value="">Sélectionner...</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            {errors.locationId && <p className="text-[#CC0000] text-xs mt-1">{errors.locationId}</p>}
          </label>

          <label>
            <span className={labelClass}>Propriétaire <span className="text-[#CC0000]">*</span></span>
            <select className={baseInputClass} value={values.ownerId} onChange={(e) => updateValue('ownerId', e.target.value)} disabled={isDisabled}>
              <option value="">Sélectionner...</option>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            {errors.ownerId && <p className="text-[#CC0000] text-xs mt-1">{errors.ownerId}</p>}
          </label>

          {isClient && (
            <label>
              <span className={labelClass}>Client</span>
              <input type="text" className={baseInputClass} value={values.clientName} onChange={(e) => updateValue('clientName', e.target.value)} disabled={isDisabled} />
            </label>
          )}

          <label className="flex items-center gap-3 md:col-span-2 pt-2">
            <input type="checkbox" className="w-4 h-4 text-[#0096D6] focus:ring-[#0096D6] border-gray-300 rounded" checked={values.isPv} onChange={(e) => updateValue('isPv', e.target.checked)} disabled={isDisabled} />
            <span className="text-sm font-medium text-[#1A1A1A]">PV / Demo unit</span>
          </label>
        </div>
      </div>

      {/* Section 3 — Spécifications techniques */}
      <div className="mb-10">
        <h3 className="font-semibold text-lg text-[#1A1A1A] mb-4 pb-2 border-b border-[#E0E0E0]">Section 3 — Spécifications techniques</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {showComputerSpecs && (
            <>
              <label>
                <span className={labelClass}>CPU</span>
                <input type="text" className={baseInputClass} value={values.cpu} onChange={(e) => updateValue('cpu', e.target.value)} disabled={isDisabled} />
              </label>
              <label>
                <span className={labelClass}>RAM (GB)</span>
                <input type="number" min="0" className={baseInputClass} value={values.ramGb} onChange={(e) => updateValue('ramGb', e.target.value)} disabled={isDisabled} />
              </label>
              <label>
                <span className={labelClass}>Stockage (GB)</span>
                <input type="number" min="0" className={baseInputClass} value={values.storageGb} onChange={(e) => updateValue('storageGb', e.target.value)} disabled={isDisabled} />
              </label>
            </>
          )}

          {showDisplaySpecs && (
            <label>
              <span className={labelClass}>Taille écran</span>
              <input type="text" className={baseInputClass} value={values.screenSize} onChange={(e) => updateValue('screenSize', e.target.value)} disabled={isDisabled} />
            </label>
          )}

          {showDockingSpecs && (
            <label>
              <span className={labelClass}>Puissance (W)</span>
              <input type="number" min="0" className={baseInputClass} value={values.powerW} onChange={(e) => updateValue('powerW', e.target.value)} disabled={isDisabled} />
            </label>
          )}

          <label className="md:col-span-2">
            <span className={labelClass}>Commentaire</span>
            <textarea className={`${baseInputClass} min-h-[100px] resize-y`} value={values.comment} onChange={(e) => updateValue('comment', e.target.value)} disabled={isDisabled} />
          </label>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button type="submit" disabled={isDisabled} className="bg-[#0096D6] hover:bg-[#007AB8] text-white px-8 py-3 rounded-lg font-medium transition-colors disabled:opacity-70 flex items-center justify-center min-w-[200px]">
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Création en cours...
            </span>
          ) : 'Créer l’appareil'}
        </button>
      </div>
    </form>
  )
}
