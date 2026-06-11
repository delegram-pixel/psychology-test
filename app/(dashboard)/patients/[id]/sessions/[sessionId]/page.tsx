import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { computeAlerts } from '@/lib/alert-rules'
import { NarrativePanel } from '@/components/sessions/narrative-panel'

export default async function SessionDetailPage({
  params,
}: {
  params: { id: string; sessionId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  const SCALE_NAME_TO_ENUM: Record<string, string> = {
    'PHQ-9': 'PHQ9', 'BDI-II': 'BDI2', 'GAD-7': 'GAD7',
  }

  const assessmentSession = await prisma.assessmentSession.findFirst({
    where: {
      id: params.sessionId,
      patientId: params.id,
      psychologistId: session.user.id,
    },
    include: { response: true, patient: true, scale: true },
  })

  if (!assessmentSession || !assessmentSession.response) notFound()

  const itemScores = assessmentSession.response.itemScores as Record<string, number>
  const scaleEnum = (SCALE_NAME_TO_ENUM[assessmentSession.scale.name] ?? assessmentSession.scale.name) as 'PHQ9' | 'BDI2' | 'GAD7'
  const alerts = computeAlerts(
    scaleEnum,
    assessmentSession.response.totalScore,
    itemScores
  )

  const clinicalPayload = {
    scale: scaleEnum,
    totalScore: assessmentSession.response.totalScore,
    severity: assessmentSession.response.severity,
    itemScores,
    suicidalIdeation: alerts.suicidalIdeation,
  }

  const severityStyle = alerts.severity === 'critical'
    ? 'bg-red-100 text-red-700'
    : alerts.severity === 'high'
    ? 'bg-orange-100 text-orange-700'
    : alerts.severity === 'moderate'
    ? 'bg-amber-100 text-amber-700'
    : 'bg-green-100 text-green-700'

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          {assessmentSession.patient.anonymousId} — {assessmentSession.scale.name} Assessment
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Completed {new Date(assessmentSession.response.completedAt).toLocaleDateString()}
        </p>
      </div>

      {alerts.suicidalIdeation && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 font-semibold">
          ⚠ CRITICAL — Suicidal ideation endorsed. Immediate clinical attention required.
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-700">Score Summary</h2>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-3xl font-bold text-slate-900">{assessmentSession.response.totalScore}</p>
            <p className="text-xs text-slate-400 mt-0.5">Total score</p>
          </div>
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${severityStyle}`}>
            {assessmentSession.response.severity}
          </span>
        </div>
        <table className="w-full text-xs mt-2">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-1 text-left text-slate-400 font-medium">Item</th>
              <th className="py-1 text-left text-slate-400 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(itemScores).map(([item, score]) => (
              <tr key={item} className="border-b border-slate-50">
                <td className="py-1 text-slate-600">Item {item}</td>
                <td className="py-1 text-slate-800 font-medium">{score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NarrativePanel clinicalPayload={clinicalPayload} />

      <p className="text-xs text-slate-400 italic">
        AI-generated clinical summary. For clinician review and decision support only.
        Not a substitute for professional clinical judgment.
      </p>
    </div>
  )
}
