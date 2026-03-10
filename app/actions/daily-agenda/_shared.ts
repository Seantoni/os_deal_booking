export function roundToTwo(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function normalizeDisplayName(name: string | null, email: string | null, userId: string): string {
  if (name && name.trim()) return name.trim()
  if (email && email.trim()) return email.trim()
  return `Usuario ${userId.slice(0, 8)}`
}
