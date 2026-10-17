import { useState, useRef, useEffect, useCallback } from 'react'
import type { PageSpread } from '../types'

interface UseDualSpreadInteractiveFlipOptions {
  clampedSpreadIndex: number
  paginatedSpreads: PageSpread[]
  isFirstSpread: boolean
  isLastSpread: boolean
  animType: 'instant' | 'slide' | 'curl'
  onPageTurnScreen: (direction: 'prev' | 'next') => void
}

export function useDualSpreadInteractiveFlip({
  clampedSpreadIndex,
  paginatedSpreads,
  isFirstSpread,
  isLastSpread,
  animType,
  onPageTurnScreen,
}: UseDualSpreadInteractiveFlipOptions) {
  const [turningState, setTurningState] = useState<{
    direction: 'prev' | 'next'
    turningSpread: PageSpread
    targetSpread: PageSpread
  } | null>(null)
  const [slideDir, setSlideDir] = useState<'prev' | 'next' | null>(null)
  const [interactiveFlip, setInteractiveFlip] = useState<{
    direction: 'prev' | 'next'
    turningSpread: PageSpread
    targetSpread: PageSpread
    angle: number
  } | null>(null)

  const dragSessionRef = useRef<{
    startX: number
    startY: number
    colSide: 'left' | 'right'
    colWidth: number
    hasStartedDrag: boolean
  } | null>(null)
  const prevSpreadRef = useRef(clampedSpreadIndex)

  // 监听翻页 index 变化，触发自动翻转动画
  useEffect(() => {
    if (clampedSpreadIndex !== prevSpreadRef.current) {
      const dir = clampedSpreadIndex > prevSpreadRef.current ? 'next' : 'prev'
      const oldSpread = paginatedSpreads[prevSpreadRef.current]
      const newSpread = paginatedSpreads[clampedSpreadIndex]
      prevSpreadRef.current = clampedSpreadIndex

      if (animType === 'curl' && oldSpread && newSpread) {
        setTurningState({ direction: dir, turningSpread: oldSpread, targetSpread: newSpread })
        const timer = setTimeout(() => setTurningState(null), 420)
        return () => clearTimeout(timer)
      } else if (animType === 'slide') {
        setSlideDir(dir)
        const timer = setTimeout(() => setSlideDir(null), 260)
        return () => clearTimeout(timer)
      }
    }
  }, [clampedSpreadIndex, animType, paginatedSpreads])

  // 开始拖拽或点击检测
  const startDrag = useCallback((clientX: number, clientY: number, side: 'left' | 'right', colWidth: number) => {
    dragSessionRef.current = { startX: clientX, startY: clientY, colSide: side, colWidth: Math.max(280, colWidth), hasStartedDrag: false }
  }, [])

  // 拖拽中：计算实时翻折角度并实现空中悬停
  const moveDrag = useCallback((clientX: number, clientY: number) => {
    const s = dragSessionRef.current
    if (!s) return
    const dx = clientX - s.startX
    const dy = clientY - s.startY
    if (!s.hasStartedDrag && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      if (typeof window !== 'undefined') {
        const sel = window.getSelection()
        if (sel && !sel.isCollapsed && sel.toString().trim().length >= 2) return
      }
      s.hasStartedDrag = true
    }
    if (!s.hasStartedDrag || animType !== 'curl') return

    if (s.colSide === 'right' && !isLastSpread && clampedSpreadIndex < paginatedSpreads.length - 1) {
      const ratio = Math.min(1, Math.max(0, -dx / s.colWidth))
      setInteractiveFlip({
        direction: 'next',
        turningSpread: paginatedSpreads[clampedSpreadIndex],
        targetSpread: paginatedSpreads[clampedSpreadIndex + 1],
        angle: -ratio * 180,
      })
    } else if (s.colSide === 'left' && !isFirstSpread && clampedSpreadIndex > 0) {
      const ratio = Math.min(1, Math.max(0, dx / s.colWidth))
      setInteractiveFlip({
        direction: 'prev',
        turningSpread: paginatedSpreads[clampedSpreadIndex],
        targetSpread: paginatedSpreads[clampedSpreadIndex - 1],
        angle: ratio * 180,
      })
    }
  }, [animType, clampedSpreadIndex, isFirstSpread, isLastSpread, paginatedSpreads])

  // 结束拖拽：判断是翻过还是弹回
  const endDrag = useCallback((clientX: number, onTurnFallback?: (side: 'left' | 'right') => void) => {
    const s = dragSessionRef.current
    dragSessionRef.current = null
    if (!s) return

    if (s.hasStartedDrag && interactiveFlip) {
      const isNext = interactiveFlip.direction === 'next'
      const completed = isNext ? interactiveFlip.angle <= -45 : interactiveFlip.angle >= 45
      setInteractiveFlip(null)
      if (completed) onPageTurnScreen(interactiveFlip.direction)
      return
    }

    setInteractiveFlip(null)
    const dx = clientX - s.startX
    if (!s.hasStartedDrag && Math.abs(dx) < 8 && onTurnFallback) {
      onTurnFallback(s.colSide)
    }
  }, [interactiveFlip, onPageTurnScreen])

  return {
    turningState,
    slideDir,
    interactiveFlip,
    startDrag,
    moveDrag,
    endDrag,
  }
}
