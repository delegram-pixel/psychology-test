import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { generateToken, tokenExpiresAt } from '@/lib/token'

const CreateSessionSchema = z.object({
  scaleId: z.string().min(1),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, psychologistId: session.user.id },
  })
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = CreateSessionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const token = generateToken()
  const assessmentSession = await prisma.assessmentSession.create({
    data: {
      patientId: params.id,
      psychologistId: session.user.id,
      scaleId: parsed.data.scaleId,
      token,
      tokenExpiresAt: tokenExpiresAt(),
    },
  })

  const fillUrl = `${process.env.NEXTAUTH_URL}/fill/${token}`

  return NextResponse.json({ ...assessmentSession, fillUrl }, { status: 201 })
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sessions = await prisma.assessmentSession.findMany({
    where: { patientId: params.id, psychologistId: session.user.id },
    include: { response: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(sessions)
}
