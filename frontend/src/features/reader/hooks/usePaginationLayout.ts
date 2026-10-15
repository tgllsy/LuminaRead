import { useState, useEffect, useRef } from 'react'
import type { PageSpread, ReaderTypography } from '../types'
import { computePaginationSpreads } from '../../../utils/paginationEngine'

interface UsePaginationLayoutOptions {
  paragraphs: string[]
  typography: ReaderTypography
  windowWidth: number
  windowHeight: number
  focusParaIndex?: number | null
  pdfMode?: string
  enabled?: boolean
}

export function usePaginationLayout({
  paragraphs,
  typography,
  windowWidth,
  windowHeight,
  focusParaIndex,
  pdfMode,
  enabled = true,
}: UsePaginationLayoutOptions) {
  const turnToLastSpreadRef = useRef(false)
  const prevParagraphsRef = useRef(paragraphs)
  const [debouncedDims, setDebouncedDims] = useState({ windowWidth, windowHeight })
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
    resizeTimerRef.current = setTimeout(() => {
      setDebouncedDims({ windowWidth, windowHeight })
    }, 150)
    return () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current)
    }
  }, [windowWidth, windowHeight])

  const activeWidth = debouncedDims.windowWidth
  const activeHeight = debouncedDims.windowHeight
  const isSingleCol = typography.layoutMode === 'single' || activeWidth < 1024
  const [spreadIndex, setSpreadIndex] = useState(0)
  const [fontLoadedTick, setFontLoadedTick] = useState(0)

  useEffect(() => {
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => {
        setFontLoadedTick((t) => t + 1)
      }).catch(() => {})
    }
  }, [typography.fontFamily])

  const [paginatedSpreads, setPaginatedSpreads] = useState<PageSpread[]>(() => {
    if (!enabled) return []
    return computePaginationSpreads({
      paragraphs,
      fontSize: typography.fontSize,
      lineHeight: typography.lineHeight,
      pageWidth: typography.pageWidth,
      firstLineIndent: typography.firstLineIndent,
      bilingualMode: typography.bilingualMode,
      windowWidth: activeWidth,
      windowHeight: activeHeight,
      isSingleCol,
      pdfMode,
    })
  })

  useEffect(() => {
    if (!enabled) {
      setPaginatedSpreads([])
      return
    }

    const paragraphsChanged = prevParagraphsRef.current !== paragraphs
    prevParagraphsRef.current = paragraphs
    const shouldTurnToLast = paragraphsChanged && turnToLastSpreadRef.current
    if (paragraphsChanged) turnToLastSpreadRef.current = false

    const immediate = computePaginationSpreads(
      {
        paragraphs,
        fontSize: typography.fontSize,
        lineHeight: typography.lineHeight,
        pageWidth: typography.pageWidth,
        firstLineIndent: typography.firstLineIndent,
        bilingualMode: typography.bilingualMode,
        windowWidth: activeWidth,
        windowHeight: activeHeight,
        isSingleCol,
        pdfMode,
      },
      (asyncSpreads) => {
        setPaginatedSpreads(asyncSpreads)
        if (shouldTurnToLast) setSpreadIndex(Math.max(0, asyncSpreads.length - 1))
      }
    )
    setPaginatedSpreads(immediate)
    if (shouldTurnToLast) {
      setSpreadIndex(Math.max(0, immediate.length - 1))
    } else if (paragraphsChanged) {
      setSpreadIndex(0)
    }
  }, [enabled, paragraphs, typography.fontSize, typography.lineHeight, typography.pageWidth, typography.firstLineIndent, typography.bilingualMode, typography.layoutMode, typography.fontFamily, fontLoadedTick, activeWidth, activeHeight, isSingleCol, pdfMode])

  const clampedSpreadIndex = Math.min(Math.max(0, spreadIndex), Math.max(0, paginatedSpreads.length - 1))

  useEffect(() => {
    if (!enabled || focusParaIndex === null || focusParaIndex === undefined) return
    const idx = paginatedSpreads.findIndex((sp) =>
      sp.left.some((it) => it.pIdx === focusParaIndex) || sp.right.some((it) => it.pIdx === focusParaIndex)
    )
    if (idx >= 0 && idx !== spreadIndex) setSpreadIndex(idx)
  }, [enabled, focusParaIndex, paginatedSpreads, spreadIndex])

  return { paginatedSpreads, spreadIndex, setSpreadIndex, clampedSpreadIndex, turnToLastSpreadRef }
}
