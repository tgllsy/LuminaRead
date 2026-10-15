import { isNonSpokenMarkerParagraph } from '../helpers'

export interface ChapterTimeStats {
  chapterElapsedSec: number
  chapterTotalSec: number
  chapterProgressPct: number
  displayElapsed: string
  displayTotal: string
}

export function estimateParagraphDurationSec(text: string, ttsRate = 1.0): number {
  const trimmed = (text || '').trim()
  if (!trimmed || isNonSpokenMarkerParagraph(trimmed)) return 0
  const charCount = trimmed.replace(/\s+/g, '').length
  const rate = Math.max(0.5, Math.min(2.5, ttsRate))
  // 正常朗读速度约每秒 4.3 个汉字/词，每段最少 1.5 秒
  return Math.max(1.5, Math.round((charCount / (4.3 * rate)) * 10) / 10)
}

export function computeChapterTimeStats(
  paragraphs: string[],
  activeParagraphIndex: number | null,
  currentParaSec: number,
  currentParaDur: number,
  ttsRate = 1.0
): ChapterTimeStats {
  if (!paragraphs || paragraphs.length === 0) {
    return {
      chapterElapsedSec: 0,
      chapterTotalSec: 0,
      chapterProgressPct: 0,
      displayElapsed: '00:00',
      displayTotal: '00:00',
    }
  }

  const curIdx = Math.max(0, Math.min(paragraphs.length - 1, activeParagraphIndex ?? 0))
  let totalSec = 0
  let elapsedSec = 0

  for (let i = 0; i < paragraphs.length; i++) {
    const pText = paragraphs[i]
    if (isNonSpokenMarkerParagraph(pText)) continue

    const estDur = (i === curIdx && currentParaDur > 0)
      ? currentParaDur
      : estimateParagraphDurationSec(pText, ttsRate)

    totalSec += estDur

    if (i < curIdx) {
      elapsedSec += estDur
    } else if (i === curIdx) {
      elapsedSec += Math.min(estDur, Math.max(0, currentParaSec))
    }
  }

  totalSec = Math.max(1, Math.round(totalSec))
  elapsedSec = Math.min(totalSec, Math.max(0, Math.round(elapsedSec)))
  const pct = Math.min(100, Math.max(0, Math.round((elapsedSec / totalSec) * 1000) / 10))

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  return {
    chapterElapsedSec: elapsedSec,
    chapterTotalSec: totalSec,
    chapterProgressPct: pct,
    displayElapsed: formatMinSec(elapsedSec),
    displayTotal: formatMinSec(totalSec),
  }
}

export function seekChapterTarget(
  paragraphs: string[],
  targetRatio: number,
  ttsRate = 1.0
): { targetParagraphIndex: number; seekSecInParagraph: number } {
  if (!paragraphs || paragraphs.length === 0) {
    return { targetParagraphIndex: 0, seekSecInParagraph: 0 }
  }

  const durList = paragraphs.map((p) =>
    isNonSpokenMarkerParagraph(p) ? 0 : estimateParagraphDurationSec(p, ttsRate)
  )
  const totalSec = durList.reduce((acc, d) => acc + d, 0)
  if (totalSec <= 0) {
    return { targetParagraphIndex: 0, seekSecInParagraph: 0 }
  }

  const targetSec = Math.max(0, Math.min(totalSec, targetRatio * totalSec))
  let accumulated = 0

  for (let i = 0; i < paragraphs.length; i++) {
    const d = durList[i]
    if (d <= 0) continue
    if (accumulated + d >= targetSec || i === paragraphs.length - 1) {
      const seekSec = Math.max(0, Math.min(d, targetSec - accumulated))
      return { targetParagraphIndex: i, seekSecInParagraph: seekSec }
    }
    accumulated += d
  }

  return { targetParagraphIndex: 0, seekSecInParagraph: 0 }
}

export function stepChapterSeconds(
  paragraphs: string[],
  activeParagraphIndex: number | null,
  currentParaSec: number,
  currentParaDur: number,
  deltaSec: number,
  ttsRate = 1.0
): { targetParagraphIndex: number; seekSecInParagraph: number } {
  const stats = computeChapterTimeStats(
    paragraphs,
    activeParagraphIndex,
    currentParaSec,
    currentParaDur,
    ttsRate
  )
  const newTargetSec = Math.max(0, Math.min(stats.chapterTotalSec, stats.chapterElapsedSec + deltaSec))
  const newRatio = stats.chapterTotalSec > 0 ? newTargetSec / stats.chapterTotalSec : 0
  return seekChapterTarget(paragraphs, newRatio, ttsRate)
}
