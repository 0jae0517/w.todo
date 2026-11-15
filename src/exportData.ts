import { getState } from './store'
import { todayKey } from './date'

/**
 * "내 데이터 내보내기": everything this device holds for the account
 * (categories, todos, repeats, focus sessions, classes) as JSON, or the
 * todos alone as a CSV that spreadsheets open.
 */

function save(name: string, type: string, text: string) {
  const blob = new Blob([text], { type })
  const file = new File([blob], name, { type })
  // the Android app's web view can't download; the share sheet can save the file
  if (navigator.canShare?.({ files: [file] })) return navigator.share({ files: [file], title: name }).catch(() => {})
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

export function exportJson() {
  const { categories, todos, routines, sessions, courses } = getState()
  const data = { app: 'w.todo', exported_at: new Date().toISOString(), categories, todos, routines, sessions, courses }
  return save(`wtodo-${todayKey()}.json`, 'application/json', JSON.stringify(data, null, 2))
}

const cell = (v: unknown) => {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportCsv() {
  const { categories, todos } = getState()
  const names = new Map(categories.map((c) => [c.id, c.name]))
  const rows = [
    ['날짜', '시간', '카테고리', '할 일', '완료', '뽀모도로', '집중(분)'],
    ...[...todos]
      .sort((a, b) => a.date.localeCompare(b.date) || a.position - b.position)
      .map((t) => [t.date, t.time ?? '', names.get(t.category_id) ?? '', t.title, t.done ? 'O' : '', t.pomodoros, Math.round(t.focus_seconds / 60)]),
  ]
  // BOM so Excel reads the Korean text as UTF-8
  return save(`wtodo-todos-${todayKey()}.csv`, 'text/csv', '﻿' + rows.map((r) => r.map(cell).join(',')).join('\n'))
}
