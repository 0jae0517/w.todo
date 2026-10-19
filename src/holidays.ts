import { addDays, fromKey, toKey } from './date'

/**
 * Korean public holidays, computed so no yearly data update is needed.
 * Lunar dates use the browser's Chinese calendar (matches the Korean lunar
 * calendar except in very rare years). One-off holidays the government
 * announces (elections, 임시공휴일) aren't included.
 */

const lunarFmt = new Intl.DateTimeFormat('ko-KR-u-ca-chinese', { month: 'numeric', day: 'numeric' })

function lunarOf(key: string) {
  const parts = lunarFmt.formatToParts(fromKey(key))
  const month = parts.find((p) => p.type === 'month')!.value
  const day = Number(parts.find((p) => p.type === 'day')!.value)
  // leap months come back with a marker (e.g. "윤4"); no holiday falls in them
  return /^\d+$/.test(month) ? { month: Number(month), day } : null
}

const isWeekend = (key: string) => [0, 6].includes(fromKey(key).getDay())
const isSunday = (key: string) => fromKey(key).getDay() === 0

const cache = new Map<number, Map<string, string>>()

function build(year: number) {
  const h = new Map<string, string>()
  const add = (key: string, name: string) => h.set(key, h.has(key) ? `${h.get(key)}, ${name}` : name)
  const solar = (m: number, d: number) => toKey(new Date(year, m - 1, d))

  const fixed: [number, number, string][] = [
    [1, 1, '신정'],
    [3, 1, '삼일절'],
    [5, 5, '어린이날'],
    [6, 6, '현충일'],
    [8, 15, '광복절'],
    [10, 3, '개천절'],
    [10, 9, '한글날'],
    [12, 25, '성탄절'],
  ]
  for (const [m, d, name] of fixed) add(solar(m, d), name)

  // lunar holidays: scan the year once
  let seollal = '', chuseok = '', buddha = ''
  for (let k = solar(1, 1); fromKey(k).getFullYear() === year; k = addDays(k, 1)) {
    const l = lunarOf(k)
    if (!l) continue
    if (l.month === 1 && l.day === 1) seollal = k
    if (l.month === 8 && l.day === 15) chuseok = k
    if (l.month === 4 && l.day === 8) buddha = k
  }
  const seollalDays = seollal ? [addDays(seollal, -1), seollal, addDays(seollal, 1)] : []
  const chuseokDays = chuseok ? [addDays(chuseok, -1), chuseok, addDays(chuseok, 1)] : []
  for (const k of seollalDays) add(k, '설날')
  for (const k of chuseokDays) add(k, '추석')
  if (buddha) add(buddha, '부처님오신날')

  // 대체공휴일: the next weekday that isn't already a holiday
  const substitute = () => {
    let k = ''
    return (from: string) => {
      k = addDays(from, 1)
      while (isWeekend(k) || h.has(k)) k = addDays(k, 1)
      add(k, '대체공휴일')
    }
  }
  const next = substitute()

  // 설날·추석: a day on Sunday or on another holiday
  const original = new Map(h)
  for (const days of [seollalDays, chuseokDays]) {
    if (!days.length) continue
    const clash = days.some((k) => isSunday(k) || (original.get(k) ?? '').includes(','))
    if (clash) next(days[2])
  }
  // 어린이날: weekend or another holiday
  const children = solar(5, 5)
  if (isWeekend(children) || (original.get(children) ?? '').includes(',')) next(children)
  // the rest: weekend only
  for (const [m, d] of [[3, 1], [8, 15], [10, 3], [10, 9], [12, 25]] as const) {
    if (isWeekend(solar(m, d))) next(solar(m, d))
  }
  if (buddha && isWeekend(buddha)) next(buddha)

  return h
}

/** Holiday name for a YYYY-MM-DD key, or undefined. */
export function holidayName(key: string) {
  const year = Number(key.slice(0, 4))
  if (!cache.has(year)) cache.set(year, build(year))
  return cache.get(year)!.get(key)
}
