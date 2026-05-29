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
