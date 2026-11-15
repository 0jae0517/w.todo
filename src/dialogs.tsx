import { useSyncExternalStore } from 'react'
import ConfirmDialog from './components/ConfirmDialog'

/**
 * Promise-based confirm/alert drawn with ConfirmDialog, so code outside React
 * (sync, native) and simple click handlers don't fall back to the browser's
 * own confirm()/alert() boxes.
 */

interface Ask {
  title: string
  message?: string
  confirmLabel?: string
  danger?: boolean
}

type Pending = Ask & { alert: boolean; resolve: (ok: boolean) => void }

let queue: Pending[] = []
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function open(p: Omit<Pending, 'resolve'>) {
  return new Promise<boolean>((resolve) => {
    queue = [...queue, { ...p, resolve }]
    emit()
  })
}

function answer(ok: boolean) {
  const [first, ...rest] = queue
  if (!first) return
  queue = rest
  emit()
  first.resolve(ok)
}

/** Yes/no question; resolves true when confirmed. */
export const ask = (a: Ask) => open({ ...a, alert: false })

/** A message with a single OK button. */
export const tell = (title: string, message?: string) => open({ title, message, alert: true }).then(() => undefined)

/** Renders the dialog in front, if any. Mounted once in App. */
export function DialogHost() {
  const current = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => queue[0],
  )
  if (!current) return null
  return (
    <ConfirmDialog
      key={queue.length}
      title={current.title}
      message={current.message}
      confirmLabel={current.confirmLabel ?? (current.alert ? '확인' : '네')}
      cancelLabel={current.alert ? null : '아니요'}
      danger={current.danger}
      onConfirm={() => answer(true)}
      onCancel={() => answer(false)}
    />
  )
}

// ---- toast: a short note above the tab bar, with an optional action (되돌리기) ----

interface Toast {
  id: number
  message: string
  action?: { label: string; run: () => void }
}

let toastNow: Toast | null = null
let toastTimer: ReturnType<typeof setTimeout> | undefined
const toastListeners = new Set<() => void>()
const emitToast = () => toastListeners.forEach((l) => l())

export function toast(message: string, action?: Toast['action'], ms = 5000) {
  clearTimeout(toastTimer)
  toastNow = { id: (toastNow?.id ?? 0) + 1, message, action }
  emitToast()
  toastTimer = setTimeout(() => {
    toastNow = null
    emitToast()
  }, ms)
}

export function ToastHost() {
  const t = useSyncExternalStore(
    (l) => {
      toastListeners.add(l)
      return () => toastListeners.delete(l)
    },
    () => toastNow,
  )
  if (!t) return null
  return (
    <div className="toast" role="status" key={t.id}>
      <span>{t.message}</span>
      {t.action && (
        <button
          onClick={() => {
            t.action!.run()
            clearTimeout(toastTimer)
            toastNow = null
            emitToast()
          }}
        >
          {t.action.label}
        </button>
      )}
    </div>
  )
}
