import { useState, useEffect, useMemo } from 'react'
import type React from 'react'
import type { SelectionAnchorRect } from '../types'
import {
  measureCurrentSelectionRect,
  calculatePopoverPosition,
} from '../helpers'

export function useSelectionPopoverPosition(
  anchorRect: SelectionAnchorRect | null | undefined,
  selectedText: string,
  openNoteEditorInitially: boolean,
  showNoteInput: boolean
): {
  computedRect: SelectionAnchorRect | null
  desktopFloatingStyle: React.CSSProperties | undefined
  floatingStyle: React.CSSProperties | undefined
  isMobile: boolean
} {
  const [computedRect, setComputedRect] = useState<SelectionAnchorRect | null>(
    anchorRect || null
  )

  useEffect(() => {
    if (anchorRect) {
      setComputedRect(anchorRect)
      return
    }
    const updateRect = () => {
      const rect = measureCurrentSelectionRect()
      if (rect) {
        setComputedRect(rect)
      }
    }
    updateRect()

    const onScrollOrResize = () => {
      updateRect()
    }
    window.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [anchorRect, selectedText, openNoteEditorInitially])

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  const floatingStyle = useMemo(() => {
    if (typeof window === 'undefined' || !computedRect) return undefined
    return calculatePopoverPosition(
      computedRect,
      showNoteInput,
      window.innerWidth,
      window.innerHeight,
      isMobile
    )
  }, [computedRect, showNoteInput, isMobile])

  return {
    computedRect,
    desktopFloatingStyle: isMobile ? undefined : floatingStyle,
    floatingStyle,
    isMobile,
  }
}
