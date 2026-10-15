import { useMemo } from 'react'
import type { ReaderTypography } from '../types'
import { FONTS } from '../constants'
import {
  calculateFontRatio,
  calculateMarginRatio,
  calculateLineHeightRatio,
  calculateBrightnessRatio,
} from '../helpers'
import type { FontItem } from '../types'

export interface TypographyRatiosResult {
  isDark: boolean
  brightness: number
  firstLineIndent: boolean
  bgTexture: string
  fontClamped: number
  fontRatio: number
  marginRatio: number
  lhClamped: number
  lhRatio: number
  brClamped: number
  brRatio: number
  currentFontMeta: FontItem
}

export function useTypographyRatios(
  settings: ReaderTypography
): TypographyRatiosResult {
  return useMemo(() => {
    const isDark = settings.theme === 'dark'
    const brightness = settings.brightness ?? 100
    const firstLineIndent = settings.firstLineIndent !== false
    const bgTexture = settings.bgTexture || 'plain'

    const { clamped: fontClamped, ratio: fontRatio } = calculateFontRatio(
      settings.fontSize
    )
    const { ratio: marginRatio } = calculateMarginRatio(settings.pageWidth)
    const { clamped: lhClamped, ratio: lhRatio } = calculateLineHeightRatio(
      settings.lineHeight
    )
    const { clamped: brClamped, ratio: brRatio } = calculateBrightnessRatio(
      brightness
    )

    const currentFontMeta =
      FONTS.find((f) => f.id === settings.fontFamily) || FONTS[0]

    return {
      isDark,
      brightness,
      firstLineIndent,
      bgTexture,
      fontClamped,
      fontRatio,
      marginRatio,
      lhClamped,
      lhRatio,
      brClamped,
      brRatio,
      currentFontMeta,
    }
  }, [
    settings.theme,
    settings.brightness,
    settings.firstLineIndent,
    settings.bgTexture,
    settings.fontSize,
    settings.pageWidth,
    settings.lineHeight,
    settings.fontFamily,
  ])
}
