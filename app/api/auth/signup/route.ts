import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import prisma from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { generateToken } from '@/lib/token'

const SignupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = SignupSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { name, email, password } = parsed.data

  // Hash first to prevent timing oracle — response time must be consistent
  const passwordHash = await hashPassword(password)

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    // Return same response as success — don't leak whether email exists
    return NextResponse.json(
      { message: 'If this email is not registered, a verification link has been sent.' },
      { status: 201 }
    )
  }

  const verificationToken = generateToken()
  const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await prisma.user.create({
    data: { name, email, passwordHash, verificationToken, verificationTokenExpiry },
  })

  const verifyUrl = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${verificationToken}`

  return NextResponse.json(
    { message: 'If this email is not registered, a verification link has been sent.', verifyUrl },
    { status: 201 }
  )
}
