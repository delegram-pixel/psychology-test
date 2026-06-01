import { computeNumericScore, lookupSeverity } from '@/lib/scale-scoring'

describe('computeNumericScore', () => {
  it('sums numeric values only', () => {
    const scores = { '1': 2, '2': 3, '3': 1 }
    expect(computeNumericScore(scores)).toBe(6)
  })

  it('ignores string values (free text)', () => {
    const scores = { '1': 2, '2': 'some text', '3': 1 }
    expect(computeNumericScore(scores as any)).toBe(3)
  })

  it('returns 0 for empty scores', () => {
    expect(computeNumericScore({})).toBe(0)
  })
})

describe('lookupSeverity', () => {
  const thresholds = [
    { label: 'Mild', minScore: 0, maxScore: 9 },
    { label: 'Moderate', minScore: 10, maxScore: 19 },
    { label: 'Severe', minScore: 20, maxScore: 27 },
  ]

  it('returns correct label for score in range', () => {
    expect(lookupSeverity(14, thresholds)).toBe('Moderate')
  })

  it('returns label for boundary scores', () => {
    expect(lookupSeverity(0, thresholds)).toBe('Mild')
    expect(lookupSeverity(27, thresholds)).toBe('Severe')
  })

  it('returns "unclassified" when no threshold matches', () => {
    expect(lookupSeverity(30, thresholds)).toBe('unclassified')
  })

  it('returns "unclassified" for empty thresholds', () => {
    expect(lookupSeverity(10, [])).toBe('unclassified')
  })
})
