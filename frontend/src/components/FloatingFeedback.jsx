import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const recentActionElements = []

if (typeof document !== 'undefined' && !window.__robotFeedbackTrackerInstalled) {
  window.__robotFeedbackTrackerInstalled = true
  document.addEventListener('click', (event) => {
    const element = event.target.closest('button, [role="button"], input[type="submit"], a.btn')
    if (!element) return
    recentActionElements.unshift(element)
    if (recentActionElements.length > 20) recentActionElements.length = 20
  }, true)
}

const findAnchor = () => recentActionElements.find((element) => element?.isConnected)

export default function FloatingFeedback({ message, onClose }) {
  const bubbleRef = useRef(null)
  const [position, setPosition] = useState(null)
  const text = typeof message === 'string' ? message : message?.text
  const type = typeof message === 'object' ? message?.type : 'danger'

  useLayoutEffect(() => {
    if (!text) return undefined
    const updatePosition = () => {
      const anchor = findAnchor()
      const bubble = bubbleRef.current
      if (!anchor || !bubble) return setPosition({ top: 80, right: 18 })
      const anchorRect = anchor.getBoundingClientRect()
      const bubbleRect = bubble.getBoundingClientRect()
      const left = Math.max(12, Math.min(window.innerWidth - bubbleRect.width - 12, anchorRect.right - bubbleRect.width))
      const fitsBelow = anchorRect.bottom + 12 + bubbleRect.height < window.innerHeight
      setPosition({ left, top: fitsBelow ? anchorRect.bottom + 10 : Math.max(12, anchorRect.top - bubbleRect.height - 10) })
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => { window.removeEventListener('resize', updatePosition); window.removeEventListener('scroll', updatePosition, true) }
  }, [text])

  useEffect(() => {
    if (!text || !onClose) return undefined
    const timeoutId = window.setTimeout(onClose, 6000)
    return () => window.clearTimeout(timeoutId)
  }, [text, onClose])

  if (!text) return null
  const icon = type === 'success' ? 'bi-check-circle-fill' : type === 'info' ? 'bi-info-circle-fill' : 'bi-exclamation-triangle-fill'
  return createPortal(<div ref={bubbleRef} className={`floating-feedback floating-feedback-${type || 'danger'}`} style={position || { visibility: 'hidden' }} role="status"><i className={`bi ${icon}`} /><span>{text}</span>{onClose && <button type="button" className="btn-close btn-close-white" aria-label="Bezárás" onClick={onClose} />}</div>, document.body)
}
