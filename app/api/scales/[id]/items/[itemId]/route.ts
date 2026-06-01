import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const UpdateItemSchema = z.object({
  text: z.string().min(1).optional(),
  order: z.number().optional(),
  required: z.boolean().optional(),
})

async function assertOwner(scaleId: string, itemId: string, userId: string) {
  return prisma.scaleItem.findFirst({
    where: {
      id: itemId,
      scaleId,
      scale: { psychologistId: userId, isLibrary: false },
    },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const item = await assertOwner(params.id, params.itemId, session.user.id)
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const parsed = UpdateItemSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const updated = await prisma.scaleItem.update({
    where: { id: params.itemId },
    data: parsed.data,
    include: { options: { orderBy: { order: 'asc' } } },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const item = await assertOwner(params.id, params.itemId, session.user.id)
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.scaleItem.delete({ where: { id: params.itemId } })
  return NextResponse.json({ ok: true })
}
