import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Package, CheckCircle, Truck, ArchiveX, Info, SlidersHorizontal } from 'lucide-react'
import StatCard from '../components/StatCard'
import AuthenticatedLayout from '../components/AuthenticatedLayout'
import { useAuth } from '../context/useAuth'
import { fetchDevices, type Device } from '../services/devicesApi'
import {
  fetchCategories,
  fetchEntities,
  fetchLocations,
  fetchOwners,
  type NamedReference,
} from '../services/referencesApi'
import { countByKey, computeAvailability, type Bucket } from '../utils/deviceStats'
import { getLocationHexColor } from '../utils/badgeColors'

const PIE_COLORS = [
  '#0096D6', '#007A33', '#FF6B00', '#CC0000', '#555555', '#7C3AED', '#0EA5E9', '#1A1A1A',
]

interface DashboardFilters {
  entityId: string
  categoryId: string
  locationId: string
  ownerId: string
}

const DEFAULT_FILTERS: DashboardFilters = {
  entityId: '',
  categoryId: '',
  locationId: '',
  ownerId: '',
}

const selectClass =
  'border border-[#E0E0E0] rounded-md p-2 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#0096D6] w-full bg-white'

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-[#555555]">
      <Info size={32} className="mb-2 opacity-50" />
      <p className="text-sm">Aucune donnée disponible</p>
    </div>
  )
}

/** Carte graphique en barres réutilisable (data triée décroissante). */
function BarCard({ title, data, color }: { title: string; data: Bucket[]; color: string }) {
  return (
    <article className="bg-white rounded-lg shadow-sm p-6 flex flex-col">
      <h2 className="font-semibold text-lg text-[#1A1A1A] mb-6">{title}</h2>
      <div className="h-[260px] w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 15, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
              <XAxis dataKey="label" angle={-25} textAnchor="end" interval={0} height={60} tick={{ fill: '#555555', fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#555555', fontSize: 12 }} />
              <Tooltip cursor={{ fill: '#F4F4F4' }} />
              <Bar dataKey="count" fill={color} name="Appareils" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState />
        )}
      </div>
    </article>
  )
}

