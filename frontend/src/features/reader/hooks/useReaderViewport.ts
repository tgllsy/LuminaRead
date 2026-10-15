import { useState, useEffect } from 'react'
import type React from 'react'
import { SIDEBAR_PIN_STORAGE_KEY, SIDEBAR_DOCK_SIDE_KEY } from '../constants'

export type SidebarDockSide = 'left' | 'right' | 'none'

export function getVisibleParagraphIndex(
  paragraphRefs: React.MutableRefObject<Record<number, HTMLDivElement | null>>,
  ttsActivePara: number | null,
  focusedPara: { chapterIndex: number; paragraphIndex: number } | null,
  chapterIndex: number
): number {
  if (ttsActivePara !== null) return ttsActivePara
  if (focusedPara && focusedPara.chapterIndex === chapterIndex) return focusedPara.paragraphIndex
  if (typeof window === 'undefined') return 0
  let bestIdx = 0
  let bestDist = Infinity
  for (const [k, el] of Object.entries(paragraphRefs.current)) {
    if (!el) continue
    const rect = el.getBoundingClientRect()
    if (rect.bottom >= 60 && rect.top < window.innerHeight - 40) {
      const dist = Math.abs(rect.top - 100)
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = Number(k)
      }
    }
  }
  return bestIdx
}

export function useReaderViewport() {
  const [windowWidth, setWindowWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1440
  )
  const [windowHeight, setWindowHeight] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerHeight : 900
  )
  const [sidebarDockSide, setSidebarDockSide] = useState<SidebarDockSide>(() => {
    try {
      const savedSide = localStorage.getItem(SIDEBAR_DOCK_SIDE_KEY) as SidebarDockSide | null
      if (savedSide === 'left' || savedSide === 'right' || savedSide === 'none') return savedSide
      const legacyPinned = localStorage.getItem(SIDEBAR_PIN_STORAGE_KEY)
      return legacyPinned === 'false' ? 'none' : 'left'
    } catch {
      return 'left'
    }
  })

  useEffect(() => {
    const onResize = () => {
      setWindowWidth(window.innerWidth)
      setWindowHeight(window.innerHeight)
    }
    window.addEventListener('resize', onResize, { passive: true })
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const isDesktop = windowWidth >= 1024
  const canPinSidebar = windowWidth >= 768
  const isSidebarPinned = sidebarDockSide !== 'none'

  const toggleSidebarDock = (side?: 'left' | 'right' | 'none') => {
    setSidebarDockSide((prev) => {
      let next: SidebarDockSide
      if (!side) {
        next = prev === 'none' ? 'left' : 'none'
      } else if (side === 'none') {
        next = 'none'
      } else {
        next = prev === side ? 'none' : side
      }
      try {
        localStorage.setItem(SIDEBAR_DOCK_SIDE_KEY, next)
        localStorage.setItem(SIDEBAR_PIN_STORAGE_KEY, String(next !== 'none'))
      } catch {
        // ignore
      }
      return next
    })
  }

  return {
    windowWidth,
    windowHeight,
    isDesktop,
    canPinSidebar,
    isSidebarPinned,
    sidebarDockSide,
    toggleSidebarPin: () => toggleSidebarDock(),
    toggleSidebarDock,
    setSidebarDockSide,
  }
}
