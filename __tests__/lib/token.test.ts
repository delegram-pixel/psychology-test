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
