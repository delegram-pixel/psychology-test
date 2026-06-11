export function buildAnonymousId(n: number): string {
  return `P-${String(n).padStart(3, '0')}`
}

/** Pass the current count of patients for this psychologist. */
export function nextAnonymousId(currentCount: number): string {
  return buildAnonymousId(currentCount + 1)
}
