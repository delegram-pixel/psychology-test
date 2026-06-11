import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { StatCards } from '@/components/dashboard/stat-cards'
import { AlertFeed } from '@/components/dashboard/alert-feed'
import { computeAlerts } from '@/lib/alert-rules'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  const SCALE_NAME_TO_ENUM: Record<string, string> = {
    'PHQ-9': 'PHQ9', 'BDI-II': 'BDI2', 'GAD-7': 'GAD7',
  }

  const patients = await prisma.patient.findMany({
    where: { psychologistId: session.user.id },
    include: {
      assessmentSessions: {
        include: { response: true, scale: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  const allSessions = patients.flatMap(p =>
    p.assessmentSessions.map(s => ({ ...s, patient: { anonymousId: p.anonymousId } }))
  )

  const completedSessions = allSessions.filter(s => s.status === 'COMPLETED' && s.response)
  const pendingSessions = allSessions.filter(s => s.status === 'PENDING').length

  const alertCounts = completedSessions.reduce(
    (acc, s) => {
      const itemScores = s.response!.itemScores as Record<string, number>
      const scaleEnum = (SCALE_NAME_TO_ENUM[s.scale.name] ?? s.scale.name) as 'PHQ9' | 'BDI2' | 'GAD7'
      const { severity } = computeAlerts(scaleEnum, s.response!.totalScore, itemScores)
      if (severity === 'critical') acc.critical++
      if (severity) acc.open++
      return acc
    },
    { open: 0, critical: 0 }
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Welcome back, {session.user.name}</p>
      </div>

      <StatCards
        stats={{
          totalPatients: patients.length,
          openAlerts: alertCounts.open,
          criticalAlerts: alertCounts.critical,
          pendingSessions,
        }}
      />

      <AlertFeed sessions={completedSessions as any} />

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Caseload</h2>
          <Link href="/patients" className="text-sm text-indigo-600 hover:underline">
            Manage patients →
          </Link>
        </div>
        {patients.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No patients yet.{' '}
            <Link href="/patients" className="text-indigo-600 hover:underline">
              Add your first patient
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['ID', 'Scale', 'Last Score', 'Sessions', 'Action'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map(p => {
                const completed = p.assessmentSessions.filter(s => s.response)
                const latest = completed.at(-1)
                return (
                  <tr key={p.id}>
                    <td className="px-5 py-3 font-medium text-slate-800">{p.anonymousId}</td>
                    <td className="px-5 py-3 text-slate-500">{latest?.scale?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-800">{latest?.response?.totalScore ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{completed.length}</td>
                    <td className="px-5 py-3">
                      <Link href={`/patients/${p.id}`} className="text-indigo-600 text-xs hover:underline">
                        View Profile
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
