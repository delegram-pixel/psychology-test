export function computeNumericScore(
  itemScores: Record<string, number | string>
): number {
  return Object.values(itemScores).reduce<number>((sum, val) => {
    return typeof val === 'number' ? sum + val : sum
  }, 0)
}

export function lookupSeverity(
  score: number,
  thresholds: { label: string; minScore: number; maxScore: number }[]
): string {
  const match = thresholds.find(t => score >= t.minScore && score <= t.maxScore)
  return match?.label ?? 'unclassified'
}
