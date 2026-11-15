/** One line of a template. `days` empty means a one-off todo. */
export interface TemplateItem {
  title: string
  time: string | null
  days: number[]
}

const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/

/**
 * Keeps only well-formed items. Templates made before the server checked them
 * could hold a time like "25:99" or no days; taking one used to make every
 * later sync fail (the server rejects the routine) or break the screen.
 */
export function cleanItems(items: unknown): TemplateItem[] {
  if (!Array.isArray(items)) return []
  const out: TemplateItem[] = []
  for (const it of items) {
    if (!it || typeof it !== 'object') continue
    const { title, time, days } = it as Record<string, unknown>
    if (typeof title !== 'string' || !title.trim()) continue
    out.push({
      title: title.trim().slice(0, 100),
      time: typeof time === 'string' && TIME.test(time) ? time : null,
      days: Array.isArray(days) ? [...new Set(days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : [],
    })
  }
  return out.slice(0, 50)
}

