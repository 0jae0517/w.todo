import { useEffect } from 'react'

/** A small centered yes/no dialog, drawn above any open sheet. */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = '아니요',
  danger,
  onConfirm,
  onCancel,
}: {
  title: string
  message?: string
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    // capture + stop so Escape closes only this dialog, not the sheet underneath
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      onCancel()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onCancel])

  return (
    <div className="confirm-backdrop" onClick={(e) => { e.stopPropagation(); onCancel() }}>
      <div className="confirm" role="alertdialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2 className="confirm-title">{title}</h2>
        {message && <p className="confirm-msg">{message}</p>}
        <div className="confirm-actions">
          <button onClick={onCancel}>{cancelLabel}</button>
          <button className={danger ? 'is-danger' : 'is-primary'} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Asks before unfollowing (or withdrawing a pending follow request). */
export function UnfollowConfirm({
  name,
  state,
  onConfirm,
  onCancel,
}: {
  name: string
  state: 'following' | 'requested'
  onConfirm: () => void
  onCancel: () => void
}) {
  return state === 'requested' ? (
    <ConfirmDialog
      title={`${name}님에게 보낸 팔로우 요청을 취소할까요?`}
      confirmLabel="요청 취소"
      danger
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  ) : (
    <ConfirmDialog
      title={`${name}님 팔로우를 취소할까요?`}
      message="취소하면 할 일을 더 이상 볼 수 없고, 다시 팔로우하려면 상대의 수락이 필요해요."
      confirmLabel="팔로우 취소"
      danger
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
