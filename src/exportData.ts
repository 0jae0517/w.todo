import { getState } from './store'
import { todayKey } from './date'
import { saveFile } from './share'

/**
 * "내 데이터 내보내기": everything this device holds for the account
 * (categories, todos, repeats, focus sessions, classes) as JSON, or the
 * todos alone as a CSV that spreadsheets open.
 */

const save = (name: string, type: string, text: string) => saveFile(name, new Blob([text], { type }))

export function exportJson() {
  const { categories, todos, routines, sessions, courses, notes, ddays } = getState()
  const data = { app: 'w.todo', exported_at: new Date().toISOString(), categories, todos, notes: Object.values(notes), routines, sessions, courses, ddays }
  return save(`wtodo-${todayKey()}.json`, 'application/json', JSON.stringify(data, null, 2))
}

const cell = (v: unknown) => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportCsv() {
  const { categories, todos, notes } = getState()
  const names = new Map(categories.map((c) => [c.id, c.name]))
  const rows = [
    ['날짜', '시간', '카테고리', '할 일', '완료', '뽀모도로', '집중(분)', '메모'],
    ...[...todos]
      .sort((a, b) => a.date.localeCompare(b.date) || a.position - b.position)
      .map((t) => [t.date, t.time ?? '', names.get(t.category_id) ?? '', t.title, t.done ? 'O' : '', t.pomodoros, Math.round(t.focus_seconds / 60), notes[t.id]?.memo ?? '']),
  ]
  // BOM so Excel reads the Korean text as UTF-8
  return save(`wtodo-todos-${todayKey()}.csv`, 'text/csv', '﻿' + rows.map((r) => r.map(cell).join(',')).join('\n'))
}