export default function DashboardPage() {
  const { token } = useAuth()
  const [devices, setDevices] = useState<Device[]>([])
  const [categories, setCategories] = useState<NamedReference[]>([])
  const [entities, setEntities] = useState<NamedReference[]>([])
  const [locations, setLocations] = useState<NamedReference[]>([])
  const [owners, setOwners] = useState<NamedReference[]>([])
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    const load = async () => {
      if (!token) {
        if (!isCancelled) {
          setError('Session invalide. Veuillez vous reconnecter.')
          setIsLoading(false)
        }
        return
      }
      try {
        const [devicesData, cats, ents, locs, owns] = await Promise.all([
          fetchDevices(token),
          fetchCategories(token),
          fetchEntities(token),
          fetchLocations(token),
          fetchOwners(token),
        ])
        if (!isCancelled) {
          setDevices(devicesData)
          setCategories(cats)
          setEntities(ents)
          setLocations(locs)
          setOwners(owns)
          setError(null)
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Impossible de charger les statistiques.')
        }
      } finally {
        if (!isCancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      isCancelled = true
    }
  }, [token])

  const filteredDevices = useMemo(() => {
    return devices.filter((d) => {
      if (filters.entityId && d.entity_id !== Number(filters.entityId)) return false
      if (filters.categoryId && d.category_id !== Number(filters.categoryId)) return false
      if (filters.locationId && d.location_id !== Number(filters.locationId)) return false
      if (filters.ownerId && d.owner_id !== Number(filters.ownerId)) return false
      return true
    })
  }, [devices, filters])

  const availability = useMemo(() => computeAvailability(filteredDevices), [filteredDevices])

  const byCategory = useMemo(() => countByKey(filteredDevices, (d) => d.category), [filteredDevices])
  const byEntity = useMemo(() => countByKey(filteredDevices, (d) => d.entity), [filteredDevices])
  const byLocation = useMemo(() => countByKey(filteredDevices, (d) => d.location), [filteredDevices])
  const byOwner = useMemo(() => countByKey(filteredDevices, (d) => d.owner), [filteredDevices])
  const byGeneration = useMemo(() => countByKey(filteredDevices, (d) => d.generation), [filteredDevices])

  const availabilityDonut = useMemo(
    () => [
      { label: 'Disponibles', count: availability.available, color: '#007A33' },
      { label: 'Immobilisés', count: availability.immobilized, color: '#FF6B00' },
      { label: 'Archivés', count: availability.archived, color: '#94A3B8' },
    ].filter((s) => s.count > 0),
    [availability],
  )

  const hasActiveFilter = Object.values(filters).some((v) => v !== '')

  const updateFilter = (key: keyof DashboardFilters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }))

  const kpiCards = [
    { label: 'Total', value: availability.total, icon: <Package size={24} />, border: 'border-[#0096D6]' },
    { label: 'Disponibles', value: availability.available, icon: <CheckCircle size={24} />, border: 'border-[#007A33]' },
    { label: 'Immobilisés', value: availability.immobilized, icon: <Truck size={24} />, border: 'border-[#FF6B00]' },
    { label: 'Archivés', value: availability.archived, icon: <ArchiveX size={24} />, border: 'border-[#94A3B8]' },
  ]

  return (
    <AuthenticatedLayout title="Dashboard">
      <section className="space-y-8 pb-10">
        {isLoading ? <p className="text-[#555555] font-medium">Chargement des statistiques…</p> : null}

        {!isLoading && error ? (
          <div className="bg-[#CC0000]/10 border border-[#CC0000] text-[#CC0000] px-4 py-3 rounded-md text-sm font-medium">
            {error}
          </div>
        ) : null}

        {!isLoading && !error ? (
          <>
            {/* Barre de filtres globale */}
            <section className="bg-white rounded-lg shadow-sm p-4" aria-label="Filtres du tableau de bord">
              <div className="flex items-center gap-2 mb-3 text-[#1A1A1A]">
                <SlidersHorizontal size={18} className="text-[#0096D6]" />
                <h2 className="font-semibold">Filtres</h2>
                <span className="text-sm text-[#555555] font-medium ml-auto">
                  <span className="text-[#1A1A1A] font-semibold">{filteredDevices.length}</span> appareil(s)
                  {hasActiveFilter ? <span> sur {devices.length}</span> : null}
                </span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-[#555555]">Entité</span>
                  <select className={selectClass} value={filters.entityId} onChange={(e) => updateFilter('entityId', e.target.value)}>
                    <option value="">Toutes</option>
                    {entities.map((x) => <option key={x.id} value={String(x.id)}>{x.name}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-[#555555]">Catégorie</span>
                  <select className={selectClass} value={filters.categoryId} onChange={(e) => updateFilter('categoryId', e.target.value)}>
                    <option value="">Toutes</option>
                    {categories.map((x) => <option key={x.id} value={String(x.id)}>{x.name}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-[#555555]">Lieu</span>
                  <select className={selectClass} value={filters.locationId} onChange={(e) => updateFilter('locationId', e.target.value)}>
                    <option value="">Tous</option>
                    {locations.map((x) => <option key={x.id} value={String(x.id)}>{x.name}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-[#555555]">Responsable</span>
                  <select className={selectClass} value={filters.ownerId} onChange={(e) => updateFilter('ownerId', e.target.value)}>
                    <option value="">Tous</option>
                    {owners.map((x) => <option key={x.id} value={String(x.id)}>{x.name}</option>)}
                  </select>
                </label>
              </div>
            </section>

            {/* KPI */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-6" aria-label="Chiffres clés">
              {kpiCards.map((card) => (
                <StatCard key={card.label} label={card.label} value={card.value} icon={card.icon} borderColorClass={card.border} />
              ))}
            </section>

            {/* Disponibilité + répartition par lieu */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-label="Disponibilité du stock">
              <article className="bg-white rounded-lg shadow-sm p-6 flex flex-col">
                <h2 className="font-semibold text-lg text-[#1A1A1A] mb-6">Disponibilité du stock</h2>
                <div className="relative h-[260px] w-full">
                  {availabilityDonut.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={availabilityDonut} dataKey="count" nameKey="label" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2}>
                            {availabilityDonut.map((s) => <Cell key={s.label} fill={s.color} />)}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ top: '-2rem' }}>
                        <span className="text-4xl font-bold text-[#007A33]">{availability.availablePct}%</span>
                        <span className="text-xs text-[#555555] font-medium">disponibles</span>
                      </div>
                    </>
                  ) : (
                    <EmptyState />
                  )}
                </div>
              </article>

              <article className="bg-white rounded-lg shadow-sm p-6 flex flex-col">
                <h2 className="font-semibold text-lg text-[#1A1A1A] mb-6">Répartition par lieu</h2>
                <div className="h-[260px] w-full">
                  {byLocation.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={byLocation} margin={{ top: 10, right: 15, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                        <XAxis dataKey="label" angle={-25} textAnchor="end" interval={0} height={60} tick={{ fill: '#555555', fontSize: 12 }} />
                        <YAxis allowDecimals={false} tick={{ fill: '#555555', fontSize: 12 }} />
                        <Tooltip cursor={{ fill: '#F4F4F4' }} />
                        <Bar dataKey="count" name="Appareils" radius={[4, 4, 0, 0]}>
                          {byLocation.map((b) => <Cell key={b.label} fill={getLocationHexColor(b.label)} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState />
                  )}
                </div>
              </article>
            </section>

            {/* Répartitions détaillées */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6" aria-label="Répartitions">
              <article className="bg-white rounded-lg shadow-sm p-6 flex flex-col">
                <h2 className="font-semibold text-lg text-[#1A1A1A] mb-6">Par catégorie</h2>
                <div className="h-[260px] w-full">
                  {byCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={byCategory} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90} label>
                          {byCategory.map((entry, index) => (
                            <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState />
                  )}
                </div>
              </article>

              <BarCard title="Par entité" data={byEntity} color="#0096D6" />
              <BarCard title="Par responsable" data={byOwner} color="#FF6B00" />
              <BarCard title="Par génération" data={byGeneration} color="#007AB8" />
            </section>
          </>
        ) : null}
      </section>
    </AuthenticatedLayout>
  )
}
