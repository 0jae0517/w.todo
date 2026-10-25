import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

/**
 * Vertical drag-to-reorder for a list of blocks. Touch and pen pick an item up
 * after a short press (so normal scrolling still works); a mouse picks it up as
 * soon as it moves. Calls `onDrop` with the ids in their new order.
 */
export function useDragSort(ids: string[], onDrop: (ids: string[]) => void) {
  const refs = useRef(new Map<string, HTMLElement>())
  const [drag, setDrag] = useState<{ id: string; dy: number; to: number; height: number } | null>(null)
  // set right after a drag so the click that follows pointerup is ignored
  const justDragged = useRef(false)

  const register = (id: string) => (el: HTMLElement | null) => {
    if (el) refs.current.set(id, el)
    else refs.current.delete(id)
  }

  const start = (id: string) => (e: ReactPointerEvent) => {
    if (e.button !== 0) return
    const from = ids.indexOf(id)
    if (from < 0) return
    const startY = e.clientY
    const rects = ids.map((x) => refs.current.get(x)!.getBoundingClientRect())
    const mids = rects.map((r) => r.top + r.height / 2)
    // distance to the neighbouring block, so gaps between blocks are kept
    const height =
      from < rects.length - 1 ? rects[from + 1].top - rects[from].top : from > 0 ? rects[from].bottom - rects[from - 1].bottom : rects[from].height
    let active = false
    let to = from
    const isMouse = e.pointerType === 'mouse'

    const activate = () => {
      active = true
      navigator.vibrate?.(15)
      setDrag({ id, dy: 0, to: from, height })
    }
    const timer = isMouse ? undefined : setTimeout(activate, 300)

    const blockScroll = (ev: TouchEvent) => active && ev.preventDefault()
    const move = (ev: PointerEvent) => {
      const dy = ev.clientY - startY
      if (!active) {
        if (isMouse && Math.abs(dy) > 5) activate()
        else if (!isMouse && Math.abs(dy) > 8) return cleanup() // it's a scroll
        if (!active) return
      }
      const center = mids[from] + dy
      to = mids.filter((m, i) => i !== from && m < center).length
      setDrag({ id, dy, to, height })
    }
    const up = () => {
      if (active) {
        justDragged.current = true
        setTimeout(() => (justDragged.current = false), 0)
        if (to !== from) {
          const next = ids.filter((x) => x !== id)
          next.splice(to, 0, id)
          onDrop(next)
        }
      }
      cleanup()
    }
    const cleanup = () => {
      clearTimeout(timer)
      setDrag(null)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cleanup)
      window.removeEventListener('touchmove', blockScroll)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cleanup)
    window.addEventListener('touchmove', blockScroll, { passive: false })
  }

  /** inline style for the block with this id while a drag is in progress */
  const styleFor = (id: string): React.CSSProperties | undefined => {
    if (!drag) return undefined
    const from = ids.indexOf(drag.id)
    const i = ids.indexOf(id)
    if (id === drag.id) return { transform: `translateY(${drag.dy}px)`, zIndex: 2, position: 'relative' }
    let shift = 0
    if (from < drag.to && i > from && i <= drag.to) shift = -drag.height
    if (from > drag.to && i < from && i >= drag.to) shift = drag.height
    return { transform: `translateY(${shift}px)`, transition: 'transform 0.15s' }
  }

  return { register, start, styleFor, dragging: drag?.id ?? null, justDragged }
}
