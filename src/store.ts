import { useSyncExternalStore } from 'react'
import { addDays, fromKey, todayKey } from './date'
import type { Category, FocusSession, Kind, Routine, Row, Todo, Visibility } from './types'

/**
 * Local-first store. Everything lives in localStorage so the app works offline
 * and without an account; the sync engine pushes records listed in `dirty`
 * and merges remote rows back with last-write-wins on `updated_at`.
 */

const KEY = 'todo-app:v1'

export const PALETTE = ['#4f7cff', '#ff6b6b', '#ffb020', '#2fbf71', '#a066ff', '#ff7ac6', '#17b5c4', '#8a8f98']

interface Persisted {
  categories: Record<string, Category>
  todos: Record<string, Todo>
  routines: Record<string, Routine>
  sessions: Record<string, FocusSession>
  /** "todos:<id>" / "categories:<id>" keys not yet pushed to the server */
  dirty: string[]
  /** last server `synced_at` seen per table */
  cursor: Partial<Record<Kind, string>>
  /** account the local data was last synced with */
  userId: string | null
}

export interface State {
  categories: Category[]
  todos: Todo[]
  routines: Routine[]
  /** oldest first */
  sessions: FocusSession[]
}

const now = () => new Date().toISOString()
/**
 * updated_at of the starter category before anyone touches it. It is only
 * inserted when the account has no such row yet, so signing in on a new device
 * never overwrites a renamed or hidden default category.
 */
export const UNTOUCHED = new Date(0).toISOString()
const newId = () => crypto.randomUUID()

function initial(): Persisted {
  const def: Category = { id: 'default', name: '할 일', color: PALETTE[0], visibility: 'followers', allowed_ids: [], private: false, position: 0, deleted: false, updated_at: UNTOUCHED }
  return { categories: { default: def }, todos: {}, routines: {}, sessions: {}, dirty: ['categories:default'], cursor: {}, userId: null }
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const db: Persisted = { ...initial(), ...JSON.parse(raw) }
      // fill fields added after the first release
      for (const c of Object.values(db.categories)) {
        c.private ??= false
        c.visibility ??= c.private ? 'private' : 'followers'
        c.allowed_ids ??= []
      }
      for (const t of Object.values(db.todos)) {
        t.pomodoros ??= 0
        t.focus_seconds ??= 0
        t.time ??= null
        t.routine_id ??= null
      }
      return db
    }
  } catch {
    // corrupted or unavailable storage: start fresh
  }
  return initial()
}

let db = load()
let dirty = new Set(db.dirty)
let snapshot = derive()
const listeners = new Set<() => void>()
const changeListeners = new Set<() => void>()

function derive(): State {
  return {
    categories: Object.values(db.categories)
      .filter((c) => !c.deleted)
      .sort((a, b) => a.position - b.position),
    todos: Object.values(db.todos)
      .filter((t) => !t.deleted)
      .sort((a, b) => a.position - b.position),
    routines: Object.values(db.routines).filter((r) => !r.deleted),
    sessions: Object.values(db.sessions)
      .filter((s) => !s.deleted)
      .sort((a, b) => a.started_at.localeCompare(b.started_at)),
  }
}

function commit(localChange: boolean) {
  db.dirty = [...dirty]
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {
    // storage full or blocked; keep running in memory
  }
  snapshot = derive()
  listeners.forEach((l) => l())
  if (localChange) changeListeners.forEach((l) => l())
}

function table<K extends Kind>(kind: K) {
  return db[kind] as Record<string, Row<K>>
}

function put<K extends Kind>(kind: K, row: Row<K>) {
  table(kind)[row.id] = row
  dirty.add(`${kind}:${row.id}`)
}

// ---- reading ----

export const getState = () => snapshot
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
export const useStore = () => useSyncExternalStore(subscribe, getState)

/** Fires after every local edit (not after remote merges). */
export function onLocalChange(l: () => void) {
  changeListeners.add(l)
  return () => changeListeners.delete(l)
}

// ---- todos ----

export function addTodo(title: string, date: string, category_id: string) {
  put('todos', {
    id: newId(),
    title,
    date,
    category_id,
    done: false,
    time: null,
    routine_id: null,
    pomodoros: 0,
    focus_seconds: 0,
    position: Date.now(),
    deleted: false,
    updated_at: now(),
  })
  commit(true)
}

export function updateTodo(id: string, patch: Partial<Omit<Todo, 'id'>>) {
  const cur = db.todos[id]
  if (!cur) return
  const t = now()
  const next = { ...cur, ...patch, updated_at: t }
  // moving to another day puts it at the end of that day's list
  if (patch.date && patch.date !== cur.date && patch.position === undefined) next.position = Date.now()
  put('todos', next)
  // renaming or re-timing a repeating todo carries over to its later days
  const routine = cur.routine_id ? db.routines[cur.routine_id] : undefined
  const shared: Partial<Pick<Todo, 'title' | 'time' | 'category_id'>> = {}
  if (patch.title !== undefined) shared.title = patch.title
  if (patch.time !== undefined) shared.time = patch.time
  if (patch.category_id !== undefined) shared.category_id = patch.category_id
  if (routine && !routine.deleted && Object.keys(shared).length) {
    put('routines', { ...routine, ...shared, updated_at: t })
    for (const o of laterRepeats(routine.id, cur.date)) put('todos', { ...o, ...shared, updated_at: t })
  }
  commit(true)
}

