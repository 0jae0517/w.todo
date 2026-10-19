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

export type Kind = 'todos' | 'categories' | 'routines' | 'sessions'
export type Row<K extends Kind> = K extends 'todos'
  ? Todo
  : K extends 'categories'
    ? Category
    : K extends 'routines'
      ? Routine
      : FocusSession
