# APAS Product Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded APAS demo with a real multi-tenant clinical SaaS — psychologist accounts, patient records, assessment sessions, patient-facing magic-link questionnaires, and a dynamic dashboard.

**Architecture:** Next.js App Router with a route-group protected layout for the psychologist dashboard, public `/fill/[token]` routes for patients, Credentials-based NextAuth with JWT sessions, and Prisma/PostgreSQL for all data. Pure logic (alert rules, tokens, IDs) is extracted into small utility libs and tested with Jest.

**Tech Stack:** Next.js 14, NextAuth v4 (Credentials + JWT), Prisma 5, PostgreSQL, shadcn/ui (Radix already installed), bcryptjs, zod, react-hook-form, recharts, Jest + ts-jest

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `lib/password.ts` | bcrypt hash + verify |
| `lib/token.ts` | UUID magic-link generation, expiry check |
| `lib/anonymous-id.ts` | Per-psychologist sequential patient IDs (P-001…) |
| `lib/alert-rules.ts` | Compute alerts + flags from a QuestionnaireResponse |
| `app/api/auth/signup/route.ts` | POST: create unverified user |
| `app/api/auth/verify-email/route.ts` | GET: mark email verified |
| `app/api/patients/route.ts` | GET list, POST create |
| `app/api/patients/[id]/route.ts` | GET single patient |
| `app/api/patients/[id]/sessions/route.ts` | GET list, POST create (generates magic link) |
| `app/api/patients/[id]/sessions/[sessionId]/route.ts` | GET session + response |
| `app/api/fill/[token]/route.ts` | GET validate token, POST submit response |
| `app/(dashboard)/layout.tsx` | Auth-protected layout with sidebar |
| `app/(dashboard)/dashboard/page.tsx` | Dynamic dashboard |
| `app/(dashboard)/patients/page.tsx` | Patient list |
| `app/(dashboard)/patients/[id]/page.tsx` | Patient profile + session history |
| `app/(dashboard)/patients/[id]/sessions/[sessionId]/page.tsx` | Session detail + AI narrative |
| `app/fill/[token]/page.tsx` | Patient questionnaire form |
| `app/fill/[token]/complete/page.tsx` | Post-submission thank you |
| `app/auth/signup/page.tsx` | Registration UI |
| `app/auth/verify-email/page.tsx` | Email verification handler UI |
| `components/layout/sidebar.tsx` | Authenticated nav sidebar |
| `components/patients/patient-table.tsx` | Caseload table |
| `components/patients/new-patient-dialog.tsx` | Create patient modal |
| `components/sessions/new-session-dialog.tsx` | Create session + show magic link |
| `components/sessions/session-chart.tsx` | Score history LineChart |
| `components/sessions/session-table.tsx` | Session history table |
| `components/dashboard/alert-feed.tsx` | Computed alert list |
| `components/dashboard/stat-cards.tsx` | 4 summary stat cards |
| `components/questionnaire/questionnaire-form.tsx` | Patient-facing scale form |
| `jest.config.ts` | Jest config |
| `jest.setup.ts` | Jest setup |

### Modified files
| File | Change |
|---|---|
| `prisma/schema.prisma` | Add Patient, AssessmentSession, QuestionnaireResponse; update User |
| `lib/auth.ts` | Switch to Credentials + JWT, add email-verified gate |
| `app/api/auth/[...nextauth]/route.ts` | Re-export updated authOptions |
| `app/page.tsx` | Replace with redirect to /dashboard |
| `app/layout.tsx` | Keep providers, clean up |

---

## Task 1: Install dependencies + configure Jest

**Files:**
- Modify: `package.json`
- Create: `jest.config.ts`
- Create: `jest.setup.ts`

- [ ] **Step 1: Install bcryptjs and Jest**

```bash
yarn add bcryptjs
yarn add -D @types/bcryptjs jest ts-jest @types/jest jest-environment-node
```

- [ ] **Step 2: Create jest.config.ts**

```ts
// jest.config.ts
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEach: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.ts'],
}

export default config
```

- [ ] **Step 3: Create jest.setup.ts**

```ts
// jest.setup.ts
// placeholder for future global mocks
export {}
```

- [ ] **Step 4: Add test script to package.json**

In `package.json` scripts, add:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 5: Verify Jest works**

```bash
mkdir -p __tests__ && echo 'test("sanity", () => expect(1+1).toBe(2))' > __tests__/sanity.test.ts
yarn test
```
Expected: `1 passed`

- [ ] **Step 6: Commit**

```bash
git add jest.config.ts jest.setup.ts package.json __tests__/sanity.test.ts
git commit -m "chore: add bcryptjs and jest with ts-jest"
```

---

## Task 2: Update Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Replace schema content**

Replace `prisma/schema.prisma` entirely with:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ── NextAuth required models ──────────────────────────────────────────────────

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ── Application models ────────────────────────────────────────────────────────

model User {
  id                      String              @id @default(cuid())
  name                    String?
  email                   String?             @unique
  emailVerified           DateTime?
  image                   String?
  passwordHash            String?
  verificationToken       String?             @unique
  verificationTokenExpiry DateTime?
  accounts                Account[]
  sessions                Session[]
  patients                Patient[]
  assessmentSessions      AssessmentSession[]
}

model Patient {
  id                 String              @id @default(cuid())
  displayName        String
  anonymousId        String
  psychologistId     String
  psychologist       User                @relation(fields: [psychologistId], references: [id], onDelete: Cascade)
  assessmentSessions AssessmentSession[]
  createdAt          DateTime            @default(now())

  @@unique([anonymousId, psychologistId])
}

model AssessmentSession {
  id             String                 @id @default(cuid())
  patientId      String
  patient        Patient                @relation(fields: [patientId], references: [id], onDelete: Cascade)
  psychologistId String
  psychologist   User                   @relation(fields: [psychologistId], references: [id], onDelete: Cascade)
  scale          Scale
  status         SessionStatus          @default(PENDING)
  token          String                 @unique
  tokenExpiresAt DateTime
  response       QuestionnaireResponse?
  createdAt      DateTime               @default(now())
}

model QuestionnaireResponse {
  id          String            @id @default(cuid())
  sessionId   String            @unique
  session     AssessmentSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  itemScores  Json
  totalScore  Int
  severity    String
  completedAt DateTime          @default(now())
}

enum Scale {
  PHQ9
  BDI2
  GAD7
}

