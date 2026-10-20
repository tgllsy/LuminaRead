import { useState, useEffect, useRef } from 'react'
import type { PageSpread, ReaderTypography } from '../types'
import { computePaginationSpreads } from '../../../utils/paginationEngine'
import { useTtsStore } from '../../../stores/ttsStore'

interface UsePaginationLayoutOptions {
  paragraphs: string[]
  typography: ReaderTypography
  windowWidth: number
  windowHeight: number
  focusParaIndex?: number | null
  pdfMode?: string
  enabled?: boolean
}

function findTargetSpreadIndex(
  spreads: PageSpread[],
  paraIdx: number,
  paragraphs: string[],
  activeSentence?: string
): number {
  if (spreads.length === 0) return -1

  // 1. If activeSentence is present, find the exact slice in the paragraph
  if (activeSentence && paragraphs[paraIdx]) {
    const fullText = paragraphs[paraIdx]
    const charOffset = fullText.indexOf(activeSentence)
    if (charOffset >= 0) {
      const exactIdx = spreads.findIndex((sp) => {
        const matchLeft = sp.left.some(
          (it) =>
            it.pIdx === paraIdx &&
            (it.sliceStart == null ||
              (charOffset >= it.sliceStart && charOffset < (it.sliceEnd ?? Infinity)))
        )
        if (matchLeft) return true
        return sp.right.some(
          (it) =>
            it.pIdx === paraIdx &&
            (it.sliceStart == null ||
              (charOffset >= it.sliceStart && charOffset < (it.sliceEnd ?? Infinity)))
        )
      })
      if (exactIdx >= 0) return exactIdx
    }
  }

  // 2. Fallback: find any spread containing this paragraph
  return spreads.findIndex(
    (sp) =>
      sp.left.some((it) => it.pIdx === paraIdx) ||
      sp.right.some((it) => it.pIdx === paraIdx)
  )
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

  const isTtsPlaying = useTtsStore((s) => s.audioStatus.playing)
  const activeSentence = useTtsStore((s) => s.activeSentence)

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
  const spreadIndexRef = useRef(spreadIndex)
  spreadIndexRef.current = spreadIndex
  const focusParaRef = useRef<number | null | undefined>(focusParaIndex)
  focusParaRef.current = focusParaIndex
  const prevFocusParaRef = useRef<number | null | undefined>(undefined)
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
    if (paragraphsChanged) {
      turnToLastSpreadRef.current = false
      prevFocusParaRef.current = undefined
    }

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
        if (shouldTurnToLast) {
          setSpreadIndex(Math.max(0, asyncSpreads.length - 1))
        } else if (focusParaRef.current != null && focusParaRef.current > 0) {
          const targetIdx = findTargetSpreadIndex(asyncSpreads, focusParaRef.current, paragraphs)
          if (targetIdx >= 0) {
            prevFocusParaRef.current = focusParaRef.current
            setSpreadIndex(targetIdx)
          }
        }
      }
    )
    setPaginatedSpreads(immediate)
    if (shouldTurnToLast) {
      setSpreadIndex(Math.max(0, immediate.length - 1))
    } else if (paragraphsChanged) {
      const targetIdx =
        focusParaRef.current != null && focusParaRef.current > 0
          ? findTargetSpreadIndex(immediate, focusParaRef.current, paragraphs)
          : -1
      if (targetIdx >= 0) {
        prevFocusParaRef.current = focusParaRef.current
        setSpreadIndex(targetIdx)
      } else {
        setSpreadIndex(0)
      }
    }
  }, [enabled, paragraphs, typography.fontSize, typography.lineHeight, typography.pageWidth, typography.firstLineIndent, typography.bilingualMode, typography.layoutMode, typography.fontFamily, fontLoadedTick, activeWidth, activeHeight, isSingleCol, pdfMode])

  const clampedSpreadIndex = Math.min(Math.max(0, spreadIndex), Math.max(0, paginatedSpreads.length - 1))

  useEffect(() => {
    if (!enabled || focusParaIndex === null || focusParaIndex === undefined) return
    if (paginatedSpreads.length === 0) return

    const paraChanged = prevFocusParaRef.current !== focusParaIndex

    // Only auto-turn if TTS is actively playing OR focusParaIndex just changed (e.g. jump/seek/search flash/initial restore)
    if (!isTtsPlaying && !paraChanged) return

    const targetIdx = findTargetSpreadIndex(
      paginatedSpreads,
      focusParaIndex,
      paragraphs,
      isTtsPlaying ? activeSentence : undefined
    )

    if (targetIdx >= 0) {
      prevFocusParaRef.current = focusParaIndex
      if (targetIdx !== spreadIndexRef.current) {
        setSpreadIndex(targetIdx)
      }
    }
  }, [enabled, focusParaIndex, activeSentence, isTtsPlaying, paginatedSpreads, paragraphs])

  return { paginatedSpreads, spreadIndex, setSpreadIndex, clampedSpreadIndex, turnToLastSpreadRef }
}
