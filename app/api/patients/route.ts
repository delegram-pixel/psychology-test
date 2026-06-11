import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { nextAnonymousId } from '@/lib/anonymous-id'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patients = await prisma.patient.findMany({
    where: { psychologistId: session.user.id },
    include: {
      assessmentSessions: {
        include: { response: true },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(patients)
}

const CreatePatientSchema = z.object({
  displayName: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const parsed = CreatePatientSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const count = await prisma.patient.count({
    where: { psychologistId: session.user.id },
  })

  const patient = await prisma.patient.create({
    data: {
      displayName: parsed.data.displayName,
      anonymousId: nextAnonymousId(count),
      psychologistId: session.user.id,
    },
  })

  return NextResponse.json(patient, { status: 201 })
}
