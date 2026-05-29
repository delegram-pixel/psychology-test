import { notFound } from 'next/navigation'
import { QuestionnaireForm } from '@/components/questionnaire/questionnaire-form'

async function getSessionData(token: string) {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/fill/${token}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export default async function FillPage({ params }: { params: { token: string } }) {
  const data = await getSessionData(params.token)

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-2 max-w-sm px-4">
          <h1 className="text-xl font-semibold text-slate-800">This link is no longer valid</h1>
          <p className="text-slate-500 text-sm">
            The questionnaire link has expired or has already been used. Please contact your clinician for a new link.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <QuestionnaireForm scale={data.scale} token={params.token} />
    </div>
  )
}
