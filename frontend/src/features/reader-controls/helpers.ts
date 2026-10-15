import type React from 'react'
import type { SelectionAnchorRect } from './types'
import {
  FONT_SIZE_BOUNDS,
  PAGE_WIDTH_BOUNDS,
  LINE_HEIGHT_BOUNDS,
  BRIGHTNESS_BOUNDS,
} from './constants'

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function computeRatio(value: number, min: number, max: number): number {
  if (max === min) return 0
  const clamped = clamp(value, min, max)
  return (clamped - min) / (max - min)
}

export function calculateFontRatio(fontSize: number): {
  clamped: number
  ratio: number
} {
  const clamped = clamp(fontSize, FONT_SIZE_BOUNDS.min, FONT_SIZE_BOUNDS.max)
  const ratio = computeRatio(
    clamped,
    FONT_SIZE_BOUNDS.min,
    FONT_SIZE_BOUNDS.max
  )
  return { clamped, ratio }
}

export function calculateMarginRatio(pageWidth: number): {
  clamped: number
  ratio: number
} {
  const clamped = clamp(pageWidth, PAGE_WIDTH_BOUNDS.min, PAGE_WIDTH_BOUNDS.max)
  const ratio =
    1 -
    computeRatio(clamped, PAGE_WIDTH_BOUNDS.min, PAGE_WIDTH_BOUNDS.max)
  return { clamped, ratio }
}

export function marginRatioToPageWidth(ratio: number): number {
  const { min, max } = PAGE_WIDTH_BOUNDS
  return Math.round(max - ratio * (max - min))
}

export function calculateLineHeightRatio(lineHeight: number): {
  clamped: number
  ratio: number
} {
  const clamped = clamp(lineHeight, LINE_HEIGHT_BOUNDS.min, LINE_HEIGHT_BOUNDS.max)
  const ratio = computeRatio(
    clamped,
    LINE_HEIGHT_BOUNDS.min,
    LINE_HEIGHT_BOUNDS.max
  )
  return { clamped, ratio }
}

export function calculateBrightnessRatio(brightness: number): {
  clamped: number
  ratio: number
} {
  const clamped = clamp(brightness, BRIGHTNESS_BOUNDS.min, BRIGHTNESS_BOUNDS.max)
  const ratio = computeRatio(
    clamped,
    BRIGHTNESS_BOUNDS.min,
    BRIGHTNESS_BOUNDS.max
  )
  return { clamped, ratio }
}

export function measureCurrentSelectionRect(): SelectionAnchorRect | null {
  try {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const rect = sel.getRangeAt(0).getBoundingClientRect()
      if (rect && (rect.width > 0 || rect.height > 0)) {
        return {
          top: rect.top,
          left: rect.left,
          bottom: rect.bottom,
          width: rect.width,
        }
      }
    }
  } catch {
    // ignore cross-frame or unselectable cases
  }
  return null
}

export function calculatePopoverPosition(
  rect: SelectionAnchorRect,
  showNoteInput: boolean,
  vw: number,
  vh: number,
  isMobile = false
): React.CSSProperties {
  const popoverWidth = isMobile
    ? Math.min(vw - 20, 396)
    : Math.min(500, vw - 32)
  const centerX = rect.left + rect.width / 2
  const minPad = isMobile ? 10 : 16
  const clampedLeft = Math.max(
    minPad,
    Math.min(vw - popoverWidth - minPad, centerX - popoverWidth / 2)
  )
  const estimatedHeight = isMobile
    ? (showNoteInput ? 136 : 84)
    : (showNoteInput ? 280 : 180)

  const spaceBelow = vh - rect.bottom
  const placeBelow = spaceBelow >= estimatedHeight + 12 || rect.top < estimatedHeight + 12
  const topPos = placeBelow
    ? Math.min(vh - estimatedHeight - minPad, rect.bottom + 8)
    : Math.max(minPad, rect.top - estimatedHeight - 8)

  return {
    position: 'fixed',
    left: `${Math.round(clampedLeft)}px`,
    top: `${Math.round(topPos)}px`,
    width: `${popoverWidth}px`,
    transform: 'none',
  }
}

export function calculateDesktopPopoverPosition(
  rect: SelectionAnchorRect,
  showNoteInput: boolean,
  vw: number,
  vh: number
): React.CSSProperties {
  return calculatePopoverPosition(rect, showNoteInput, vw, vh, false)
}

export function getSurfaceClass(isDark: boolean): string {
  return isDark
    ? 'bg-[#1c1c1e] text-slate-100 border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.5)]'
    : 'bg-white text-slate-900 border-slate-200/90 shadow-[0_12px_36px_rgba(15,23,42,0.16)]'
}

export function getPillButtonClass(isDark: boolean): string {
  return isDark
    ? 'bg-[#2c2c2e] hover:bg-white/15 text-slate-200'
    : 'bg-[#f2f3f5] hover:bg-slate-200/80 text-slate-700'
}
