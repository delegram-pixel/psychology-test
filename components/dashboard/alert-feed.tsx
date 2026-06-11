import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { computeAlerts } from '@/lib/alert-rules'

interface SessionWithPatient {
  id: string
  scale: string
  patientId: string
  patient: { anonymousId: string }
  response: { totalScore: number; itemScores: Record<string, number> } | null
}

const SEVERITY_STYLES = {
  critical: { badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  high: { badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  moderate: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
}

export function AlertFeed({ sessions }: { sessions: SessionWithPatient[] }) {
  const alerts = sessions
    .filter(s => s.response)
    .map(s => {
      const itemScores = s.response!.itemScores as Record<string, number>
      const result = computeAlerts(s.scale as 'PHQ9' | 'BDI2' | 'GAD7', s.response!.totalScore, itemScores)
      return { session: s, ...result }
    })
    .filter(a => a.severity !== null)
    .sort((a, b) => {
      const order = { critical: 0, high: 1, moderate: 2 }
      return order[a.severity!] - order[b.severity!]
    })

  if (alerts.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400 text-sm">
        No open alerts
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">Open Alerts</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {alerts.map(({ session, severity, suicidalIdeation }) => {
          const styles = SEVERITY_STYLES[severity!]
          return (
            <div key={session.id} className="px-5 py-3 flex items-center gap-4">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${styles.dot}`} />
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles.badge}`}>
                {severity === 'critical' ? 'Critical' : severity === 'high' ? 'High' : 'Moderate'}
              </span>
              <span className="text-sm font-medium text-slate-700">{session.patient.anonymousId}</span>
              <span className="text-sm text-slate-500">{session.scale} · Score {session.response?.totalScore}</span>
              {suicidalIdeation && (
                <span className="flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full">
                  <AlertTriangle size={12} /> Suicidal ideation endorsed
                </span>
              )}
              <Link
                href={`/patients/${session.patientId}/sessions/${session.id}`}
                className="ml-auto text-xs text-indigo-600 hover:underline"
              >
                View →
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
