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
