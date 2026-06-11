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
