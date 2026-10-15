import { useState, useRef, useEffect } from 'react'
import { computeDragStyle, getPageTurnAnimClass } from '../helpers/pageAnimationHelpers'

interface UsePageTurnAnimationOptions {
  clampedSpreadIndex: number
  isFirstPage: boolean
  isLastPage: boolean
  animType: 'instant' | 'slide' | 'curl'
  onPageTurnScreen: (direction: 'prev' | 'next') => void
}

export function usePageTurnAnimation({
  clampedSpreadIndex,
  isFirstPage,
  isLastPage,
  animType,
  onPageTurnScreen,
}: UsePageTurnAnimationOptions) {
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [turnDirection, setTurnDirection] = useState<'prev' | 'next' | null>(null)
  const [turningSingleState, setTurningSingleState] = useState<{
    direction: 'prev' | 'next'
    fromSpreadIndex: number
  } | null>(null)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const prevSpreadRef = useRef(clampedSpreadIndex)

  useEffect(() => {
    if (clampedSpreadIndex === prevSpreadRef.current) return
    const dir = clampedSpreadIndex > prevSpreadRef.current ? 'next' : 'prev'
    const oldIndex = prevSpreadRef.current
    prevSpreadRef.current = clampedSpreadIndex

    if (animType === 'curl') {
      setTurningSingleState({ direction: dir, fromSpreadIndex: oldIndex })
      const timer = setTimeout(() => setTurningSingleState(null), 320)
      return () => clearTimeout(timer)
    }
    if (animType === 'slide') {
      setTurnDirection(dir)
      const timer = setTimeout(() => setTurnDirection(null), 300)
      return () => clearTimeout(timer)
    }
  }, [clampedSpreadIndex, animType])

  const onTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() }
    }
  }

  const onTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    if (!touchStartRef.current || e.touches.length !== 1) return
    const dx = e.touches[0].clientX - touchStartRef.current.x
    const dy = e.touches[0].clientY - touchStartRef.current.y
    if (Math.abs(dx) > Math.abs(dy) * 1.2 && Math.abs(dx) > 8) {
      setDragOffset(((isFirstPage && dx > 0) || (isLastPage && dx < 0)) ? dx * 0.35 : dx)
      setIsDragging(true)
    }
  }

  const onTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    if (!touchStartRef.current || e.changedTouches.length !== 1) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dt = Date.now() - touchStartRef.current.time
    touchStartRef.current = null
    if (isDragging && (Math.abs(dx) > 50 || Math.abs(dx) / Math.max(1, dt) > 0.35)) {
      onPageTurnScreen(dx < 0 ? 'next' : 'prev')
    }
    setIsDragging(false)
    setDragOffset(0)
  }

  const animClass = getPageTurnAnimClass(animType, turnDirection)
  const dragStyle = computeDragStyle(dragOffset, animType, isDragging)

  return { onTouchStart, onTouchMove, onTouchEnd, animClass, dragStyle, isDragging, turningSingleState }
}
