/** followers: every follower · private: only me · selected: only `allowed_ids` followers */
export type Visibility = 'followers' | 'private' | 'selected'

export interface Category {
  id: string
  name: string
  color: string
  visibility: Visibility
  /** followers allowed to see it when visibility is 'selected' */
  allowed_ids: string[]
  /** legacy flag kept in sync with visibility === 'private' */
  private: boolean
  position: number
  deleted: boolean
  updated_at: string
}

export interface Todo {
  id: string
  title: string
  /** YYYY-MM-DD (local date) */
  date: string
  category_id: string
  /** HH:MM, or null when the todo has no set time */
  time: string | null
  done: boolean
  /** finished Pomodoro focus sessions spent on this todo */
  pomodoros: number
  /** total focused time recorded from finished Pomodoro sessions */
  focus_seconds: number
  /** the routine this todo was created from, if it repeats */
  routine_id: string | null
  position: number
  deleted: boolean
  updated_at: string
}

/** A repeating todo: one todo is created per matching day. */
export interface Routine {
  id: string
  title: string
  category_id: string
  time: string | null
  /** weekdays it repeats on, 0 = Sunday */
  days: number[]
  /** first day (YYYY-MM-DD) */
  start_date: string
  /** weekly repeats: every week (1) or every other week (2), counted from start_date's week */
  every: number
  /** monthly repeats: this day of every month (the last day in shorter months); `days` is ignored */
  month_day: number | null
  /** last day it repeats on (YYYY-MM-DD), or null to keep going */
  end_date: string | null
  deleted: boolean
  updated_at: string
}

/** One finished Pomodoro focus session. */
export interface FocusSession {
  id: string
  /** ISO time the session started */
  started_at: string
  seconds: number
  todo_id: string | null
  deleted: boolean
  updated_at: string
}

/** One weekly meeting of a class. */
export interface Slot {
  /** weekday, 0 = Sunday */
  day: number
  /** HH:MM */
  start: string
  end: string
}

/** A class on the university timetable; it shows up on every matching day of its term. */
export interface Course {
  id: string
  title: string
  room: string
  color: string
  slots: Slot[]
  /** first and last day of the semester (YYYY-MM-DD) */
  term_start: string
  term_end: string
  deleted: boolean
  updated_at: string
}

/** One line of a todo's checklist. */
export interface SubItem {
  id: string
  title: string
  done: boolean
}

/** A todo's memo and checklist. Kept apart from the todo so followers, who can read todos, never see it. */
export interface Note {
  /** the todo's id */
  id: string
  memo: string
  items: SubItem[]
  deleted: boolean
  updated_at: string
}

/** A day counted down to on the todo screen (an exam, a deadline). */
export interface Dday {
  id: string
  title: string
  /** YYYY-MM-DD */
  date: string
  deleted: boolean
  updated_at: string
}

export type Kind = 'todos' | 'categories' | 'routines' | 'sessions' | 'courses' | 'notes' | 'ddays'
export type Row<K extends Kind> = K extends 'todos'
  ? Todo
  : K extends 'categories'
    ? Category
    : K extends 'routines'
      ? Routine
      : K extends 'sessions'
        ? FocusSession
        : K extends 'courses'
          ? Course
          : K extends 'notes'
            ? Note
            : Dday
