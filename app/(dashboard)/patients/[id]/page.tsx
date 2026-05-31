import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { SessionChart } from '@/components/sessions/session-chart'
import { NewSessionDialog } from '@/components/sessions/new-session-dialog'
import { computeAlerts } from '@/lib/alert-rules'

export default async function PatientProfilePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, psychologistId: session.user.id },
    include: {
      assessmentSessions: {
        include: { response: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!patient) notFound()

  const completed = patient.assessmentSessions.filter(s => s.response)
  const latest = completed.at(-1)

  const chartData = completed.map((s, i) => ({
    session: i + 1,
    score: s.response!.totalScore,
  }))

  const latestAlerts = latest?.response
    ? computeAlerts(
        latest.scale as 'PHQ9' | 'BDI2' | 'GAD7',
        latest.response.totalScore,
        latest.response.itemScores as Record<string, number>
      )
    : null

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">{patient.anonymousId}</h1>
            <span className="text-sm text-slate-400">{patient.displayName}</span>
            {latestAlerts?.severity === 'critical' && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Critical</span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-1">
            {completed.length} completed session{completed.length !== 1 ? 's' : ''}
          </p>
        </div>
        <NewSessionDialog patientId={patient.id} />
      </div>

      {latestAlerts?.suicidalIdeation && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 font-medium">
          ⚠ Suicidal ideation endorsed — immediate clinical attention required
        </div>
      )}

      {completed.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Score History — {latest?.scale}</h2>
          <SessionChart scale={latest!.scale} data={chartData} />
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Sessions</h2>
        </div>
        {patient.assessmentSessions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No sessions yet. Click "New Session" to create one.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['#', 'Scale', 'Status', 'Score', 'Severity', 'Action'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patient.assessmentSessions.map((s, i) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-500">{i + 1}</td>
                  <td className="px-5 py-3 text-slate-700">{s.scale}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      s.status === 'COMPLETED' ? 'bg-green-100 text-green-700'
                      : s.status === 'PENDING' ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-500'
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-800">{s.response?.totalScore ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-500">{s.response?.severity ?? '—'}</td>
                  <td className="px-5 py-3">
                    {s.status === 'COMPLETED' && (
                      <Link
                        href={`/patients/${patient.id}/sessions/${s.id}`}
                        className="text-indigo-600 text-xs hover:underline"
                      >
                        View AI Summary →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
