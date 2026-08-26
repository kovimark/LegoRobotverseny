import React, { useCallback, useEffect, useRef, useState } from 'react'
import './PuzzleCaptcha.css'

const PUZZLE_THEMES = [
  {
    name: 'Robot Aréna',
    shapes: [
      { type: 'rect', x: 20, y: 30, w: 60, h: 40, color: '#f39c12' },
      { type: 'circle', x: 180, y: 60, r: 28, color: '#e74c3c' },
      { type: 'rect', x: 240, y: 70, w: 45, h: 45, color: '#2ecc71' },
      { type: 'circle', x: 90, y: 110, r: 20, color: '#3498db' },
      { type: 'line', x1: 0, y1: 120, x2: 320, y2: 120, color: '#f1c40f', width: 4 }
    ]
  },
  {
    name: 'LEGO Pálya',
    shapes: [
      { type: 'circle', x: 60, y: 50, r: 35, color: '#e67e22' },
      { type: 'rect', x: 130, y: 25, w: 70, h: 50, color: '#9b59b6' },
      { type: 'circle', x: 250, y: 90, r: 25, color: '#1abc9c' },
      { type: 'rect', x: 40, y: 95, w: 80, h: 30, color: '#e74c3c' },
      { type: 'line', x1: 20, y1: 40, x2: 280, y2: 130, color: '#00d2d3', width: 3 }
    ]
  },
  {
    name: 'Verseny Startvonal',
    shapes: [
      { type: 'rect', x: 50, y: 40, w: 50, h: 50, color: '#ff4757' },
      { type: 'circle', x: 140, y: 80, r: 32, color: '#ffa502' },
      { type: 'rect', x: 210, y: 35, w: 65, h: 45, color: '#2ed573' },
      { type: 'circle', x: 270, y: 105, r: 22, color: '#1e90ff' },
      { type: 'line', x1: 50, y1: 135, x2: 290, y2: 25, color: '#ff6b81', width: 3 }
    ]
  },
  {
    name: 'Szumó Kör',
    shapes: [
      { type: 'circle', x: 160, y: 75, r: 55, color: '#ffffff' },
      { type: 'circle', x: 160, y: 75, r: 45, color: '#111111' },
      { type: 'rect', x: 40, y: 30, w: 40, h: 40, color: '#ff3838' },
      { type: 'rect', x: 240, y: 80, w: 40, h: 40, color: '#17c0eb' }
    ]
  }
]

const PUZZLE_SIZE = 44
const PUZZLE_RADIUS = 7
const CANVAS_WIDTH = 320
const CANVAS_HEIGHT = 150
const MAX_SLIDER = CANVAS_WIDTH - PUZZLE_SIZE // 276
const TOLERANCE_PX = 12