export const deleteTodo = (id: string) => updateTodo(id, { deleted: true })

// ---- categories ----

export function addCategory(name: string, color?: string) {
  const used = new Set(snapshot.categories.map((c) => c.color))
  color ??= PALETTE.find((c) => !used.has(c)) ?? PALETTE[snapshot.categories.length % PALETTE.length]
  const id = newId()
  put('categories', { id, name, color, visibility: 'followers', allowed_ids: [], private: false, position: Date.now(), deleted: false, updated_at: now() })
  commit(true)
  return id
}

export function updateCategory(id: string, patch: Partial<Omit<Category, 'id'>>) {
  const cur = db.categories[id]
  if (!cur) return
  put('categories', { ...cur, ...patch, updated_at: now() })
  commit(true)
}

export function setVisibility(id: string, visibility: Visibility, allowed_ids?: string[]) {
  const cur = db.categories[id]
  if (!cur) return
  updateCategory(id, { visibility, private: visibility === 'private', allowed_ids: allowed_ids ?? cur.allowed_ids })
}

/** Deletes the category together with its todos. */
export function deleteCategory(id: string) {
  const t = now()
  const cur = db.categories[id]
  if (!cur) return
  put('categories', { ...cur, deleted: true, updated_at: t })
  for (const todo of Object.values(db.todos)) {
    if (todo.category_id === id && !todo.deleted) put('todos', { ...todo, deleted: true, updated_at: t })
  }
  for (const r of Object.values(db.routines)) {
    if (r.category_id === id && !r.deleted) put('routines', { ...r, deleted: true, updated_at: t })
  }
  commit(true)
}

export function moveCategory(id: string, dir: -1 | 1) {
  const list = snapshot.categories
  const i = list.findIndex((c) => c.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= list.length) return
  const t = now()
  put('categories', { ...list[i], position: list[j].position, updated_at: t })
  put('categories', { ...list[j], position: list[i].position, updated_at: t })
  commit(true)
}

/** Saves a new category order (ids in display order). */
export function reorderCategories(ids: string[]) {
  const t = now()
  ids.forEach((id, i) => {
    const cur = db.categories[id]
    const position = (i + 1) * 1024
    if (cur && cur.position !== position) put('categories', { ...cur, position, updated_at: t })
  })
  commit(true)
}

// ---- repeating todos ----

const REPEAT_BACK = 30
const REPEAT_AHEAD = 30

/** Undone, not deleted todos of a routine after `date`. */
function laterRepeats(routineId: string, date: string) {
  return Object.values(db.todos).filter((t) => t.routine_id === routineId && t.date > date && !t.done && !t.deleted)
}

/**
 * Copies a shared template into my list: repeating items become routines
 * starting on `date`, one-off items become todos on `date`.
 */
export function applyTemplate(items: { title: string; time: string | null; days: number[] }[], categoryId: string, date: string) {
  const t = now()
  items.forEach((it, i) => {
    if (it.days.length) {
      put('routines', { id: newId(), title: it.title, category_id: categoryId, time: it.time, days: it.days, start_date: date, deleted: false, updated_at: t })
    } else {
      put('todos', {
        id: newId(),
        title: it.title,
        date,
        category_id: categoryId,
        time: it.time,
        done: false,
        routine_id: null,
        pomodoros: 0,
        focus_seconds: 0,
        position: Date.now() + i,
        deleted: false,
        updated_at: t,
      })
    }
  })
  commit(true)
  generateRepeats()
}

/** Makes a todo repeat on the given weekdays (0 = Sunday), or changes its days. */
export function setRepeat(todoId: string, days: number[]) {
  const todo = db.todos[todoId]
  if (!todo || !days.length) return
  const t = now()
  const cur = todo.routine_id ? db.routines[todo.routine_id] : undefined
  const routine: Routine =
    cur && !cur.deleted
      ? { ...cur, days, updated_at: t }
      : { id: newId(), title: todo.title, category_id: todo.category_id, time: todo.time, days, start_date: todo.date, deleted: false, updated_at: t }
  put('routines', routine)
  if (todo.routine_id !== routine.id) put('todos', { ...todo, routine_id: routine.id, updated_at: t })
  // days that no longer match lose their upcoming copies
  for (const o of laterRepeats(routine.id, todo.date)) {
    if (!days.includes(fromKey(o.date).getDay())) put('todos', { ...o, deleted: true, updated_at: t })
  }
  commit(true)
  generateRepeats()
}

/** Stops a todo from repeating; this one stays, later undone copies go away. */
export function stopRepeat(todoId: string) {
  const todo = db.todos[todoId]
  const routine = todo?.routine_id ? db.routines[todo.routine_id] : undefined
  if (!todo || !routine) return
  const t = now()
  put('routines', { ...routine, deleted: true, updated_at: t })
  for (const o of laterRepeats(routine.id, todo.date)) put('todos', { ...o, deleted: true, updated_at: t })
  commit(true)
}

