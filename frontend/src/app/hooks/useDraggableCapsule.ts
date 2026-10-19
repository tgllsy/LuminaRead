import React, { useState, useRef, useEffect, useCallback } from 'react'

export interface CapsulePosition {
  x: number
  y: number
}

interface DragMeta {
  pointerId: number
  startX: number
  startY: number
  originLeft: number
  originTop: number
  width: number
  height: number
  moved: boolean
}

const EDGE_MARGIN = 8
const DRAG_THRESHOLD_PX = 5

function clampToViewport(x: number, y: number, width: number, height: number): CapsulePosition {
  const maxX = Math.max(EDGE_MARGIN, window.innerWidth - width - EDGE_MARGIN)
  const maxY = Math.max(EDGE_MARGIN, window.innerHeight - height - EDGE_MARGIN)
  return {
    x: Math.min(Math.max(EDGE_MARGIN, Math.round(x)), maxX),
    y: Math.min(Math.max(EDGE_MARGIN, Math.round(y)), maxY),
  }
}

function loadSavedCapsulePos(storageKey: string, enabled: boolean): CapsulePosition | null {
  if (!enabled || typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(`lumina_drag_capsule_${storageKey}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CapsulePosition
    if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
      return clampToViewport(parsed.x, parsed.y, 240, 44)
    }
  } catch { /* ignore */ }
  return null
}

function saveCapsulePos(storageKey: string, pos: CapsulePosition) {
  try {
    sessionStorage.setItem(`lumina_drag_capsule_${storageKey}`, JSON.stringify(pos))
  } catch { /* ignore */ }
}

export function useDraggableCapsule(storageKey = 'default', enabled = true) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [position, setPosition] = useState<CapsulePosition | null>(() => loadSavedCapsulePos(storageKey, enabled))
  const [isDragging, setIsDragging] = useState(false)
  const dragMetaRef = useRef<DragMeta | null>(null)

  useEffect(() => {
    if (!enabled || !position) return
    const handleResize = () => {
      const rect = ref.current?.getBoundingClientRect()
      setPosition((prev) => (prev ? clampToViewport(prev.x, prev.y, rect?.width || 240, rect?.height || 44) : null))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [enabled, position])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!enabled || (e.pointerType === 'mouse' && e.button !== 0)) return
    if ((e.target as HTMLElement | null)?.closest('button, a, input')) return
    const rect = e.currentTarget.getBoundingClientRect()
    dragMetaRef.current = {
      pointerId: e.pointerId, startX: e.clientX, startY: e.clientY,
      originLeft: rect.left, originTop: rect.top, width: rect.width, height: rect.height, moved: false,
    }
    const handleMove = (ev: PointerEvent) => {
      const meta = dragMetaRef.current
      if (!meta || meta.pointerId !== ev.pointerId) return
      const dx = ev.clientX - meta.startX
      const dy = ev.clientY - meta.startY
      if (!meta.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
      meta.moved = true
      setIsDragging(true)
      const nextPos = clampToViewport(meta.originLeft + dx, meta.originTop + dy, meta.width, meta.height)
      setPosition(nextPos)
      saveCapsulePos(storageKey, nextPos)
    }
    const handleUp = (ev: PointerEvent) => {
      const meta = dragMetaRef.current
      if (!meta || meta.pointerId !== ev.pointerId) return
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
      setIsDragging(false)
      window.setTimeout(() => { dragMetaRef.current = null }, 50)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
  }, [enabled, storageKey])

  const onClickCapture = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (dragMetaRef.current?.moved) {
      e.preventDefault()
      e.stopPropagation()
      dragMetaRef.current = null
    }
  }, [])

  const dragStyle: React.CSSProperties | undefined = position
    ? { position: 'fixed', left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto', transform: 'none', touchAction: 'none', zIndex: 60 }
    : enabled ? { touchAction: 'none' } : undefined

  return { ref, position, isDragging, dragStyle, onPointerDown, onClickCapture }
}
