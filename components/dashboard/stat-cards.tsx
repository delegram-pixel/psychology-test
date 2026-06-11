import { Users, Bell, Clock, Activity } from 'lucide-react'

interface Stats {
  totalPatients: number
  openAlerts: number
  criticalAlerts: number
  pendingSessions: number
}

export function StatCards({ stats }: { stats: Stats }) {
  const cards = [
    { label: 'Active Patients', value: stats.totalPatients, icon: Users, color: 'text-indigo-600' },
    {
      label: 'Open Alerts',
      value: `${stats.openAlerts} (${stats.criticalAlerts} Critical)`,
      icon: Bell,
      color: 'text-red-500',
    },
    { label: 'Awaiting Response', value: stats.pendingSessions, icon: Clock, color: 'text-amber-500' },
    {
      label: 'Avg Caseload Risk',
      value: stats.criticalAlerts > 0 ? 'High' : 'Moderate',
      icon: Activity,
      color: 'text-orange-500',
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map(card => (
        <div key={card.label} className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-500 font-medium">{card.label}</p>
            <card.icon size={16} className={card.color} />
          </div>
          <p className="text-2xl font-semibold text-slate-900">{card.value}</p>
        </div>
      ))}
    </div>
  )
}
