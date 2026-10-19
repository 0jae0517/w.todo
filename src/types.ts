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
  position: number
  deleted: boolean
  updated_at: string
}

export type Kind = 'todos' | 'categories'
export type Row<K extends Kind> = K extends 'todos' ? Todo : Category
