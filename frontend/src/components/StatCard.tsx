import { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: number
  icon: ReactNode
  borderColorClass: string
}

export default function StatCard({ label, value, icon, borderColorClass }: StatCardProps) {
  return (
    <article className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${borderColorClass} flex items-start justify-between`}>
      <div>
        <p className="text-sm text-[#555555] font-medium mb-2">{label}</p>
        <p className="text-3xl font-bold text-[#1A1A1A]">{value}</p>
      </div>
      <div className="text-[#555555] opacity-80">
        {icon}
      </div>
    </article>
  )
}
