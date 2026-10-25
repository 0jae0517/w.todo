import { useSyncExternalStore } from 'react'
import { fromKey, todayKey } from './date'
import { holidayName } from './holidays'
import type { Course, Slot } from './types'

// ---- whether the 시간표 tab is shown on this device ----

const KEY = 'todo-app:timetable'
const listeners = new Set<() => void>()

function read() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

let on = read()

export function setTimetableOn(v: boolean) {
  on = v
  try {
    localStorage.setItem(KEY, v ? '1' : '0')
  } catch {
    // not remembered, that's fine
  }
  listeners.forEach((l) => l())
}

export const useTimetableOn = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => on,
  )

// ---- semesters ----

/** The usual Korean university semester around today (1학기 3월~6월, 2학기 9월~12월). */
export function defaultTerm(today = todayKey()) {
  const y = Number(today.slice(0, 4))
  const m = Number(today.slice(5, 7))
  if (m >= 7) return { term_start: `${y}-09-01`, term_end: `${y}-12-19` }
  return { term_start: `${y}-03-02`, term_end: `${y}-06-19` }
}

/** The term the timetable is on: the one its classes share, or the default. */
export function currentTerm(courses: Course[]) {
  const c = courses[0]
  return c ? { term_start: c.term_start, term_end: c.term_end } : defaultTerm()
}

export function termLabel(term: { term_start: string; term_end: string }) {
  const y = term.term_start.slice(0, 4)
  const m = Number(term.term_start.slice(5, 7))
  const name = m >= 2 && m <= 5 ? '1학기' : m >= 8 && m <= 10 ? '2학기' : m >= 6 && m <= 7 ? '여름학기' : '겨울학기'
  const md = (k: string) => `${Number(k.slice(5, 7))}/${Number(k.slice(8, 10))}`
  return `${y}년 ${name} · ${md(term.term_start)}~${md(term.term_end)}`
}

// ---- classes on a given day ----

export interface ClassOnDay {
  course: Course
  slot: Slot
}

/** Classes meeting on `date`, earliest first. None on public holidays. */
export function classesOn(date: string, courses: Course[]): ClassOnDay[] {
  if (holidayName(date)) return []
  const day = fromKey(date).getDay()
  const out: ClassOnDay[] = []
  for (const course of courses) {
    if (date < course.term_start || date > course.term_end) continue
    for (const slot of course.slots) if (slot.day === day) out.push({ course, slot })
  }
  return out.sort((a, b) => a.slot.start.localeCompare(b.slot.start))
}

export const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5))
