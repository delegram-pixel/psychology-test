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
