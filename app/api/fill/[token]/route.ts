import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { isTokenExpired } from '@/lib/token'
import { computeAlerts } from '@/lib/alert-rules'
import { z } from 'zod'

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const session = await prisma.assessmentSession.findUnique({
    where: { token: params.token },
  })

  if (!session) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
  if (session.status !== 'PENDING') return NextResponse.json({ error: 'Link already used' }, { status: 410 })
  if (isTokenExpired(session.tokenExpiresAt)) return NextResponse.json({ error: 'Link expired' }, { status: 410 })

  return NextResponse.json({ scale: session.scale, sessionId: session.id })
}

const SubmitSchema = z.object({
  itemScores: z.record(z.string(), z.number()),
})

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const assessmentSession = await prisma.assessmentSession.findUnique({
    where: { token: params.token },
  })

  if (!assessmentSession) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })
  if (assessmentSession.status !== 'PENDING') return NextResponse.json({ error: 'Already submitted' }, { status: 410 })
  if (isTokenExpired(assessmentSession.tokenExpiresAt)) return NextResponse.json({ error: 'Link expired' }, { status: 410 })

  const body = await req.json()
  const parsed = SubmitSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { itemScores } = parsed.data
  const totalScore = Object.values(itemScores).reduce((a, b) => a + b, 0)
  const { severity } = computeAlerts(assessmentSession.scale as 'PHQ9' | 'BDI2' | 'GAD7', totalScore, itemScores)

  await prisma.$transaction([
    prisma.questionnaireResponse.create({
      data: {
        sessionId: assessmentSession.id,
        itemScores,
        totalScore,
        severity: severity ?? 'low',
      },
    }),
    prisma.assessmentSession.update({
      where: { id: assessmentSession.id },
      data: { status: 'COMPLETED' },
    }),
  ])

  return NextResponse.json({ ok: true })
}
