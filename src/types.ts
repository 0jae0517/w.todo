export interface Category {
  id: string
  name: string
  color: string
  /** hidden from followers */
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
