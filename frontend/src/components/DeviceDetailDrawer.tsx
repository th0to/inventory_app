import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { Device } from '../services/devicesApi'
import { getEntityBadgeColors, getLocationBadgeColors } from '../utils/badgeColors'

interface DeviceDetailDrawerProps {
  device: Device | null
  onClose: () => void
}

function formatValue(value: string | number | null): string {
  if (value === null || value === undefined || value === '') return '—'
  return String(value)
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('fr-CH')
}

interface FieldProps {
  label: string
  children: React.ReactNode
}

function Field({ label, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-[#555555] uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-[#1A1A1A] break-words">{children}</dd>
    </div>
  )
}

interface SectionProps {
  title: string
  children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold text-[#1A1A1A] border-b border-[#E0E0E0] pb-1">{title}</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</dl>
    </section>
  )
}

export default function DeviceDetailDrawer({ device, onClose }: DeviceDetailDrawerProps) {
  useEffect(() => {
    if (!device) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [device, onClose])

  if (!device) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Détail de l'appareil">
      {/* Overlay */}
      <button
        type="button"
        aria-label="Fermer le panneau"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />

      {/* Panneau */}
      <div className="relative h-full w-full max-w-md bg-white shadow-xl overflow-y-auto animate-slideIn">
        <header className="sticky top-0 bg-white border-b border-[#E0E0E0] px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#555555]">Appareil #{device.id}</p>
            <h2 className="text-lg font-bold text-[#1A1A1A] break-words">{device.model_name}</h2>
            <p className="text-sm text-[#0096D6] font-medium">{device.serial_number}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#555555] hover:bg-[#F4F4F4] rounded transition-colors shrink-0"
            title="Fermer"
          >
            <X size={20} />
          </button>
        </header>

        <div className="px-6 py-6 space-y-6">
          <Section title="Identité">
            <Field label="N° de série">{device.serial_number}</Field>
            <Field label="Modèle">{device.model_name}</Field>
            <Field label="Catégorie">{formatValue(device.category)}</Field>
            <Field label="Génération">{formatValue(device.generation)}</Field>
          </Section>

          <Section title="Affectation">
            <Field label="Entité">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getEntityBadgeColors(device.entity)}`}>
                {device.entity}
              </span>
            </Field>
            <Field label="Lieu">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getLocationBadgeColors(device.location)}`}>
                {device.location}
              </span>
            </Field>
            <Field label="Propriétaire">{formatValue(device.owner)}</Field>
            <Field label="Client / Partenaire">{formatValue(device.client)}</Field>
            <Field label="N° de commande">{formatValue(device.order_number)}</Field>
            <Field label="PV">{device.is_pv ? 'Oui' : 'Non'}</Field>
          </Section>

          <Section title="Caractéristiques">
            <Field label="Processeur">{formatValue(device.cpu)}</Field>
            <Field label="RAM (GB)">{formatValue(device.ram_gb)}</Field>
            <Field label="Stockage (GB)">{formatValue(device.storage_gb)}</Field>
            <Field label="Taille (pouces)">{formatValue(device.screen_size)}</Field>
            <Field label="Puissance (W)">{formatValue(device.power_w)}</Field>
          </Section>

          <Section title="Divers">
            <Field label="Archivé">{device.is_archived ? 'Oui' : 'Non'}</Field>
            <Field label="Créé le">{formatDate(device.created_at)}</Field>
            <Field label="Modifié le">{formatDate(device.updated_at)}</Field>
          </Section>

          {device.comment ? (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-[#1A1A1A] border-b border-[#E0E0E0] pb-1">Commentaire</h3>
              <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap break-words">{device.comment}</p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