export default function PuzzleCaptcha({ onVerify, isVerified = false, onReset }) {
  const [themeIndex, setThemeIndex] = useState(0)
  const [targetX, setTargetX] = useState(160)
  const [targetY, setTargetY] = useState(45)
  const [sliderValue, setSliderValue] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [status, setStatus] = useState(isVerified ? 'success' : 'idle') // 'idle' | 'success' | 'fail'

  const bgCanvasRef = useRef(null)
  const pieceCanvasRef = useRef(null)
  const containerRef = useRef(null)
  const sliderTrackRef = useRef(null)

  const isDraggingRef = useRef(false)
  const sliderValueRef = useRef(0)
  const targetXRef = useRef(160)
  const dragStartXRef = useRef(0)
  const dragStartValRef = useRef(0)

  // Új puzzle pozíció és téma generálása
  const initPuzzle = useCallback(() => {
    if (isVerified) return
    setStatus('idle')
    setSliderValue(0)
    sliderValueRef.current = 0
    if (onReset) onReset()

    const randomTheme = Math.floor(Math.random() * PUZZLE_THEMES.length)
    setThemeIndex(randomTheme)

    // Cél pozíció (X: 80 és 240 között, Y: 20 és 85 között)
    const newTargetX = Math.floor(Math.random() * 160) + 80
    const newTargetY = Math.floor(Math.random() * 65) + 20

    setTargetX(newTargetX)
    targetXRef.current = newTargetX
    setTargetY(newTargetY)
  }, [isVerified, onReset])

  // Kirajzolja a puzzle darab alakzatát
  const createPuzzlePath = (ctx, x, y, size, radius) => {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + size / 2 - radius, y)
    ctx.arc(x + size / 2, y - radius, radius, Math.PI * 0.8, Math.PI * 0.2, false)
    ctx.lineTo(x + size, y)
    ctx.lineTo(x + size, y + size / 2 - radius)
    ctx.arc(x + size + radius, y + size / 2, radius, Math.PI * 1.3, Math.PI * 0.7, false)
    ctx.lineTo(x + size, y + size)
    ctx.lineTo(x + size / 2 + radius, y + size)
    ctx.arc(x + size / 2, y + size - radius, radius, Math.PI * 0.2, Math.PI * 0.8, true)
    ctx.lineTo(x, y + size)
    ctx.lineTo(x, y)
    ctx.closePath()
  }

  // Háttér és mozgó darabka rajzolása
  const drawBackground = useCallback((theme, tx, ty) => {
    const bgCanvas = bgCanvasRef.current
    const pieceCanvas = pieceCanvasRef.current
    if (!bgCanvas || !pieceCanvas) return

    const bgCtx = bgCanvas.getContext('2d')
    const pieceCtx = pieceCanvas.getContext('2d')

    // Háttér gradiens
    const bgGrad = bgCtx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    bgGrad.addColorStop(0, '#16222f')
    bgGrad.addColorStop(0.5, '#203a43')
    bgGrad.addColorStop(1, '#0f2027')
    bgCtx.fillStyle = bgGrad
    bgCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Rácsvonalak
    bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
    bgCtx.lineWidth = 1
    for (let x = 0; x < CANVAS_WIDTH; x += 20) {
      bgCtx.beginPath()
      bgCtx.moveTo(x, 0)
      bgCtx.lineTo(x, CANVAS_HEIGHT)
      bgCtx.stroke()
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 20) {
      bgCtx.beginPath()
      bgCtx.moveTo(0, y)
      bgCtx.lineTo(CANVAS_WIDTH, y)
      bgCtx.stroke()
    }

    // Alakzatok
    theme.shapes.forEach((shape) => {
      bgCtx.fillStyle = shape.color
      bgCtx.strokeStyle = shape.color
      if (shape.type === 'rect') {
        bgCtx.fillRect(shape.x, shape.y, shape.w, shape.h)
        bgCtx.fillStyle = 'rgba(255,255,255,0.2)'
        bgCtx.fillRect(shape.x + 2, shape.y + 2, shape.w - 4, 4)
      } else if (shape.type === 'circle') {
        bgCtx.beginPath()
        bgCtx.arc(shape.x, shape.y, shape.r, 0, Math.PI * 2)
        bgCtx.fill()
      } else if (shape.type === 'line') {
        bgCtx.lineWidth = shape.width || 2
        bgCtx.beginPath()
        bgCtx.moveTo(shape.x1, shape.y1)
        bgCtx.lineTo(shape.x2, shape.y2)
        bgCtx.stroke()
      }
    })

    // LEGO bütykök
    bgCtx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    for (let bx = 15; bx < CANVAS_WIDTH; bx += 38) {
      bgCtx.beginPath()
      bgCtx.arc(bx, 15, 5, 0, Math.PI * 2)
      bgCtx.fill()
    }

    // Puzzle darab kivágása a teljes háttérből
    pieceCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    pieceCtx.save()
    createPuzzlePath(pieceCtx, tx, ty, PUZZLE_SIZE, PUZZLE_RADIUS)
    pieceCtx.clip()
    pieceCtx.drawImage(bgCanvas, 0, 0)
    pieceCtx.strokeStyle = '#ffffff'
    pieceCtx.lineWidth = 2.5
    pieceCtx.stroke()
    pieceCtx.restore()

    // A háttéren lévő lyuk kirajzolása
    bgCtx.save()
    createPuzzlePath(bgCtx, tx, ty, PUZZLE_SIZE, PUZZLE_RADIUS)
    bgCtx.fillStyle = 'rgba(0, 0, 0, 0.75)'
    bgCtx.fill()
    bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
    bgCtx.lineWidth = 2
    bgCtx.stroke()
    bgCtx.restore()
  }, [])

  useEffect(() => {
    initPuzzle()
  }, [initPuzzle])

  useEffect(() => {
    const theme = PUZZLE_THEMES[themeIndex] || PUZZLE_THEMES[0]
    drawBackground(theme, targetX, targetY)
  }, [themeIndex, targetX, targetY, drawBackground])

  useEffect(() => {
    if (isVerified) {
      setStatus('success')
      setSliderValue(targetX)
      sliderValueRef.current = targetX
    }
  }, [isVerified, targetX])

  // Drag kezelése
  const startDrag = (clientX) => {
    if (status === 'success' || isVerified) return
    isDraggingRef.current = true
    setIsDragging(true)
    dragStartXRef.current = clientX
    dragStartValRef.current = sliderValueRef.current
    setStatus('idle')
  }

  const handlePointerDown = (e) => {
    const clientX = e.clientX ?? e.touches?.[0]?.clientX
    if (clientX !== undefined) {
      startDrag(clientX)
    }
  }

  useEffect(() => {
    const handleMove = (e) => {
      if (!isDraggingRef.current) return
      const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : null)
      if (clientX === null || clientX === undefined) return

      const delta = clientX - dragStartXRef.current
      const nextVal = Math.max(0, Math.min(MAX_SLIDER, dragStartValRef.current + delta))
      sliderValueRef.current = nextVal
      setSliderValue(nextVal)
    }

    const handleEnd = () => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      setIsDragging(false)

      const currentVal = sliderValueRef.current
      const target = targetXRef.current
      const diff = Math.abs(currentVal - target)

      if (diff <= TOLERANCE_PX) {
        setStatus('success')
        sliderValueRef.current = target
        setSliderValue(target)
        if (onVerify) onVerify(true)
      } else {
        setStatus('fail')
        if (onVerify) onVerify(false)
        setTimeout(() => {
          if (!isDraggingRef.current) {
            sliderValueRef.current = 0
            setSliderValue(0)
            setStatus('idle')
          }
        }, 650)
      }
    }

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleEnd)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }
  }, [onVerify])

  return (
    <div className={`puzzle-captcha-card ${status}`} ref={containerRef}>
      <div className="puzzle-captcha-header">
        <div className="puzzle-title">
          <i className="bi bi-shield-lock-fill text-warning me-2" />
          <span className="fw-semibold">Biztonsági ellenőrzés</span>
        </div>
        <button
          type="button"
          className="puzzle-refresh-btn"
          onClick={initPuzzle}
          title="Új puzzle kép generálása"
          aria-label="Új puzzle"
          disabled={status === 'success' || isVerified}
        >
          <i className="bi bi-arrow-clockwise" />
        </button>
      </div>

      <div className="puzzle-canvas-area">
        {/* Háttér kép és a hiányzó forma */}
        <canvas
          ref={bgCanvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="puzzle-bg-canvas"
        />

        {/* Mozgó puzzle darab */}
        <canvas
          ref={pieceCanvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="puzzle-piece-canvas"
          style={{
            transform: `translateX(${sliderValue - targetX}px)`,
            filter: status === 'success' ? 'drop-shadow(0 0 10px #2ecc71)' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))'
          }}
        />

        {/* Visszajelzők */}
        {status === 'success' && (
          <div className="puzzle-overlay success-overlay">
            <i className="bi bi-check-circle-fill text-success fs-1 mb-1" />
            <span className="fw-bold text-white">Sikeres ellenőrzés!</span>
          </div>
        )}
        {status === 'fail' && (
          <div className="puzzle-overlay fail-overlay">
            <i className="bi bi-x-circle-fill text-danger fs-1 mb-1" />
            <span className="fw-bold text-white">Illeszd pontosan a helyére!</span>
          </div>
        )}
      </div>

      {/* Csúszka sáv */}
      <div className="puzzle-slider-container">
        <div className="puzzle-slider-track" ref={sliderTrackRef}>
          <div
            className="puzzle-slider-fill"
            style={{ width: `${sliderValue + 20}px` }}
          />
          <div
            className={`puzzle-slider-handle ${isDragging ? 'dragging' : ''} ${status}`}
            style={{ transform: `translateX(${sliderValue}px)` }}
            onMouseDown={handlePointerDown}
            onTouchStart={handlePointerDown}
          >
            {status === 'success' ? (
              <i className="bi bi-check-lg" />
            ) : status === 'fail' ? (
              <i className="bi bi-arrow-repeat" />
            ) : (
              <i className="bi bi-chevron-right" />
            )}
          </div>
          <span className="puzzle-slider-text">
            {status === 'success'
              ? 'Emberi ellenőrzés sikeres ✓'
              : 'Húzd a csúszkát a puzzle helyére'}
          </span>
        </div>
      </div>
    </div>
  )
}
