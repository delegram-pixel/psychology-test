import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const UpdateThresholdSchema = z.object({
  label: z.string().min(1).optional(),
  minScore: z.number().optional(),
  maxScore: z.number().optional(),
})

async function assertOwner(scaleId: string, thresholdId: string, userId: string) {
  return prisma.severityThreshold.findFirst({
    where: {
      id: thresholdId,
      scaleId,
      scale: { psychologistId: userId, isLibrary: false },
    },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; thresholdId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const threshold = await assertOwner(params.id, params.thresholdId, session.user.id)
  if (!threshold) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = UpdateThresholdSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const updated = await prisma.severityThreshold.update({
    where: { id: params.thresholdId },
    data: parsed.data,
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; thresholdId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const threshold = await assertOwner(params.id, params.thresholdId, session.user.id)
  if (!threshold) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.severityThreshold.delete({ where: { id: params.thresholdId } })
  return NextResponse.json({ ok: true })
}
