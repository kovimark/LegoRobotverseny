import React, { useEffect, useMemo, useRef, useState } from 'react'

const formatElapsed = (ms) => (ms / 1000).toFixed(3)
const clampToZero = (value) => Math.max(0, value)

export default function PrecisionStopwatch({
  onCapture,
  onFinished,
  disabled = false,
  className = '',
  mode = 'countup',
  initialSeconds = 0,
  startHint = 'Indítás',
  stopHint,
  subHint = 'Koppints a stopperre'
}) {
  const [running, setRunning] = useState(false)
  const initialMs = useMemo(() => Math.max(0, Number(initialSeconds || 0) * 1000), [initialSeconds])
  const [elapsedMs, setElapsedMs] = useState(mode === 'countdown' ? initialMs : 0)
  const startRef = useRef(0)
  const offsetRef = useRef(0)
  const frameRef = useRef(null)

  useEffect(() => {
    setRunning(false)
    setElapsedMs(mode === 'countdown' ? initialMs : 0)
    offsetRef.current = 0
  }, [mode, initialMs])

  useEffect(() => {
    if (!running) {
      return undefined
    }

    const tick = () => {
      const now = performance.now()
      const elapsedSinceStart = now - startRef.current + offsetRef.current

      if (mode === 'countdown') {
        const remaining = clampToZero(initialMs - elapsedSinceStart)
        setElapsedMs(remaining)

        if (remaining <= 0) {
          setRunning(false)
          offsetRef.current = initialMs
          if (onCapture) {
            onCapture(formatElapsed(0))
          }
          if (onFinished) {
            onFinished()
          }
          return
        }
      } else {
        setElapsedMs(elapsedSinceStart)
      }

      frameRef.current = window.requestAnimationFrame(tick)
    }

    frameRef.current = window.requestAnimationFrame(tick)

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current)
      }
    }
  }, [initialMs, mode, onCapture, onFinished, running])

  const secondsDisplay = useMemo(() => formatElapsed(elapsedMs), [elapsedMs])
  const effectiveStopHint = stopHint || (mode === 'countdown' ? 'Megállítás' : 'Megállítás és kitöltés')

  const handleStart = () => {
    if (disabled || running) return

    if (mode === 'countdown' && elapsedMs <= 0) {
      setElapsedMs(initialMs)
      offsetRef.current = 0
    }

    startRef.current = performance.now()

    if (mode === 'countdown') {
      offsetRef.current = clampToZero(initialMs - elapsedMs)
    } else {
      offsetRef.current = elapsedMs
    }

    setRunning(true)
  }

  const handleStop = () => {
    if (!running) return
    const now = performance.now()
    setRunning(false)

    if (mode === 'countdown') {
      const elapsedSinceStart = now - startRef.current + offsetRef.current
      const remaining = clampToZero(initialMs - elapsedSinceStart)
      setElapsedMs(remaining)
      offsetRef.current = clampToZero(initialMs - remaining)
      if (onCapture) {
        onCapture(formatElapsed(remaining))
      }
    } else {
      const exactElapsed = Math.max(0, now - startRef.current + offsetRef.current)
      setElapsedMs(exactElapsed)
      offsetRef.current = exactElapsed
      const formatted = formatElapsed(exactElapsed)
      if (onCapture) {
        onCapture(formatted)
      }
    }
  }

  const handleReset = () => {
    setRunning(false)
    setElapsedMs(mode === 'countdown' ? initialMs : 0)
    offsetRef.current = 0
  }

  const handleToggle = () => {
    if (running) {
      handleStop()
    } else {
      handleStart()
    }
  }

  return (
    <div className={`precision-stopwatch ${running ? 'running' : ''} ${className}`.trim()}>
      <button
        type="button"
        className="precision-stopwatch__touch-area"
        onClick={handleToggle}
        disabled={disabled}
        aria-pressed={running}
      >
        <span className="precision-stopwatch__hint">{running ? effectiveStopHint : startHint}</span>
        <span className="precision-stopwatch__display" aria-live="polite">{secondsDisplay} s</span>
        <span className="precision-stopwatch__subhint">{subHint}</span>
      </button>
      <button type="button" className="precision-stopwatch__reset" onClick={handleReset} disabled={disabled} aria-label="Stopper nullázása">
        <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
      </button>
    </div>
  )
}
