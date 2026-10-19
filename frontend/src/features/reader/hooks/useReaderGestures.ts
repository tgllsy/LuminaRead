import { useState, useEffect, useRef } from 'react'

interface UseReaderGesturesOptions {
  onPageTurnScreen: (direction: 'prev' | 'next') => void
  setShowTypography: (v: boolean) => void
  eInkMode?: boolean
  isHidden?: boolean
  isDualSpread?: boolean
}

export function resolveHotzoneAction(
  clientX: number,
  innerWidth: number,
  isDualSpread?: boolean,
  eInkMode?: boolean
): 'prev' | 'next' | 'menu' {
  const ratio = clientX / innerWidth
  if (isDualSpread) {
    if (ratio <= 0.48) return 'prev'
    if (ratio >= 0.52) return 'next'
    return 'menu'
  }
  const leftBound = eInkMode ? 0.35 : 0.30
  const rightBound = eInkMode ? 0.65 : 0.70
  if (ratio < leftBound) return 'prev'
  if (ratio > rightBound) return 'next'
  return 'menu'
}

export function useReaderGestures({
  onPageTurnScreen,
  setShowTypography,
  eInkMode,
  isHidden,
  isDualSpread,
}: UseReaderGesturesOptions) {
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
      const clientX = e.touches[0].clientX
      const vw = typeof window !== 'undefined' ? window.innerWidth : 0
      // 避让移动端左右边缘 24px 系统级返回/前进手势热区，防止翻页与浏览器历史导航冲突
      if (vw > 0 && (clientX < 24 || clientX > vw - 24)) {
        touchStartRef.current = null
        return
      }
      touchStartRef.current = { x: clientX, y: e.touches[0].clientY, time: Date.now() }
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
        if (sel && !sel.isCollapsed && sel.toString().trim().length >= 2) return
      }
      lastSwipeTimeRef.current = Date.now()
      onPageTurnScreen(dx < 0 ? 'next' : 'prev')
    }
  }

  const handleScreenHotzoneClick = (e: React.MouseEvent | { clientX: number }) => {
    if (Date.now() - lastSwipeTimeRef.current < 450) return
    if (typeof window !== 'undefined') {
      const sel = window.getSelection()
      if (sel && !sel.isCollapsed && sel.toString().trim().length >= 2) return
    }
    const action = resolveHotzoneAction(e.clientX, window.innerWidth, isDualSpread, eInkMode)
    if (action === 'prev') onPageTurnScreen('prev')
    else if (action === 'next') onPageTurnScreen('next')
    else {
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