enum SessionStatus {
  PENDING
  COMPLETED
  EXPIRED
}
```

- [ ] **Step 2: Generate and migrate**

```bash
cd psychology-test
yarn prisma migrate dev --name "product-rebuild"
yarn prisma generate
```
Expected: Migration applied, Prisma client regenerated.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: update prisma schema for multi-tenant product rebuild"
```

---

## Task 3: lib/password.ts

**Files:**
- Create: `lib/password.ts`
- Create: `__tests__/lib/password.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/lib/password.test.ts
import { hashPassword, verifyPassword } from '@/lib/password'

describe('password', () => {
  it('hashes a password and verifies it', async () => {
    const hash = await hashPassword('mysecret123')
    expect(hash).not.toBe('mysecret123')
    expect(await verifyPassword('mysecret123', hash)).toBe(true)
  })

  it('rejects wrong password', async () => {
    const hash = await hashPassword('correct')
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
yarn test __tests__/lib/password.test.ts
```
Expected: `Cannot find module '@/lib/password'`

- [ ] **Step 3: Implement**

```ts
// lib/password.ts
import bcrypt from 'bcryptjs'

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
```

- [ ] **Step 4: Run tests**

```bash
yarn test __tests__/lib/password.test.ts
```
Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add lib/password.ts __tests__/lib/password.test.ts
git commit -m "feat: add password hash/verify utility"
```

---

## Task 4: lib/token.ts

**Files:**
- Create: `lib/token.ts`
- Create: `__tests__/lib/token.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/lib/token.test.ts
import { generateToken, isTokenExpired, TOKEN_TTL_MS } from '@/lib/token'

