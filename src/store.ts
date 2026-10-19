import { useSyncExternalStore } from 'react'
import type { Category, Kind, Row, Todo, Visibility } from './types'

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
}

const now = () => new Date().toISOString()
const newId = () => crypto.randomUUID()

function initial(): Persisted {
  const t = now()
  const def: Category = { id: 'default', name: '할 일', color: PALETTE[0], visibility: 'followers', allowed_ids: [], private: false, position: 0, deleted: false, updated_at: t }
  return { categories: { default: def }, todos: {}, dirty: ['categories:default'], cursor: {}, userId: null }
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
  const next = { ...cur, ...patch, updated_at: now() }
  // moving to another day puts it at the end of that day's list
  if (patch.date && patch.date !== cur.date && patch.position === undefined) next.position = Date.now()
  put('todos', next)
  commit(true)
}

export const deleteTodo = (id: string) => updateTodo(id, { deleted: true })

// ---- categories ----

export function addCategory(name: string) {
  const used = new Set(snapshot.categories.map((c) => c.color))
  const color = PALETTE.find((c) => !used.has(c)) ?? PALETTE[snapshot.categories.length % PALETTE.length]
  put('categories', { id: newId(), name, color, visibility: 'followers', allowed_ids: [], private: false, position: Date.now(), deleted: false, updated_at: now() })
  commit(true)
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

// ---- sync support ----

export function pendingChanges() {
  const out: { todos: Todo[]; categories: Category[] } = { todos: [], categories: [] }
  for (const key of dirty) {
    const [kind, id] = key.split(':') as [Kind, string]
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
    } else r.time ??= null
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
  for (const id of Object.keys(db.todos)) dirty.add(`todos:${id}`)
  commit(false)
}
