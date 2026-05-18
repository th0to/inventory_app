interface StatCardProps {
  label: string
  value: number
}

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <article className="stat-card">
      <p className="stat-card__label">{label}</p>
      <p className="stat-card__value">{value}</p>
    </article>
  )
}
