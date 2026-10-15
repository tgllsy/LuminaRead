import { useState, useEffect, useRef } from 'react'

interface UseReaderGesturesOptions {
  onPageTurnScreen: (direction: 'prev' | 'next') => void
  setShowTypography: (v: boolean) => void
  eInkMode?: boolean
  isHidden?: boolean
}

export function useReaderGestures({ onPageTurnScreen, setShowTypography, eInkMode, isHidden }: UseReaderGesturesOptions) {
  const [immersiveHudVisible, setImmersiveHudVisible] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const lastSwipeTimeRef = useRef(0)
  const lastScrollYRef = useRef(0)
  const scrollIdleTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (isHidden) return
    const onScroll = () => {
      const currentY = window.scrollY
      if (Math.abs(currentY - lastScrollYRef.current) > 4) {
        setIsScrolling(true)
        if (scrollIdleTimerRef.current !== null) window.clearTimeout(scrollIdleTimerRef.current)
        scrollIdleTimerRef.current = window.setTimeout(() => setIsScrolling(false), 650)
      }
      if (immersiveHudVisible && Math.abs(currentY - lastScrollYRef.current) > 48) {
        setImmersiveHudVisible(false)
        setShowTypography(false)
      }
      lastScrollYRef.current = currentY
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (scrollIdleTimerRef.current !== null) window.clearTimeout(scrollIdleTimerRef.current)
    }
  }, [isHidden, immersiveHudVisible, setShowTypography])

  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() }
    }
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    if (!touchStartRef.current || e.changedTouches.length !== 1) return
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y
    const dt = Date.now() - touchStartRef.current.time
    touchStartRef.current = null

    if (dt < 600 && Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 1.8) {
      if (typeof window !== 'undefined') {
        const sel = window.getSelection()
        if (sel && !sel.isCollapsed && sel.toString().trim().length >= 2) {
          return
        }
      }
      lastSwipeTimeRef.current = Date.now()
      if (dx < 0) onPageTurnScreen('next')
      else onPageTurnScreen('prev')
    }
  }

  // 经典三分屏热区点击（左 30% 上一页，右 30% 下一页，中 40% 呼出菜单；墨水屏模式为 35%/35%/30%）
  const handleScreenHotzoneClick = (e: React.MouseEvent | { clientX: number }) => {
    if (Date.now() - lastSwipeTimeRef.current < 450) return
    if (typeof window !== 'undefined') {
      const sel = window.getSelection()
      if (sel && !sel.isCollapsed && sel.toString().trim().length >= 2) return
    }
    const ratio = e.clientX / window.innerWidth
    const leftBound = eInkMode ? 0.35 : 0.30
    const rightBound = eInkMode ? 0.65 : 0.70

    if (ratio < leftBound) {
      onPageTurnScreen('prev')
    } else if (ratio > rightBound) {
      onPageTurnScreen('next')
    } else {
      setImmersiveHudVisible((v) => !v)
      setShowTypography(false)
    }
  }


  return {
    immersiveHudVisible,
    setImmersiveHudVisible,
    isScrolling,
    touchStartRef,
    lastSwipeTimeRef,
    handleTouchStart,
    handleTouchEnd,
    handleScreenHotzoneClick,
  }
}
