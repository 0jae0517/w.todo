const pad = (n: number) => String(n).padStart(2, '0')

export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

export function fromKey(key: string) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayKey = () => toKey(new Date())

export function addDays(key: string, n: number) {
  const d = fromKey(key)
  d.setDate(d.getDate() + n)
  return toKey(d)
}

export function addMonths(key: string, n: number) {
  const d = fromKey(key)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return toKey(d)
}

/** Sunday-first week containing `key`. */
export function weekOf(key: string) {
  const start = addDays(key, -fromKey(key).getDay())
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** Whole weeks covering the month containing `key`. */
export function monthGrid(key: string) {
  const d = fromKey(key)
  const first = toKey(new Date(d.getFullYear(), d.getMonth(), 1))
  const last = toKey(new Date(d.getFullYear(), d.getMonth() + 1, 0))
  const days: string[] = []
  let cur = weekOf(first)[0]
  while (cur <= last || days.length % 7 !== 0) {
    days.push(cur)
    cur = addDays(cur, 1)
  }
  return days
}

export const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function monthLabel(key: string) {
  const d = fromKey(key)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`
}

export function dayLabel(key: string) {
  const d = fromKey(key)
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAYS[d.getDay()]}요일`
}
