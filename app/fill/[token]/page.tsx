import prisma from '@/lib/prisma'
import { isTokenExpired } from '@/lib/token'
import { QuestionnaireForm } from '@/components/questionnaire/questionnaire-form'

const SCALE_NAME_TO_ENUM: Record<string, string> = {
  'PHQ-9': 'PHQ9',
  'BDI-II': 'BDI2',
  'GAD-7': 'GAD7',
}

const INVALID_UI = (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center space-y-2 max-w-sm px-4">
      <h1 className="text-xl font-semibold text-slate-800">This link is no longer valid</h1>
      <p className="text-slate-500 text-sm">
        The questionnaire link has expired or has already been used. Please contact your clinician for a new link.
      </p>
    </div>
  </div>
)

export default async function FillPage({ params }: { params: { token: string } }) {
  const session = await prisma.assessmentSession.findUnique({
    where: { token: params.token },
    include: {
      scale: {
        include: {
          items: {
            include: { options: { orderBy: { order: 'asc' } } },
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  })

  if (!session || session.status !== 'PENDING' || isTokenExpired(session.tokenExpiresAt)) {
    return INVALID_UI
  }

  const scaleKey = SCALE_NAME_TO_ENUM[session.scale.name] ?? session.scale.name

  return (
    <div className="min-h-screen bg-slate-50">
      <QuestionnaireForm
        scale={scaleKey}
        scaleName={session.scale.name}
        token={params.token}
        dbItems={session.scale.items}
      />
    </div>
  )
}
