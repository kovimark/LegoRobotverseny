import React, { useEffect, useId, useState } from 'react'

export default function ConfirmModal({
  open,
  title = 'Megerősítés',
  children,
  confirmLabel = 'Megerősítés',
  cancelLabel = 'Mégse',
  confirmVariant = 'danger',
  requiredText = '',
  requiredTextLabel,
  busy = false,
  onConfirm,
  onClose
}) {
  const titleId = useId()
  const descriptionId = useId()
  const [typedText, setTypedText] = useState('')

  useEffect(() => {
    if (!open) return undefined
    setTypedText('')
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, busy, onClose])

  if (!open) return null
  const canConfirm = !busy && (!requiredText || typedText === requiredText)

  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content shadow">
            <div className="modal-header">
              <h2 className="modal-title fs-5" id={titleId}>{title}</h2>
              <button type="button" className="btn-close" aria-label="Bezárás" disabled={busy} onClick={onClose} />
            </div>
            <div className="modal-body" id={descriptionId}>
              <div>{children}</div>
              {requiredText && (
                <div className="mt-3">
                  <label className="form-label" htmlFor={`${titleId}-confirmation`}>
                    {requiredTextLabel || <>A folytatáshoz írd be: <strong>{requiredText}</strong></>}
                  </label>
                  <input
                    id={`${titleId}-confirmation`}
                    className="form-control"
                    value={typedText}
                    autoFocus
                    autoComplete="off"
                    onChange={(event) => setTypedText(event.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" disabled={busy} onClick={onClose}>{cancelLabel}</button>
              <button type="button" className={`btn btn-${confirmVariant}`} disabled={!canConfirm} onClick={onConfirm}>
                {busy ? 'Folyamatban...' : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onMouseDown={() => { if (!busy) onClose() }} />
    </>
  )
}
