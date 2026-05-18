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
import StatCard from '../components/StatCard'
import AuthenticatedLayout from '../components/AuthenticatedLayout'
import { useAuth } from '../context/useAuth'
import { fetchStatsSummary, type StatCount, type StatsSummary } from '../services/statsApi'
import './dashboard.css'

const PIE_COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#A855F7',
  '#22C55E',
  '#EF4444',
  '#0EA5E9',
  '#14B8A6',
  '#F97316',
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
    if (!stats) {
      return []
    }

    return [
      { label: 'Total', value: stats.total_devices },
      { label: 'Actifs', value: stats.active_devices },
      {
        label: 'En stock',
        value: countByLocationKeywords(stats.by_location, [...LOCATION_KEYWORDS.stock]),
      },
      {
        label: 'Chez client',
        value: countByLocationKeywords(stats.by_location, [...LOCATION_KEYWORDS.client]),
      },
      { label: 'Archivés', value: stats.archived_devices },
    ]
  }, [stats])

  return (
    <AuthenticatedLayout title="Dashboard">
      <section className="dashboard-page">
        {isLoading ? <p>Chargement des statistiques…</p> : null}

        {!isLoading && error ? (
          <p role="alert" className="dashboard-error">
            {error}
          </p>
        ) : null}

        {!isLoading && !error && stats ? (
          <>
            <section className="stat-cards-grid" aria-label="Chiffres globaux">
              {statCards.map((card) => (
                <StatCard key={card.label} label={card.label} value={card.value} />
              ))}
            </section>

            <section className="dashboard-charts-grid" aria-label="Graphiques statistiques">
              <article className="dashboard-chart-card">
                <h2>Par catégorie</h2>
                <div className="dashboard-chart">
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
                    <p className="dashboard-empty">Aucune donnée de catégorie.</p>
                  )}
                </div>
              </article>

              <article className="dashboard-chart-card">
                <h2>Par entité</h2>
                <div className="dashboard-chart">
                  {stats.by_entity.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.by_entity} margin={{ top: 10, right: 15, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={60} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#8884d8" name="Appareils" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="dashboard-empty">Aucune donnée d&apos;entité.</p>
                  )}
                </div>
              </article>

              <article className="dashboard-chart-card">
                <h2>Par localisation</h2>
                <div className="dashboard-chart">
                  {stats.by_location.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={stats.by_location}
                        margin={{ top: 10, right: 15, left: 0, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={60} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#82ca9d" name="Appareils" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="dashboard-empty">Aucune donnée de localisation.</p>
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