describe('token', () => {
  it('generates a non-empty string', () => {
    const t = generateToken()
    expect(typeof t).toBe('string')
    expect(t.length).toBeGreaterThan(20)
  })

  it('generates unique tokens', () => {
    expect(generateToken()).not.toBe(generateToken())
  })

  it('is not expired when fresh', () => {
    const expiry = new Date(Date.now() + TOKEN_TTL_MS)
    expect(isTokenExpired(expiry)).toBe(false)
  })

  it('is expired when past', () => {
    const expiry = new Date(Date.now() - 1000)
    expect(isTokenExpired(expiry)).toBe(true)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
yarn test __tests__/lib/token.test.ts
```
Expected: `Cannot find module '@/lib/token'`

- [ ] **Step 3: Implement**

```ts
// lib/token.ts
import { randomUUID } from 'crypto'

/** 72 hours in milliseconds */
export const TOKEN_TTL_MS = 72 * 60 * 60 * 1000

export function generateToken(): string {
  return randomUUID()
}

export function tokenExpiresAt(): Date {
  return new Date(Date.now() + TOKEN_TTL_MS)
}

export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt
}
```

- [ ] **Step 4: Run tests**

```bash
yarn test __tests__/lib/token.test.ts
```
Expected: `4 passed`

- [ ] **Step 5: Commit**

```bash
git add lib/token.ts __tests__/lib/token.test.ts
git commit -m "feat: add magic link token utility"
```

---

## Task 5: lib/anonymous-id.ts

**Files:**
- Create: `lib/anonymous-id.ts`
- Create: `__tests__/lib/anonymous-id.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/lib/anonymous-id.test.ts
import { buildAnonymousId, nextAnonymousId } from '@/lib/anonymous-id'

describe('anonymousId', () => {
  it('formats count as P-001', () => {
    expect(buildAnonymousId(1)).toBe('P-001')
    expect(buildAnonymousId(12)).toBe('P-012')
    expect(buildAnonymousId(100)).toBe('P-100')
  })

  it('increments from 0 existing patients', () => {
    expect(nextAnonymousId(0)).toBe('P-001')
  })

  it('increments from N existing patients', () => {
    expect(nextAnonymousId(5)).toBe('P-006')
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
yarn test __tests__/lib/anonymous-id.test.ts
```
Expected: `Cannot find module '@/lib/anonymous-id'`

- [ ] **Step 3: Implement**

```ts
// lib/anonymous-id.ts

export function buildAnonymousId(n: number): string {
  return `P-${String(n).padStart(3, '0')}`
}

/** Pass the current count of patients for this psychologist. */
export function nextAnonymousId(currentCount: number): string {
  return buildAnonymousId(currentCount + 1)
}
```

- [ ] **Step 4: Run tests**

```bash
yarn test __tests__/lib/anonymous-id.test.ts
```
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add lib/anonymous-id.ts __tests__/lib/anonymous-id.test.ts
git commit -m "feat: add per-psychologist anonymous patient ID generator"
```

---

## Task 6: lib/alert-rules.ts

**Files:**
- Create: `lib/alert-rules.ts`
- Create: `__tests__/lib/alert-rules.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/lib/alert-rules.test.ts
import { computeAlerts, type AlertResult } from '@/lib/alert-rules'

describe('computeAlerts', () => {
  it('returns critical for PHQ-9 >= 20', () => {
    const result = computeAlerts('PHQ9', 20, {})
    expect(result.severity).toBe('critical')
  })

  it('returns high for GAD-7 >= 15', () => {
    const result = computeAlerts('GAD7', 15, {})
    expect(result.severity).toBe('high')
  })

  it('returns critical for BDI-II >= 29', () => {
    const result = computeAlerts('BDI2', 29, {})
    expect(result.severity).toBe('critical')
  })

  it('returns moderate for PHQ-9 10-19', () => {
    const result = computeAlerts('PHQ9', 14, {})
    expect(result.severity).toBe('moderate')
  })

  it('returns null severity when below threshold', () => {
    const result = computeAlerts('PHQ9', 4, {})
    expect(result.severity).toBeNull()
  })

  it('flags suicidal ideation when PHQ-9 item 9 > 0', () => {
    const result = computeAlerts('PHQ9', 22, { '9': 1 })
    expect(result.suicidalIdeation).toBe(true)
  })

  it('does not flag suicidal ideation when item 9 is 0', () => {
    const result = computeAlerts('PHQ9', 10, { '9': 0 })
    expect(result.suicidalIdeation).toBe(false)
  })

  it('does not flag suicidal ideation for non-PHQ9 scales', () => {
    const result = computeAlerts('GAD7', 18, { '9': 1 })
    expect(result.suicidalIdeation).toBe(false)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
yarn test __tests__/lib/alert-rules.test.ts
```
Expected: `Cannot find module '@/lib/alert-rules'`

- [ ] **Step 3: Implement**

```ts
// lib/alert-rules.ts

export type AlertSeverity = 'critical' | 'high' | 'moderate' | null

export interface AlertResult {
  severity: AlertSeverity
  suicidalIdeation: boolean
}

type Scale = 'PHQ9' | 'BDI2' | 'GAD7'

export function computeAlerts(
  scale: Scale,
  totalScore: number,
  itemScores: Record<string, number>
): AlertResult {
  const severity = getSeverity(scale, totalScore)
  const suicidalIdeation =
    scale === 'PHQ9' && (itemScores['9'] ?? 0) > 0

  return { severity, suicidalIdeation }
}

function getSeverity(scale: Scale, score: number): AlertSeverity {
  if (scale === 'PHQ9') {
    if (score >= 20) return 'critical'
    if (score >= 15) return 'high'
    if (score >= 10) return 'moderate'
    return null
  }
  if (scale === 'BDI2') {
    if (score >= 29) return 'critical'
    if (score >= 20) return 'high'
    if (score >= 14) return 'moderate'
    return null
  }
  if (scale === 'GAD7') {
    if (score >= 15) return 'critical'
    if (score >= 10) return 'high'
    if (score >= 5) return 'moderate'
    return null
  }
  return null
}
```

- [ ] **Step 4: Run tests**

```bash
yarn test __tests__/lib/alert-rules.test.ts
```
Expected: `8 passed`

- [ ] **Step 5: Commit**

```bash
git add lib/alert-rules.ts __tests__/lib/alert-rules.test.ts
git commit -m "feat: add alert rules engine with suicidal ideation flag"
```

---

## Task 7: Update auth (Credentials + JWT)

**Files:**
- Modify: `lib/auth.ts`
- Modify: `app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Replace lib/auth.ts**

```ts
// lib/auth.ts
import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@auth/prisma-adapter'
import prisma from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.passwordHash) return null
        if (!user.emailVerified) throw new Error('EMAIL_NOT_VERIFIED')

        const valid = await verifyPassword(credentials.password, user.passwordHash)
        if (!valid) return null

        return { id: user.id, email: user.email!, name: user.name }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (session.user) session.user.id = token.id as string
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
```

- [ ] **Step 2: Update the NextAuth route handler**

```ts
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

- [ ] **Step 3: Extend NextAuth session type**

In `types/next-auth.d.ts`, ensure the `id` field is declared:

```ts
// types/next-auth.d.ts
import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/auth.ts app/api/auth/\[...nextauth\]/route.ts types/next-auth.d.ts
git commit -m "feat: switch auth to credentials provider with JWT sessions"
```

---

## Task 8: Signup API

**Files:**
- Create: `app/api/auth/signup/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/auth/signup/route.ts
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

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  }

  const passwordHash = await hashPassword(password)
  const verificationToken = generateToken()
  const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      verificationToken,
      verificationTokenExpiry,
    },
  })

  // In production, send an email here. For now, return the token so it can
  // be copy-pasted during development.
  const verifyUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${verificationToken}`

  return NextResponse.json({ message: 'Account created. Please verify your email.', verifyUrl }, { status: 201 })
}
```

- [ ] **Step 2: Manually test via curl**

```bash
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Dr Test","email":"test@example.com","password":"password123"}'
```
Expected: `{"message":"Account created...","verifyUrl":"http://localhost:3000/auth/verify-email?token=..."}`

- [ ] **Step 3: Commit**

```bash
git add app/api/auth/signup/route.ts
git commit -m "feat: add signup API with email verification token"
```

---

## Task 9: Email verification API

**Files:**
- Create: `app/api/auth/verify-email/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { verificationToken: token } })

  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  if (user.verificationTokenExpiry && new Date() > user.verificationTokenExpiry) {
    return NextResponse.json({ error: 'Token expired' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      verificationToken: null,
      verificationTokenExpiry: null,
    },
  })

  // Redirect to sign-in with a success flag
  return NextResponse.redirect(new URL('/auth/signin?verified=1', req.url))
}
```

- [ ] **Step 2: Test via curl (use token from Task 8 test)**

```bash
curl -L "http://localhost:3000/api/auth/verify-email?token=<token-from-signup>"
```
Expected: Redirects to `/auth/signin?verified=1`

- [ ] **Step 3: Commit**

```bash
git add app/api/auth/verify-email/route.ts
git commit -m "feat: add email verification API"
```

---

## Task 10: Auth pages UI (signup + signin + verify-email)

**Files:**
- Create: `app/auth/signup/page.tsx`
- Create: `app/auth/signin/page.tsx`
- Create: `app/auth/verify-email/page.tsx`

- [ ] **Step 1: Create signup page**

```tsx
// app/auth/signup/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type FormData = z.infer<typeof schema>

export default function SignupPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setServerError(null)
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) {
      setServerError(json.error)
      return
    }
    setVerifyUrl(json.verifyUrl)
  }

  if (verifyUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              A verification link has been sent. During development, click below:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href={verifyUrl} className="text-indigo-600 underline text-sm break-all">{verifyUrl}</a>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create your APAS account</CardTitle>
          <CardDescription>Enter your details to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" {...register('name')} placeholder="Dr. Jane Smith" />
              {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} placeholder="you@clinic.com" />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
            </div>
            {serverError && <p className="text-sm text-red-500">{serverError}</p>}
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </Button>
            <p className="text-sm text-center text-slate-500">
              Already have an account?{' '}
              <a href="/auth/signin" className="text-indigo-600 hover:underline">Sign in</a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Create signin page**

```tsx
// app/auth/signin/page.tsx
'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
type FormData = z.infer<typeof schema>

export default function SigninPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const verified = searchParams.get('verified') === '1'
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setError(null)
    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    })
    if (result?.error === 'EMAIL_NOT_VERIFIED') {
      setError('Please verify your email before signing in.')
      return
    }
    if (result?.error) {
      setError('Invalid email or password.')
      return
    }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Sign in to APAS</CardTitle>
          <CardDescription>
            {verified ? '✓ Email verified. You can now sign in.' : 'Enter your credentials to access your dashboard'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" {...register('password')} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
            <p className="text-sm text-center text-slate-500">
              No account?{' '}
              <a href="/auth/signup" className="text-indigo-600 hover:underline">Create one</a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Create verify-email page (handles redirect from API)**

```tsx
// app/auth/verify-email/page.tsx
export default function VerifyEmailPage() {
  // This page is only shown if someone navigates here directly without a token.
  // The actual verification is handled by /api/auth/verify-email?token=...
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold">Verifying your email…</h1>
        <p className="text-slate-500 text-sm">If nothing happens, check your verification link.</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Start dev server and manually test signup → verify → signin flow**

```bash
yarn dev
```
1. Go to `http://localhost:3000/auth/signup` — fill form, submit
2. Click the `verifyUrl` shown on screen
3. Should redirect to `/auth/signin?verified=1`
4. Sign in — should redirect to `/dashboard` (404 for now, that's fine)

- [ ] **Step 5: Commit**

```bash
git add app/auth/
git commit -m "feat: add signup, signin, verify-email auth pages"
```

---

## Task 11: Protected dashboard layout + sidebar

**Files:**
- Create: `app/(dashboard)/layout.tsx`
- Create: `components/layout/sidebar.tsx`
- Modify: `app/page.tsx` (redirect to /dashboard)

- [ ] **Step 1: Create sidebar component**

```tsx
// components/layout/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { LayoutDashboard, Users, LogOut } from 'lucide-react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/patients', label: 'Patients', icon: Users },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <aside className="w-60 min-h-screen flex flex-col" style={{ backgroundColor: '#0F172A' }}>
      <div className="px-6 py-5 border-b border-slate-700">
        <span className="text-white font-semibold text-lg tracking-tight">APAS</span>
        <p className="text-slate-400 text-xs mt-0.5">Clinical Overwatch</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-slate-700">
        <p className="text-slate-300 text-sm font-medium truncate">{session?.user?.name}</p>
        <p className="text-slate-500 text-xs mb-3 truncate">{session?.user?.email}</p>
        <button
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-xs"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Create protected layout**

```tsx
// app/(dashboard)/layout.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Sidebar } from '@/components/layout/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Replace app/page.tsx with a redirect**

```tsx
// app/page.tsx
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/dashboard')
}
```

- [ ] **Step 4: Verify auth gate**

```bash
yarn dev
```
Navigate to `http://localhost:3000` — should redirect to `/auth/signin`. After signing in, should see the sidebar layout with an empty main area.

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/layout.tsx components/layout/sidebar.tsx app/page.tsx
git commit -m "feat: add protected dashboard layout with sidebar"
```

---

## Task 12: Patient API routes

**Files:**
- Create: `app/api/patients/route.ts`
- Create: `app/api/patients/[id]/route.ts`

- [ ] **Step 1: Create patients list + create route**

```ts
// app/api/patients/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { nextAnonymousId } from '@/lib/anonymous-id'

export async function GET(req: NextRequest) {
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
```

- [ ] **Step 2: Create single patient route**

```ts
// app/api/patients/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, psychologistId: session.user.id },
    include: {
      assessmentSessions: {
        include: { response: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(patient)
}
```

- [ ] **Step 3: Manually test**

```bash
# Sign in first to get a session cookie, then:
curl http://localhost:3000/api/patients \
  -H "Cookie: next-auth.session-token=<your-token>"
```
Expected: `[]` (empty array — no patients yet)

- [ ] **Step 4: Commit**

```bash
git add app/api/patients/
git commit -m "feat: add patient list and create API routes"
```

---

## Task 13: Assessment session API routes

**Files:**
- Create: `app/api/patients/[id]/sessions/route.ts`
- Create: `app/api/patients/[id]/sessions/[sessionId]/route.ts`

- [ ] **Step 1: Create sessions list + create route**

```ts
// app/api/patients/[id]/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { generateToken, tokenExpiresAt } from '@/lib/token'

const CreateSessionSchema = z.object({
  scale: z.enum(['PHQ9', 'BDI2', 'GAD7']),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify patient belongs to this psychologist
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
      scale: parsed.data.scale,
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
```

- [ ] **Step 2: Create single session route**

```ts
// app/api/patients/[id]/sessions/[sessionId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const assessmentSession = await prisma.assessmentSession.findFirst({
    where: {
      id: params.sessionId,
      patientId: params.id,
      psychologistId: session.user.id,
    },
    include: { response: true, patient: true },
  })

  if (!assessmentSession) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(assessmentSession)
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/patients/\[id\]/sessions/
git commit -m "feat: add assessment session create and retrieve API"
```

---

## Task 14: Patient questionnaire API (/fill/[token])

**Files:**
- Create: `app/api/fill/[token]/route.ts`

- [ ] **Step 1: Create the route**

```ts
// app/api/fill/[token]/route.ts
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
```

- [ ] **Step 2: Commit**

```bash
git add app/api/fill/
git commit -m "feat: add patient questionnaire token validation and submission API"
```

---

## Task 15: Patient questionnaire UI (/fill/[token])

**Files:**
- Create: `app/fill/[token]/page.tsx`
- Create: `app/fill/[token]/complete/page.tsx`
- Create: `components/questionnaire/questionnaire-form.tsx`

- [ ] **Step 1: Create questionnaire form component**

```tsx
// components/questionnaire/questionnaire-form.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

interface Item {
  number: number
  text: string
  options: { label: string; value: number }[]
}

const SCALE_OPTIONS = [
  { label: 'Not at all', value: 0 },
  { label: 'Several days', value: 1 },
  { label: 'More than half the days', value: 2 },
  { label: 'Nearly every day', value: 3 },
]

const PHQ9_ITEMS: Item[] = [
  { number: 1, text: 'Little interest or pleasure in doing things', options: SCALE_OPTIONS },
  { number: 2, text: 'Feeling down, depressed, or hopeless', options: SCALE_OPTIONS },
  { number: 3, text: 'Trouble falling or staying asleep, or sleeping too much', options: SCALE_OPTIONS },
  { number: 4, text: 'Feeling tired or having little energy', options: SCALE_OPTIONS },
  { number: 5, text: 'Poor appetite or overeating', options: SCALE_OPTIONS },
  { number: 6, text: 'Feeling bad about yourself — or that you are a failure', options: SCALE_OPTIONS },
  { number: 7, text: 'Trouble concentrating on things', options: SCALE_OPTIONS },
  { number: 8, text: 'Moving or speaking so slowly that other people could have noticed', options: SCALE_OPTIONS },
  { number: 9, text: 'Thoughts that you would be better off dead, or of hurting yourself', options: SCALE_OPTIONS },
]

const GAD7_ITEMS: Item[] = [
  { number: 1, text: 'Feeling nervous, anxious, or on edge', options: SCALE_OPTIONS },
  { number: 2, text: 'Not being able to stop or control worrying', options: SCALE_OPTIONS },
  { number: 3, text: 'Worrying too much about different things', options: SCALE_OPTIONS },
  { number: 4, text: 'Trouble relaxing', options: SCALE_OPTIONS },
  { number: 5, text: 'Being so restless that it is hard to sit still', options: SCALE_OPTIONS },
  { number: 6, text: 'Becoming easily annoyed or irritable', options: SCALE_OPTIONS },
  { number: 7, text: 'Feeling afraid as if something awful might happen', options: SCALE_OPTIONS },
]

const BDI2_OPTIONS = [
  { label: '0 — No sadness', value: 0 },
  { label: '1 — I feel sad much of the time', value: 1 },
  { label: '2 — I am sad all the time', value: 2 },
  { label: '3 — I am so sad or unhappy that I cannot stand it', value: 3 },
]

const BDI2_ITEMS: Item[] = Array.from({ length: 21 }, (_, i) => ({
  number: i + 1,
  text: `BDI-II Item ${i + 1}`,
  options: BDI2_OPTIONS,
}))

const SCALE_ITEMS: Record<string, Item[]> = {
  PHQ9: PHQ9_ITEMS,
  GAD7: GAD7_ITEMS,
  BDI2: BDI2_ITEMS,
}

const SCALE_LABELS: Record<string, string> = {
  PHQ9: 'Patient Health Questionnaire (PHQ-9)',
  GAD7: 'Generalised Anxiety Disorder Assessment (GAD-7)',
  BDI2: 'Beck Depression Inventory (BDI-II)',
}

interface Props {
  scale: string
  token: string
}

export function QuestionnaireForm({ scale, token }: Props) {
  const router = useRouter()
  const items = SCALE_ITEMS[scale] ?? []
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allAnswered = items.every(item => answers[item.number] !== undefined)

  async function onSubmit() {
    setSubmitting(true)
    setError(null)
    const itemScores: Record<string, number> = {}
    items.forEach(item => { itemScores[String(item.number)] = answers[item.number] })

    const res = await fetch(`/api/fill/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemScores }),
    })

    if (!res.ok) {
      setError('Something went wrong. Please try again or contact your clinician.')
      setSubmitting(false)
      return
    }
    router.push(`/fill/${token}/complete`)
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{SCALE_LABELS[scale]}</h1>
        <p className="text-slate-500 text-sm mt-1">
          Over the last 2 weeks, how often have you been bothered by the following?
        </p>
      </div>

      {items.map(item => (
        <div key={item.number} className="border border-slate-200 rounded-lg p-4 space-y-3 bg-white">
          <p className="text-sm font-medium text-slate-800">
            {item.number}. {item.text}
          </p>
          <RadioGroup
            value={answers[item.number] !== undefined ? String(answers[item.number]) : ''}
            onValueChange={val => setAnswers(prev => ({ ...prev, [item.number]: Number(val) }))}
            className="space-y-1"
          >
            {item.options.map(opt => (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem value={String(opt.value)} id={`item-${item.number}-${opt.value}`} />
                <Label htmlFor={`item-${item.number}-${opt.value}`} className="text-sm text-slate-600 cursor-pointer">
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      ))}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button
        onClick={onSubmit}
        disabled={!allAnswered || submitting}
        className="w-full bg-indigo-600 hover:bg-indigo-700"
      >
        {submitting ? 'Submitting…' : 'Submit'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Create /fill/[token] page**

```tsx
// app/fill/[token]/page.tsx
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
```

- [ ] **Step 3: Create /fill/[token]/complete page**

```tsx
// app/fill/[token]/complete/page.tsx
export default function CompletePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-3 max-w-sm px-4">
        <div className="text-4xl">✓</div>
        <h1 className="text-xl font-semibold text-slate-800">Thank you</h1>
        <p className="text-slate-500 text-sm">
          Your responses have been recorded. You can close this window.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: End-to-end test the questionnaire flow**

1. Sign in as a psychologist
2. `POST /api/patients` to create a patient
3. `POST /api/patients/:id/sessions` with `{"scale":"PHQ9"}` to get a `fillUrl`
4. Open the `fillUrl` in a browser — questionnaire should appear
5. Answer all questions and submit — should redirect to `/fill/.../complete`
6. `GET /api/patients/:id/sessions` — session status should be `COMPLETED`

- [ ] **Step 5: Commit**

```bash
git add app/fill/ components/questionnaire/
git commit -m "feat: add patient-facing questionnaire form with magic link auth"
```

---

## Task 16: Dashboard stat cards + alert feed components

**Files:**
- Create: `components/dashboard/stat-cards.tsx`
- Create: `components/dashboard/alert-feed.tsx`

- [ ] **Step 1: Create stat cards**

```tsx
// components/dashboard/stat-cards.tsx
import { Users, Bell, Clock, Activity } from 'lucide-react'

interface Stats {
  totalPatients: number
  openAlerts: number
  criticalAlerts: number
  pendingSessions: number
}

export function StatCards({ stats }: { stats: Stats }) {
  const cards = [
    { label: 'Active Patients', value: stats.totalPatients, icon: Users, color: 'text-indigo-600' },
    {
      label: 'Open Alerts',
      value: `${stats.openAlerts} (${stats.criticalAlerts} Critical)`,
      icon: Bell,
      color: 'text-red-500',
    },
    { label: 'Awaiting Response', value: stats.pendingSessions, icon: Clock, color: 'text-amber-500' },
    {
      label: 'Avg Caseload Risk',
      value: stats.criticalAlerts > 0 ? 'High' : 'Moderate',
      icon: Activity,
      color: 'text-orange-500',
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-4">
      {cards.map(card => (
        <div key={card.label} className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-slate-500 font-medium">{card.label}</p>
            <card.icon size={16} className={card.color} />
          </div>
          <p className="text-2xl font-semibold text-slate-900">{card.value}</p>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create alert feed**

```tsx
// components/dashboard/alert-feed.tsx
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { computeAlerts } from '@/lib/alert-rules'

interface Session {
  id: string
  scale: string
  patientId: string
  patient: { anonymousId: string }
  response: { totalScore: number; itemScores: Record<string, number> } | null
}

const SEVERITY_STYLES = {
  critical: { badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  high: { badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  moderate: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
}

export function AlertFeed({ sessions }: { sessions: Session[] }) {
  const alerts = sessions
    .filter(s => s.response)
    .map(s => {
      const itemScores = s.response!.itemScores as Record<string, number>
      const result = computeAlerts(s.scale as 'PHQ9' | 'BDI2' | 'GAD7', s.response!.totalScore, itemScores)
      return { session: s, ...result }
    })
    .filter(a => a.severity !== null)
    .sort((a, b) => {
      const order = { critical: 0, high: 1, moderate: 2 }
      return order[a.severity!] - order[b.severity!]
    })

  if (alerts.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400 text-sm">
        No open alerts
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">Open Alerts</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {alerts.map(({ session, severity, suicidalIdeation }) => {
          const styles = SEVERITY_STYLES[severity!]
          return (
            <div key={session.id} className="px-5 py-3 flex items-center gap-4">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${styles.dot}`} />
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles.badge}`}>
                {severity === 'critical' ? 'Critical' : severity === 'high' ? 'High' : 'Moderate'}
              </span>
              <span className="text-sm font-medium text-slate-700">{session.patient.anonymousId}</span>
              <span className="text-sm text-slate-500">{session.scale} · Score {session.response?.totalScore}</span>
              {suicidalIdeation && (
                <span className="flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full">
                  <AlertTriangle size={12} /> Suicidal ideation endorsed
                </span>
              )}
              <Link
                href={`/patients/${session.patientId}/sessions/${session.id}`}
                className="ml-auto text-xs text-indigo-600 hover:underline"
              >
                View →
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard/
git commit -m "feat: add dashboard stat cards and alert feed components"
```

---

## Task 17: Dashboard page

**Files:**
- Create: `app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Create the dashboard page**

```tsx
// app/(dashboard)/dashboard/page.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { StatCards } from '@/components/dashboard/stat-cards'
import { AlertFeed } from '@/components/dashboard/alert-feed'
import { computeAlerts } from '@/lib/alert-rules'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  const patients = await prisma.patient.findMany({
    where: { psychologistId: session.user.id },
    include: {
      assessmentSessions: {
        include: { response: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  const allSessions = patients.flatMap(p =>
    p.assessmentSessions.map(s => ({ ...s, patient: { anonymousId: p.anonymousId } }))
  )

  const completedSessions = allSessions.filter(s => s.status === 'COMPLETED' && s.response)
  const pendingSessions = allSessions.filter(s => s.status === 'PENDING').length

  const alertCounts = completedSessions.reduce(
    (acc, s) => {
      const itemScores = s.response!.itemScores as Record<string, number>
      const { severity } = computeAlerts(s.scale as 'PHQ9' | 'BDI2' | 'GAD7', s.response!.totalScore, itemScores)
      if (severity === 'critical') acc.critical++
      if (severity) acc.open++
      return acc
    },
    { open: 0, critical: 0 }
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Welcome back, {session.user.name}</p>
      </div>

      <StatCards
        stats={{
          totalPatients: patients.length,
          openAlerts: alertCounts.open,
          criticalAlerts: alertCounts.critical,
          pendingSessions,
        }}
      />

      <AlertFeed sessions={completedSessions as any} />

      {/* Caseload table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Caseload</h2>
          <Link href="/patients" className="text-sm text-indigo-600 hover:underline">
            Manage patients →
          </Link>
        </div>
        {patients.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No patients yet.{' '}
            <Link href="/patients" className="text-indigo-600 hover:underline">
              Add your first patient
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['ID', 'Scale', 'Last Score', 'Sessions', 'Action'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map(p => {
                const completed = p.assessmentSessions.filter(s => s.response)
                const latest = completed.at(-1)
                return (
                  <tr key={p.id}>
                    <td className="px-5 py-3 font-medium text-slate-800">{p.anonymousId}</td>
                    <td className="px-5 py-3 text-slate-500">{latest?.scale ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-800">{latest?.response?.totalScore ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-500">{completed.length}</td>
                    <td className="px-5 py-3">
                      <Link href={`/patients/${p.id}`} className="text-indigo-600 text-xs hover:underline">
                        View Profile
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify dashboard renders**

```bash
yarn dev
```
Sign in and navigate to `/dashboard`. Should show stat cards (all zeros initially), empty alert feed, empty caseload, and "Add your first patient" prompt.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/dashboard/
git commit -m "feat: add dynamic dashboard page with real stats and alerts"
```

---

## Task 18: Patients list page + new patient dialog

**Files:**
- Create: `app/(dashboard)/patients/page.tsx`
- Create: `components/patients/patient-table.tsx`
- Create: `components/patients/new-patient-dialog.tsx`

- [ ] **Step 1: Create new patient dialog**

```tsx
// components/patients/new-patient-dialog.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'

export function NewPatientDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName }),
    })
    setLoading(false)
    if (!res.ok) { setError('Failed to create patient'); return }
    setOpen(false)
    setDisplayName('')
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-indigo-600 hover:bg-indigo-700">
          <Plus size={16} className="mr-1" /> New Patient
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Patient</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. John D. or Patient A"
              required
            />
            <p className="text-xs text-slate-400">No PII — use initials or a pseudonym</p>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={loading || !displayName} className="w-full bg-indigo-600 hover:bg-indigo-700">
            {loading ? 'Creating…' : 'Create patient'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Create patients list page**

```tsx
// app/(dashboard)/patients/page.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { NewPatientDialog } from '@/components/patients/new-patient-dialog'

export default async function PatientsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Patients</h1>
          <p className="text-slate-500 text-sm mt-1">{patients.length} patient{patients.length !== 1 ? 's' : ''}</p>
        </div>
        <NewPatientDialog />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {patients.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No patients yet. Click "New Patient" to add one.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['ID', 'Name', 'Sessions', 'Last Score', 'Added'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patients.map(p => {
                const completed = p.assessmentSessions.filter(s => s.response)
                const latest = completed[0]
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{p.anonymousId}</td>
                    <td className="px-5 py-3 text-slate-600">{p.displayName}</td>
                    <td className="px-5 py-3 text-slate-500">{completed.length}</td>
                    <td className="px-5 py-3 text-slate-800">{latest?.response?.totalScore ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-400">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/patients/${p.id}`} className="text-indigo-600 text-xs hover:underline">
                        View →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify patient creation works**

```bash
yarn dev
```
1. Go to `/patients` — see empty state
2. Click "New Patient" — fill display name — submit
3. Patient appears in the table with P-001 ID
4. Click "View →" — should 404 (profile page not built yet, that's fine)

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/patients/ components/patients/
git commit -m "feat: add patients list page with new patient dialog"
```

---

## Task 19: Patient profile page + new session dialog

**Files:**
- Create: `app/(dashboard)/patients/[id]/page.tsx`
- Create: `components/sessions/new-session-dialog.tsx`
- Create: `components/sessions/session-chart.tsx`

- [ ] **Step 1: Create new session dialog**

```tsx
// components/sessions/new-session-dialog.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Copy, Check } from 'lucide-react'

export function NewSessionDialog({ patientId }: { patientId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [scale, setScale] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [fillUrl, setFillUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onCreate() {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/patients/${patientId}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scale }),
    })
    setLoading(false)
    if (!res.ok) { setError('Failed to create session'); return }
    const data = await res.json()
    setFillUrl(data.fillUrl)
    router.refresh()
  }

  function onCopy() {
    navigator.clipboard.writeText(fillUrl!)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function onClose() {
    setOpen(false)
    setFillUrl(null)
    setScale('')
  }

  return (
    <Dialog open={open} onOpenChange={val => { if (!val) onClose(); else setOpen(true) }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus size={14} className="mr-1" /> New Session
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{fillUrl ? 'Session created' : 'New Assessment Session'}</DialogTitle>
        </DialogHeader>

        {fillUrl ? (
          <div className="space-y-4 mt-2">
            <p className="text-sm text-slate-600">
              Copy this link and send it to the patient. It expires in 72 hours and can only be used once.
            </p>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
              <span className="text-xs text-slate-600 flex-1 truncate">{fillUrl}</span>
              <button onClick={onCopy} className="text-indigo-600 hover:text-indigo-800 flex-shrink-0">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <Button onClick={onClose} variant="outline" className="w-full">Done</Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Scale</Label>
              <Select value={scale} onValueChange={setScale}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a scale…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHQ9">PHQ-9 (Depression)</SelectItem>
                  <SelectItem value="GAD7">GAD-7 (Anxiety)</SelectItem>
                  <SelectItem value="BDI2">BDI-II (Depression)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              onClick={onCreate}
              disabled={!scale || loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? 'Creating…' : 'Create & get link'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Create session score chart**

```tsx
// components/sessions/session-chart.tsx
'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'

interface Props {
  scale: string
  data: { session: number; score: number }[]
}

const THRESHOLDS: Record<string, number> = { PHQ9: 20, BDI2: 29, GAD7: 15 }

export function SessionChart({ scale, data }: Props) {
  const threshold = THRESHOLDS[scale]
  const trend = data.length >= 2
    ? data.at(-1)!.score > data.at(0)!.score ? 'worsening'
    : data.at(-1)!.score < data.at(0)!.score ? 'improving'
    : 'stable'
    : 'stable'

  const lineColor = trend === 'worsening' ? '#EF4444' : trend === 'improving' ? '#22C55E' : '#94A3B8'

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
        <XAxis dataKey="session" tick={{ fontSize: 12 }} tickFormatter={v => `Session ${v}`} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(v: number) => [`Score: ${v}`, '']} />
        {threshold && (
          <ReferenceLine y={threshold} stroke="#EF4444" strokeDasharray="4 4" label={{ value: 'Critical', fontSize: 11, fill: '#EF4444' }} />
        )}
        <Line type="monotone" dataKey="score" stroke={lineColor} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 3: Create patient profile page**

```tsx
// app/(dashboard)/patients/[id]/page.tsx
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { SessionChart } from '@/components/sessions/session-chart'
import { NewSessionDialog } from '@/components/sessions/new-session-dialog'
import { computeAlerts } from '@/lib/alert-rules'

export default async function PatientProfilePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  const patient = await prisma.patient.findFirst({
    where: { id: params.id, psychologistId: session.user.id },
    include: {
      assessmentSessions: {
        include: { response: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!patient) notFound()

  const completed = patient.assessmentSessions.filter(s => s.response)
  const pending = patient.assessmentSessions.filter(s => s.status === 'PENDING')
  const latest = completed.at(-1)

  const chartData = completed.map((s, i) => ({
    session: i + 1,
    score: s.response!.totalScore,
  }))

  const latestAlerts = latest?.response
    ? computeAlerts(
        latest.scale as 'PHQ9' | 'BDI2' | 'GAD7',
        latest.response.totalScore,
        latest.response.itemScores as Record<string, number>
      )
    : null

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">{patient.anonymousId}</h1>
            <span className="text-sm text-slate-400">{patient.displayName}</span>
            {latestAlerts?.severity === 'critical' && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">Critical</span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-1">{completed.length} completed session{completed.length !== 1 ? 's' : ''}</p>
        </div>
        <NewSessionDialog patientId={patient.id} />
      </div>

      {latestAlerts?.suicidalIdeation && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 font-medium">
          ⚠ Suicidal ideation endorsed — immediate clinical attention required
        </div>
      )}

      {completed.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Score History — {latest?.scale}</h2>
          <SessionChart scale={latest!.scale} data={chartData} />
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Sessions</h2>
        </div>
        {patient.assessmentSessions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No sessions yet. Click "New Session" to create one.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['#', 'Scale', 'Status', 'Score', 'Severity', 'Action'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {patient.assessmentSessions.map((s, i) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-slate-500">{i + 1}</td>
                  <td className="px-5 py-3 text-slate-700">{s.scale}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      s.status === 'COMPLETED' ? 'bg-green-100 text-green-700'
                      : s.status === 'PENDING' ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-500'
                    }`}>{s.status}</span>
                  </td>
                  <td className="px-5 py-3 text-slate-800">{s.response?.totalScore ?? '—'}</td>
                  <td className="px-5 py-3 text-slate-500">{s.response?.severity ?? '—'}</td>
                  <td className="px-5 py-3">
                    {s.status === 'COMPLETED' && (
                      <Link href={`/patients/${patient.id}/sessions/${s.id}`} className="text-indigo-600 text-xs hover:underline">
                        View AI Summary →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Test the full patient flow**

1. Go to `/patients` — create a patient
2. Click "View →" on patient — profile page appears
3. Click "New Session" — select PHQ-9 — get magic link
4. Open the magic link — fill questionnaire — submit
5. Return to patient profile — session shows as COMPLETED with score

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/patients/\[id\]/ components/sessions/
git commit -m "feat: add patient profile page with session chart and new session dialog"
```

---

## Task 20: Session detail + AI narrative

**Files:**
- Create: `app/(dashboard)/patients/[id]/sessions/[sessionId]/page.tsx`
- Modify: `app/api/narrative/route.ts`

- [ ] **Step 1: Update narrative API to accept payload from client**

The existing `app/api/narrative/route.ts` already proxies to Claude correctly — no change needed. It accepts a raw body and forwards it to `https://api.anthropic.com/v1/messages`.

- [ ] **Step 2: Create session detail page**

```tsx
// app/(dashboard)/patients/[id]/sessions/[sessionId]/page.tsx
import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { computeAlerts } from '@/lib/alert-rules'
import { NarrativePanel } from '@/components/sessions/narrative-panel'

export default async function SessionDetailPage({
  params,
}: {
  params: { id: string; sessionId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin')

  const assessmentSession = await prisma.assessmentSession.findFirst({
    where: {
      id: params.sessionId,
      patientId: params.id,
      psychologistId: session.user.id,
    },
    include: { response: true, patient: true },
  })

  if (!assessmentSession || !assessmentSession.response) notFound()

  const itemScores = assessmentSession.response.itemScores as Record<string, number>
  const alerts = computeAlerts(
    assessmentSession.scale as 'PHQ9' | 'BDI2' | 'GAD7',
    assessmentSession.response.totalScore,
    itemScores
  )

  // Build safe clinical payload for AI — no PII
  const clinicalPayload = {
    scale: assessmentSession.scale,
    totalScore: assessmentSession.response.totalScore,
    severity: assessmentSession.response.severity,
    itemScores,
    suicidalIdeation: alerts.suicidalIdeation,
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          {assessmentSession.patient.anonymousId} — Session {assessmentSession.scale}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Completed {new Date(assessmentSession.response.completedAt).toLocaleDateString()}
        </p>
      </div>

      {alerts.suicidalIdeation && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 font-semibold">
          ⚠ CRITICAL — Suicidal ideation endorsed. Immediate clinical attention required.
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">Score Summary</h2>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-3xl font-bold text-slate-900">{assessmentSession.response.totalScore}</p>
            <p className="text-xs text-slate-400 mt-0.5">Total score</p>
          </div>
          <div>
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${
              alerts.severity === 'critical' ? 'bg-red-100 text-red-700'
              : alerts.severity === 'high' ? 'bg-orange-100 text-orange-700'
              : alerts.severity === 'moderate' ? 'bg-amber-100 text-amber-700'
              : 'bg-green-100 text-green-700'
            }`}>
              {assessmentSession.response.severity}
            </span>
          </div>
        </div>
        <table className="w-full text-xs mt-2">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-1 text-left text-slate-400 font-medium">Item</th>
              <th className="py-1 text-left text-slate-400 font-medium">Score</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(itemScores).map(([item, score]) => (
              <tr key={item} className="border-b border-slate-50">
                <td className="py-1 text-slate-600">Item {item}</td>
                <td className="py-1 text-slate-800 font-medium">{score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NarrativePanel clinicalPayload={clinicalPayload} />

      <p className="text-xs text-slate-400 italic">
        AI-generated clinical summary. For clinician review and decision support only.
        Not a substitute for professional clinical judgment.
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Create NarrativePanel client component**

```tsx
// components/sessions/narrative-panel.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react'

const SCALE_NAMES: Record<string, string> = { PHQ9: 'PHQ-9', BDI2: 'BDI-II', GAD7: 'GAD-7' }

interface Props {
  clinicalPayload: {
    scale: string
    totalScore: number
    severity: string
    itemScores: Record<string, number>
    suicidalIdeation: boolean
  }
}

export function NarrativePanel({ clinicalPayload }: Props) {
  const [narrative, setNarrative] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reviewed, setReviewed] = useState(false)
  const [escalated, setEscalated] = useState(false)

  useEffect(() => {
    const items = Object.entries(clinicalPayload.itemScores)
      .map(([k, v]) => `Item ${k}: ${v}`)
      .join(', ')

    const prompt = `You are a clinical psychologist assistant providing a structured clinical summary for a clinician's review. Do not make a diagnosis. Do not address the participant directly. Use professional clinical language. You have no identifying information about this person.

Scale: ${SCALE_NAMES[clinicalPayload.scale]}
Total score: ${clinicalPayload.totalScore} — Severity: ${clinicalPayload.severity}
Item scores: ${items}
${clinicalPayload.suicidalIdeation ? 'NOTE: Item 9 is endorsed above zero. This must be flagged as the first clinical priority.' : ''}

Write a clinical summary of 4–5 sentences: (1) overall severity with reference to the score, (2) most clinically significant item-level patterns, (3) any safety-relevant endorsements, (4) recommended follow-up priority (routine / priority / urgent) with brief rationale.`

    fetch('/api/narrative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
      .then(r => r.json())
      .then(data => {
        setNarrative(data.content?.[0]?.text ?? 'Unable to generate summary.')
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to generate summary. Check your API key.')
        setLoading(false)
      })
  }, [])

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h2 className="text-sm font-semibold text-slate-700">AI Clinical Summary</h2>

      {loading && (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
          <Loader2 size={16} className="animate-spin" /> Generating clinical summary…
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      {narrative && (
        <p className="text-sm text-slate-700 leading-relaxed">{narrative}</p>
      )}

      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setReviewed(true)}
          className={reviewed ? 'border-green-400 text-green-600' : ''}
        >
          {reviewed ? <><CheckCircle size={14} className="mr-1" /> Reviewed</> : 'Mark Reviewed'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEscalated(true)}
          className={escalated ? 'border-orange-400 text-orange-600' : ''}
        >
          {escalated ? <><AlertTriangle size={14} className="mr-1" /> Escalated</> : 'Escalate to Supervisor'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Test end-to-end**

1. Complete a full session as in Task 19 Step 4
2. From the patient profile, click "View AI Summary →" on a completed session
3. Page loads — AI narrative generates and appears
4. Verify suicidal ideation banner shows when PHQ-9 Item 9 > 0
5. Click "Mark Reviewed" and "Escalate to Supervisor" — buttons change appearance

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/patients/\[id\]/sessions/ components/sessions/narrative-panel.tsx
git commit -m "feat: add session detail page with live AI narrative"
```

---

## Task 21: Run all tests + final cleanup

- [ ] **Step 1: Run full test suite**

```bash
yarn test
```
Expected: All utility tests pass (password, token, anonymous-id, alert-rules)

- [ ] **Step 2: Run linter**

```bash
yarn lint
```
Fix any lint errors before committing.

- [ ] **Step 3: Build check**

```bash
yarn build
```
Expected: Build completes without errors.

- [ ] **Step 4: Remove legacy demo files**

The old scales and sessions routes may conflict with the new route group. Check and clean up:
```bash
# Check if these are still needed:
ls psychology-test/app/scales/
ls psychology-test/app/sessions/
```
If they only serve the old hardcoded demo, delete them:
```bash
rm -rf psychology-test/app/scales/ psychology-test/app/sessions/
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: remove legacy demo routes, all tests passing"
```
