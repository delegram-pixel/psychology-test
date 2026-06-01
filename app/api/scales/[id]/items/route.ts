import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'

const OptionSchema = z.object({
  label: z.string().min(1),
  value: z.number().nullable().optional(),
  order: z.number(),
})

const AddItemSchema = z.object({
  text: z.string().min(1),
  type: z.enum(['MULTIPLE_CHOICE', 'YES_NO', 'FREE_TEXT', 'NUMBER']),
  order: z.number(),
  required: z.boolean().default(true),
  options: z.array(OptionSchema).optional(),
})

async function assertOwner(scaleId: string, userId: string) {
  return prisma.scale.findFirst({
    where: { id: scaleId, psychologistId: userId, isLibrary: false },
  })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const scale = await assertOwner(params.id, session.user.id)
  if (!scale) return NextResponse.json({ error: 'Not found or not editable' }, { status: 404 })

  const body = await req.json()
  const parsed = AddItemSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { options, ...itemData } = parsed.data

  const item = await prisma.scaleItem.create({
    data: {
      ...itemData,
      scaleId: params.id,
      options: options?.length
        ? { create: options }
        : undefined,
    },
    include: { options: { orderBy: { order: 'asc' } } },
  })

  return NextResponse.json(item, { status: 201 })
}
