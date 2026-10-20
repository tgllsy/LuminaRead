import { useState, useEffect, useRef, useCallback } from 'react'

interface UsePdfContinuousScrollProps {
  totalPages: number
  currentPage: number
  isContinuous: boolean
  onPageChange: (page: number) => void
}

export function usePdfContinuousScroll({
  totalPages,
  currentPage,
  isContinuous,
  onPageChange,
}: UsePdfContinuousScrollProps) {
  const [visiblePages, setVisiblePages] = useState<Set<number>>(() => new Set([currentPage]))
  const pageRefs = useRef<Map<number, HTMLElement>>(new Map())
  const pageHeights = useRef<Map<number, number>>(new Map())
  const isScrollingToRef = useRef(false)
  const lastActivePageRef = useRef(currentPage)

  const registerPageRef = useCallback((pageNum: number, el: HTMLElement | null) => {
    if (el) {
      pageRefs.current.set(pageNum, el)
    } else {
      pageRefs.current.delete(pageNum)
    }
  }, [])

  const reportPageHeight = useCallback((pageNum: number, height: number) => {
    if (height > 50) {
      pageHeights.current.set(pageNum, height)
    }
  }, [])

  // Viewport intersection observer to load/unload canvas smoothly
  useEffect(() => {
    if (!isContinuous || typeof window === 'undefined') return

    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        setVisiblePages((prev) => {
          const next = new Set(prev)
          let changed = false
          for (const entry of entries) {
            const pageNum = Number(entry.target.getAttribute('data-pdf-page'))
            if (!pageNum) continue
            if (entry.isIntersecting) {
              if (!next.has(pageNum)) {
                next.add(pageNum)
                changed = true
              }
            } else {
              // Unload pages far away from viewport to save GPU memory
              if (next.has(pageNum) && Math.abs(pageNum - lastActivePageRef.current) > 2) {
                next.delete(pageNum)
                changed = true
              }
            }
          }
          return changed ? next : prev
        })
      },
      { root: null, rootMargin: '800px 0px', threshold: 0.01 }
    )

    // Center observer to accurately detect current reading page
    const activeObserver = new IntersectionObserver(
      (entries) => {
        if (isScrollingToRef.current) return
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const pageNum = Number(entry.target.getAttribute('data-pdf-page'))
            if (pageNum && pageNum !== lastActivePageRef.current) {
              lastActivePageRef.current = pageNum
              onPageChange(pageNum)
            }
          }
        }
      },
      { root: null, rootMargin: '-40% 0px -40% 0px', threshold: 0.05 }
    )

    pageRefs.current.forEach((el) => {
      visibilityObserver.observe(el)
      activeObserver.observe(el)
    })

    return () => {
      visibilityObserver.disconnect()
      activeObserver.disconnect()
    }
  }, [isContinuous, totalPages, onPageChange])

  const scrollToPage = useCallback((pageNum: number, smooth = true) => {
    const el = pageRefs.current.get(pageNum)
    if (!el) return
    isScrollingToRef.current = true
    lastActivePageRef.current = pageNum
    el.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant', block: 'start' })
    setTimeout(() => {
      isScrollingToRef.current = false
    }, 600)
  }, [])

  return {
    visiblePages,
    registerPageRef,
    reportPageHeight,
    scrollToPage,
    pageHeights,
  }
}
