import React, { useRef, useCallback, useEffect } from 'react'
import type { HighlightItem } from '../../../types'
import type { SelectionState } from '../types'
import { getSelectionDetails } from '../helpers'

interface UseReaderSelectionCaptureOptions {
  chapterIndex: number
  highlights: HighlightItem[]
  setSelectionState: React.Dispatch<React.SetStateAction<SelectionState | null>>
  isHidden?: boolean
}

export function useReaderSelectionCapture({
  chapterIndex,
  highlights,
  setSelectionState,
  isHidden = false,
}: UseReaderSelectionCaptureOptions) {
  const lastSelectionTimeRef = useRef(0)

  const captureSelection = useCallback((pIdx?: number, chIdx?: number) => {
    if (isHidden) return
    const details = getSelectionDetails(chIdx ?? chapterIndex, pIdx)
    if (details && details.text.length >= 2) {
      lastSelectionTimeRef.current = Date.now()
      const existingHl = highlights.find(
        (h) => h.chapter_index === details.chapterIndex && h.selected_text === details.text
      ) || null
      setSelectionState({
        text: details.text,
        paragraphIndex: details.paragraphIndex,
        endParagraphIndex: details.endParagraphIndex,
        startOffset: details.startOffset,
        endOffset: details.endOffset,
        chapterIndex: details.chapterIndex,
        existing: existingHl,
        anchorRect: details.anchorRect,
      })
    }
  }, [chapterIndex, highlights, setSelectionState, isHidden])

  useEffect(() => {
    if (isHidden) return
    let timer: ReturnType<typeof setTimeout> | null = null
    const onSelectionChange = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        captureSelection()
      }, 200)
    }
    document.addEventListener('selectionchange', onSelectionChange)
    return () => {
      if (timer) clearTimeout(timer)
      document.removeEventListener('selectionchange', onSelectionChange)
    }
  }, [captureSelection, isHidden])

  return {
    lastSelectionTimeRef,
    handleSelectionCapture: captureSelection,
  }
}