/**
 * Creates the todos of every routine from a month back to a month ahead.
 * Ids are "<routine>@<date>" so every device creates the same rows, and they
 * carry the UNTOUCHED stamp so they never overwrite a copy already on the
 * server (for example one that was ticked off on another device).
 */
export function generateRepeats() {
  const today = todayKey()
  const have = new Set(Object.values(db.todos).map((t) => `${t.routine_id}@${t.date}`))
  let added = false
  for (const r of Object.values(db.routines)) {
    if (r.deleted) continue
    let d = r.start_date > addDays(today, -REPEAT_BACK) ? r.start_date : addDays(today, -REPEAT_BACK)
    for (const end = addDays(today, REPEAT_AHEAD); d <= end; d = addDays(d, 1)) {
      const id = `${r.id}@${d}`
      if (!r.days.includes(fromKey(d).getDay()) || db.todos[id] || have.has(id)) continue
      put('todos', {
        id,
        title: r.title,
        date: d,
        category_id: r.category_id,
        time: r.time,
        done: false,
        routine_id: r.id,
        pomodoros: 0,
        focus_seconds: 0,
        position: 0,
        deleted: false,
        updated_at: UNTOUCHED,
      })
      added = true
    }
  }
  if (added) commit(false)
}

/** Days in a row (counting back from the latest due day up to today) a routine was done. */
export function repeatStreak(routineId: string) {
  const today = todayKey()
  const list = snapshot.todos.filter((t) => t.routine_id === routineId && t.date <= today).sort((a, b) => b.date.localeCompare(a.date))
  let n = 0
  for (const [i, t] of list.entries()) {
    // today not done yet doesn't break the streak
    if (t.done) n++
    else if (!(i === 0 && t.date === today)) break
  }
  return n
}

// ---- focus sessions ----

export function addSession(started_at: string, seconds: number, todo_id: string | null) {
  put('sessions', { id: newId(), started_at, seconds, todo_id, deleted: false, updated_at: now() })
  commit(true)
}

// ---- sync support ----

/** True when there are edits on this device the server hasn't received. */
export function hasPending() {
  return Object.values(pendingChanges()).some((rows: Row<Kind>[]) => rows.some((r) => r.updated_at !== UNTOUCHED))
}

/** Forgets everything stored on this device (used on sign-out). */
export function resetLocal() {
  db = initial()
  dirty = new Set(db.dirty)
  commit(false)
}

export function pendingChanges() {
  const out: { [K in Kind]: Row<K>[] } = { todos: [], categories: [], routines: [], sessions: [] }
  for (const key of dirty) {
    const i = key.indexOf(':')
    const kind = key.slice(0, i) as Kind
    const id = key.slice(i + 1)
    const row = table(kind)[id]
    if (row) (out[kind] as Row<Kind>[]).push(row)
    else dirty.delete(key)
  }
  return out
}

/** Clears dirty flags for rows that haven't changed again since they were pushed. */
export function markPushed<K extends Kind>(kind: K, rows: Row<K>[]) {
  for (const row of rows) {
    if (table(kind)[row.id]?.updated_at === row.updated_at) dirty.delete(`${kind}:${row.id}`)
  }
  commit(false)
}

export function applyRemote<K extends Kind>(kind: K, rows: (Row<K> & { user_id?: string; synced_at?: string })[]) {
  if (!rows.length) return
  const tbl = table(kind)
  for (const { user_id: _u, synced_at, ...raw } of rows) {
    // Postgres returns "+00:00" offsets; normalize so string comparison stays valid
    const row = { ...raw, updated_at: new Date(raw.updated_at).toISOString() }
    // rows written before a column existed come back without it
    const r = row as Record<string, unknown>
    if (kind === 'categories') {
      r.visibility ??= r.private ? 'private' : 'followers'
      r.allowed_ids ??= []
    } else if (kind === 'todos') {
      r.time ??= null
      r.routine_id ??= null
    }
    const local = tbl[row.id]
    const localPending = dirty.has(`${kind}:${row.id}`)
    if (!local || !localPending || row.updated_at >= local.updated_at) {
      tbl[row.id] = row as unknown as Row<K>
      dirty.delete(`${kind}:${row.id}`)
    }
    if (synced_at && (!db.cursor[kind] || synced_at > db.cursor[kind]!)) db.cursor[kind] = synced_at
  }
  commit(false)
}

export const getCursor = (kind: Kind) => db.cursor[kind] ?? null

/**
 * Called when an account signs in. If the local data belongs to no account or
 * to a different one, everything local is queued for upload and the cursors
 * reset so the full server copy is pulled.
 */
export function bindUser(userId: string) {
  if (db.userId === userId) return
  db.userId = userId
  db.cursor = {}
  for (const id of Object.keys(db.categories)) dirty.add(`categories:${id}`)
  for (const kind of ['todos', 'routines', 'sessions'] as const) for (const id of Object.keys(db[kind])) dirty.add(`${kind}:${id}`)
  commit(false)
}
