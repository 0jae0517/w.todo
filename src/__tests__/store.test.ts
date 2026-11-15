import { beforeEach, describe, expect, it, vi } from 'vitest'

/** A fresh store module (it reads localStorage once when loaded). */
async function freshStore(seed?: object) {
  const mem = new Map<string, string>()
  if (seed) mem.set('todo-app:v1', JSON.stringify(seed))
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => void mem.set(k, v),
    removeItem: (k: string) => void mem.delete(k),
  })
  vi.resetModules()
  return import('../store')
}

const todo = (id: string, updated_at: string, extra = {}) => ({
  id,
  title: id,
  date: '2026-11-14',
  category_id: 'default',
  done: false,
  time: null,
  routine_id: null,
  pomodoros: 0,
  focus_seconds: 0,
  position: 0,
  deleted: false,
  updated_at,
  ...extra,
})

describe('applyRemote (last write wins)', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('keeps a newer local edit that is not uploaded yet', async () => {
    const s = await freshStore()
    s.addTodo('local', '2026-11-14', 'default')
    const id = s.getState().todos[0].id
    s.applyRemote('todos', [{ ...todo(id, '2000-01-01T00:00:00.000Z'), title: 'remote' }])
    expect(s.getState().todos[0].title).toBe('local')
    expect(s.hasPending()).toBe(true)
  })

  it('takes a newer server copy', async () => {
    const s = await freshStore()
    s.addTodo('local', '2026-11-14', 'default')
    const id = s.getState().todos[0].id
    s.applyRemote('todos', [{ ...todo(id, '2999-01-01T00:00:00.000Z'), title: 'remote' }])
    expect(s.getState().todos[0].title).toBe('remote')
  })

  it('advances the cursor to the latest synced_at', async () => {
    const s = await freshStore()
    s.applyRemote('todos', [
      { ...todo('a', '2026-11-14T00:00:00.000Z'), synced_at: '2026-11-14T00:00:02Z' },
      { ...todo('b', '2026-11-14T00:00:00.000Z'), synced_at: '2026-11-14T00:00:01Z' },
    ])
    expect(s.getCursor('todos')).toBe('2026-11-14T00:00:02Z')
  })
})

describe('bindUser', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('uploads data made without an account into the account', async () => {
    const s = await freshStore()
    s.addTodo('mine', '2026-11-14', 'default')
    expect(s.bindUser('user-a')).toBe(false)
    expect(s.getState().todos.map((t) => t.title)).toEqual(['mine'])
    expect(s.pendingChanges().todos).toHaveLength(1)
  })

  it("wipes another account's leftovers instead of uploading them", async () => {
    const s = await freshStore()
    s.bindUser('user-a')
    s.addTodo("a's todo", '2026-11-14', 'default')
    // user-a was signed out without the sign-out button (expired session), user-b signs in
    expect(s.bindUser('user-b')).toBe(true)
    expect(s.getState().todos).toHaveLength(0)
    expect(s.pendingChanges().todos).toHaveLength(0)
  })

  it('keeps everything when the same account signs in again', async () => {
    const s = await freshStore()
    s.bindUser('user-a')
    s.addTodo('kept', '2026-11-14', 'default')
    expect(s.bindUser('user-a')).toBe(false)
    expect(s.getState().todos).toHaveLength(1)
  })
})

describe('repeating todos', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('creates one todo per matching weekday with stable ids', async () => {
    vi.useFakeTimers({ now: new Date(2026, 10, 14, 12) }) // Saturday 2026-11-14
    const s = await freshStore()
    s.addTodo('run', '2026-11-14', 'default')
    const id = s.getState().todos[0].id
    s.setRepeat(id, [1]) // Mondays
    const routineId = s.getState().routines[0].id
    const copies = s.getState().todos.filter((t) => t.routine_id === routineId && t.id !== id)
    expect(copies.length).toBeGreaterThan(0)
    for (const t of copies) {
      expect(new Date(t.date + 'T00:00').getDay()).toBe(1)
      expect(t.id).toBe(`${routineId}@${t.date}`)
      expect(t.updated_at).toBe(s.UNTOUCHED)
    }
    vi.useRealTimers()
  })

  it('stopping a repeat removes later undone copies', async () => {
    vi.useFakeTimers({ now: new Date(2026, 10, 14, 12) })
    const s = await freshStore()
    s.addTodo('run', '2026-11-14', 'default')
    const id = s.getState().todos[0].id
    s.setRepeat(id, [0, 1, 2, 3, 4, 5, 6])
    s.stopRepeat(id)
    expect(s.getState().todos.filter((t) => t.date > '2026-11-14')).toHaveLength(0)
    vi.useRealTimers()
  })
})
