import { useEffect, useRef } from 'react'

/**
 * The back button / back gesture closes what's open (a sheet, a dialog, a
 * tab other than 할 일) instead of leaving the app. Each open thing adds one
 * browser history entry; back pops the topmost one.
 */

const stack: { id: number; close: () => void }[] = []
/** history entries of ours currently above the page's own */
let depth = 0
/** popstates we caused ourselves */
let ignore = 0
let next = 0
let pending: ReturnType<typeof setTimeout> | undefined

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    if (ignore) {
      ignore--
      return
    }
    depth = Math.max(0, depth - 1)
    stack.pop()?.close()
  })
}

/** True when back would close something rather than leave the app. */
export const canGoBack = () => stack.length > 0

/** Drops history entries left by things closed some other way (a button, a tap outside). */
function reconcile() {
  pending = undefined
  const extra = depth - stack.length
  if (extra <= 0) return
  depth -= extra
  ignore++
  history.go(-extra)
}

function push(close: () => void) {
  const id = ++next
  history.pushState({ ...history.state, back: id }, '')
  depth++
  stack.push({ id, close })
  return () => {
    const i = stack.findIndex((e) => e.id === id)
    if (i < 0) return // closed by back: its history entry is already gone
    stack.splice(i, 1)
    // several things can close in one go (a dialog and its sheet): drop their entries together
    clearTimeout(pending)
    pending = setTimeout(reconcile)
  }
}

/** While `active`, back calls `onBack` (usually the close handler). */
export function useBack(onBack: () => void, active = true) {
  const ref = useRef(onBack)
  ref.current = onBack
  useEffect(() => {
    if (!active) return
    return push(() => ref.current())
  }, [active])
}
