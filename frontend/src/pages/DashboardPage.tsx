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
import { Package, CheckCircle, Archive, Building2, ArchiveX, Info } from 'lucide-react'
import StatCard from '../components/StatCard'
import AuthenticatedLayout from '../components/AuthenticatedLayout'
import { useAuth } from '../context/useAuth'
import { fetchStatsSummary, type StatCount, type StatsSummary } from '../services/statsApi'

const PIE_COLORS = [
  '#0096D6', // Primaire HP
  '#007A33', // Succès
  '#FF6B00', // Warning
  '#CC0000', // Danger
  '#555555', // Secondaire
  '#007AB8',
  '#1A1A1A',
]

const LOCATION_KEYWORDS = {
  stock: ['stock'],
  client: ['client'],
} as const

function countByLocationKeywords(stats: StatCount[], keywords: string[]): number {
  const normalizedKeywords = keywords.map((keyword) => keyword.trim().toLowerCase())
  return stats.reduce((total, item) => {
    const normalizedName = item.name.trim().toLowerCase()
    const matchesKeyword = normalizedKeywords.some((keyword) => normalizedName.includes(keyword))
    return matchesKeyword ? total + item.count : total
  }, 0)
}

export default function DashboardPage() {
  const { token } = useAuth()
  const [stats, setStats] = useState<StatsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    const loadStats = async () => {
      if (!token) {
        if (!isCancelled) {
          setError('Session invalide. Veuillez vous reconnecter.')
          setIsLoading(false)
        }
        return
      }

      try {
        const data = await fetchStatsSummary(token)
        if (!isCancelled) {
          setStats(data)
          setError(null)
        }
      } catch (err) {
        if (!isCancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Impossible de charger les statistiques du dashboard.',
          )
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadStats()
    return () => {
      isCancelled = true
    }
  }, [token])

  const statCards = useMemo(() => {
    if (!stats) return []

    return [
      { label: 'Total', value: stats.total_devices, icon: <Package size={24} />, border: 'border-[#0096D6]' },
      { label: 'Actifs', value: stats.active_devices, icon: <CheckCircle size={24} />, border: 'border-[#007A33]' },
      { label: 'En stock', value: countByLocationKeywords(stats.by_location, [...LOCATION_KEYWORDS.stock]), icon: <Archive size={24} />, border: 'border-[#007A33]' },
      { label: 'Chez client', value: countByLocationKeywords(stats.by_location, [...LOCATION_KEYWORDS.client]), icon: <Building2 size={24} />, border: 'border-[#FF6B00]' },
      { label: 'Archivés', value: stats.archived_devices, icon: <ArchiveX size={24} />, border: 'border-[#555555]' },
    ]
  }, [stats])

  return (
    <AuthenticatedLayout title="Dashboard">
      <section className="space-y-8 pb-10">
        {isLoading ? <p className="text-[#555555] font-medium">Chargement des statistiques…</p> : null}

        {!isLoading && error ? (
          <div className="bg-[#CC0000]/10 border border-[#CC0000] text-[#CC0000] px-4 py-3 rounded-md text-sm font-medium">
            {error}
          </div>
        ) : null}

        {!isLoading && !error && stats ? (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-5 gap-6" aria-label="Chiffres globaux">
              {statCards.map((card) => (
                <StatCard 
                  key={card.label} 
                  label={card.label} 
                  value={card.value} 
                  icon={card.icon} 
                  borderColorClass={card.border} 
                />
              ))}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6" aria-label="Graphiques statistiques">
              <article className="bg-white rounded-lg shadow-sm p-6 flex flex-col">
                <h2 className="font-semibold text-lg text-[#1A1A1A] mb-6">Par catégorie</h2>
                <div className="h-[250px] w-full flex-1">
                  {stats.by_category.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.by_category}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={85}
                          label
                        >
                          {stats.by_category.map((entry, index) => (
                            <Cell key={entry.id} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-[#555555]">
                      <Info size={32} className="mb-2 opacity-50" />
                      <p className="text-sm">Aucune donnée disponible</p>
                    </div>
                  )}
                </div>
              </article>

              <article className="bg-white rounded-lg shadow-sm p-6 flex flex-col">
                <h2 className="font-semibold text-lg text-[#1A1A1A] mb-6">Par entité</h2>
                <div className="h-[250px] w-full flex-1">
                  {stats.by_entity.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.by_entity} margin={{ top: 10, right: 15, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                        <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={60} tick={{fill: '#555555', fontSize: 12}} />
                        <YAxis allowDecimals={false} tick={{fill: '#555555', fontSize: 12}} />
                        <Tooltip cursor={{fill: '#F4F4F4'}} />
                        <Legend />
                        <Bar dataKey="count" fill="#0096D6" name="Appareils" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-[#555555]">
                      <Info size={32} className="mb-2 opacity-50" />
                      <p className="text-sm">Aucune donnée disponible</p>
                    </div>
                  )}
                </div>
              </article>

              <article className="bg-white rounded-lg shadow-sm p-6 flex flex-col">
                <h2 className="font-semibold text-lg text-[#1A1A1A] mb-6">Par localisation</h2>
                <div className="h-[250px] w-full flex-1">
                  {stats.by_location.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats.by_location}
                        margin={{ top: 10, right: 15, left: 0, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0E0E0" />
                        <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={60} tick={{fill: '#555555', fontSize: 12}} />
                        <YAxis allowDecimals={false} tick={{fill: '#555555', fontSize: 12}} />
                        <Tooltip cursor={{fill: '#F4F4F4'}} />
                        <Legend />
                        <Bar dataKey="count" fill="#007A33" name="Appareils" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-[#555555]">
                      <Info size={32} className="mb-2 opacity-50" />
                      <p className="text-sm">Aucune donnée disponible</p>
                    </div>
                  )}
                </div>
              </article>
            </section>
          </>
        ) : null}
      </section>
    </AuthenticatedLayout>
  )
}
