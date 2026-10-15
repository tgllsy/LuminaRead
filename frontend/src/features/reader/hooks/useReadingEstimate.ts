import { useState, useEffect, useRef, useMemo } from 'react'
import type { BookChapter } from '../types'

export interface UseReadingEstimateParams {
  currentChapter: BookChapter
  paragraphs: string[]
  currentParaIndex: number
  wpmReadingSpeed?: number
  isDualSpread?: boolean
  clampedSpreadIndex?: number
  totalSpreads?: number
}

export interface ReadingEstimateResult {
  remainingWords: number
  remainingMinutes: number
  wpm: number
  formattedText: string
}

/**
 * 动态阅读时速（WPM）与本章剩余字数、分钟数自适应估算 Hook
 */
export function useReadingEstimate(params: UseReadingEstimateParams): ReadingEstimateResult {
  const {
    currentChapter,
    paragraphs,
    currentParaIndex,
    wpmReadingSpeed,
    isDualSpread = false,
    clampedSpreadIndex = 0,
    totalSpreads = 1,
  } = params

  const [dynamicWpm, setDynamicWpm] = useState(wpmReadingSpeed || 380)
  const trackRef = useRef({ time: Date.now(), pIdx: currentParaIndex })

  // 动态跟踪阅读速度并基于指数平滑移动平均 (EMA) 实时自适应
  useEffect(() => {
    const prev = trackRef.current
    const now = Date.now()
    const elapsedSec = (now - prev.time) / 1000

    if (currentParaIndex > prev.pIdx && elapsedSec >= 6 && elapsedSec <= 300) {
      let chars = 0
      for (let i = prev.pIdx; i < Math.min(paragraphs.length, currentParaIndex); i++) {
        chars += (paragraphs[i] || '').length
      }
      if (chars >= 15) {
        const instantWpm = Math.round((chars / elapsedSec) * 60)
        if (instantWpm >= 120 && instantWpm <= 1200) {
          setDynamicWpm((curr) => Math.round(0.3 * instantWpm + 0.7 * curr))
        }
      }
      trackRef.current = { time: now, pIdx: currentParaIndex }
    } else if (currentParaIndex !== prev.pIdx) {
      trackRef.current = { time: now, pIdx: currentParaIndex }
    }
  }, [currentParaIndex, paragraphs])

  const effectiveWpm = Math.max(120, Math.min(1200, dynamicWpm))

  const totalChars = useMemo(() => {
    if (currentChapter.wordCount && currentChapter.wordCount > 0) {
      return currentChapter.wordCount
    }
    return paragraphs.reduce((sum, p) => sum + p.length, 0)
  }, [currentChapter.wordCount, paragraphs])

  const remainingWords = useMemo(() => {
    if (totalChars <= 0) return 0

    if (isDualSpread && totalSpreads > 0) {
      const progressRatio = Math.min(1, Math.max(0, (clampedSpreadIndex + 1) / totalSpreads))
      return Math.max(0, Math.round(totalChars * (1 - progressRatio)))
    }

    if (paragraphs.length > 0) {
      const safeParaIdx = Math.max(0, Math.min(paragraphs.length - 1, currentParaIndex))
      const readChars = paragraphs
        .slice(0, safeParaIdx + 1)
        .reduce((sum, p) => sum + p.length, 0)
      return Math.max(0, totalChars - readChars)
    }

    return totalChars
  }, [totalChars, isDualSpread, totalSpreads, clampedSpreadIndex, paragraphs, currentParaIndex])

  const remainingMinutes = remainingWords <= 0 ? 0 : Math.max(1, Math.ceil(remainingWords / effectiveWpm))

  const formattedText =
    remainingWords <= 0
      ? '本章已读完'
      : `本章还剩 ${remainingMinutes} 分钟 / 约 ${remainingWords} 字`

  return {
    remainingWords,
    remainingMinutes,
    wpm: effectiveWpm,
    formattedText,
  }
}
