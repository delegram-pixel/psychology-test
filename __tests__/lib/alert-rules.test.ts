import { computeAlerts, type AlertResult } from '@/lib/alert-rules'

describe('computeAlerts', () => {
  it('returns critical for PHQ-9 >= 20', () => {
    const result = computeAlerts('PHQ9', 20, {})
    expect(result.severity).toBe('critical')
  })

  it('returns critical for GAD-7 >= 15', () => {
    const result = computeAlerts('GAD7', 15, {})
    expect(result.severity).toBe('critical')
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
