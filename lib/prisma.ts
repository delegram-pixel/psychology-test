import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function buildDatasourceUrl(): string {
  const base = process.env.DATABASE_URL
  if (!base) return ''
  try {
    const url = new URL(base)
    // Raise pool size and timeout — Next.js App Router dev spawns multiple
    // worker threads, each with their own module scope, which can exhaust
    // the default pool of 5 connections in seconds.
    if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '20')
    if (!url.searchParams.has('pool_timeout'))     url.searchParams.set('pool_timeout', '30')
    return url.toString()
  } catch {
    return base
  }
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ datasourceUrl: buildDatasourceUrl() })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma