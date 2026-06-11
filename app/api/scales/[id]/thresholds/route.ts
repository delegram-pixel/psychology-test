import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const AddThresholdSchema = z.object({
  label: z.string().min(1),
  minScore: z.number().int().min(0),
  maxScore: z.number().int().min(0),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const scale = await prisma.scale.findFirst({
    where: { id: params.id, psychologistId: session.user.id, isLibrary: false },
  })
  if (!scale) return NextResponse.json({ error: 'Not found or not editable' }, { status: 404 })

  const body = await req.json()
  const parsed = AddThresholdSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const threshold = await prisma.severityThreshold.create({
    data: { ...parsed.data, scaleId: params.id },
  })

  return NextResponse.json(threshold, { status: 201 })
}
