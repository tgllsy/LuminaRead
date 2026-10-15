import type { BookSummary, PosterModalState } from '../types'

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const chars = Array.from(text)
  const lines: string[] = []
  let line = ''
  for (const ch of chars) {
    const testLine = line + ch
    if (ctx.measureText(testLine).width > maxWidth && line.length > 0) {
      lines.push(line)
      line = ch
    } else {
      line = testLine
    }
  }
  if (line) lines.push(line)
  return lines
}

function drawBackgroundAndHeader(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  coverColor: string
) {
  const grad = ctx.createLinearGradient(0, 0, width, height)
  grad.addColorStop(0, coverColor || '#0f4c5c')
  grad.addColorStop(1, '#0f172a')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.font = '600 20px monospace'
  ctx.fillText('LUMINAREAD · 阅境金句卡', 70, 72)
  const dateStr = new Date().toISOString().slice(0, 10)
  ctx.fillText(dateStr, width - 70 - ctx.measureText(dateStr).width, 72)
}

function drawQuoteAndNote(
  ctx: CanvasRenderingContext2D,
  width: number,
  quoteLines: string[],
  noteLines: string[]
) {
  ctx.fillStyle = '#ffffff'
  ctx.font = '500 32px Georgia, "Noto Serif SC", serif'
  let y = 145
  for (const line of quoteLines) {
    ctx.fillText(line, 70, y)
    y += 50
  }

  if (noteLines.length > 0) {
    y += 10
    const boxH = noteLines.length * 38 + 32
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillRect(70, y - 28, width - 140, boxH)
    ctx.fillStyle = '#fde68a'
    ctx.font = '400 24px -apple-system, "PingFang SC", sans-serif'
    let ny = y + 6
    for (const nLine of noteLines) {
      ctx.fillText(nLine, 90, ny)
      ny += 38
    }
  }
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  book: BookSummary,
  currentChapterTitle: string
) {
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(70, height - 120)
  ctx.lineTo(width - 70, height - 120)
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 26px -apple-system, "PingFang SC", sans-serif'
  ctx.fillText(`《${book.title}》`, 70, height - 72)
  ctx.fillStyle = 'rgba(255,255,255,0.78)'
  ctx.font = '400 22px -apple-system, "PingFang SC", sans-serif'
  ctx.fillText(`${book.author} · ${currentChapterTitle}`, 70, height - 38)
}

export function generateAndDownloadPosterPng(
  book: BookSummary,
  currentChapterTitle: string,
  posterModal: PosterModalState
): void {
  const canvas = document.createElement('canvas')
  const width = 900

  const tmpCtx = canvas.getContext('2d')
  if (!tmpCtx) return
  tmpCtx.font = '500 32px Georgia, "Noto Serif SC", serif'
  const quoteLines = wrapText(tmpCtx, `“${posterModal.text}”`, width - 140)
  tmpCtx.font = '400 24px -apple-system, "PingFang SC", sans-serif'
  const noteLines = posterModal.note
    ? wrapText(tmpCtx, `💡 读者批注：${posterModal.note}`, width - 180)
    : []

  const height = Math.max(
    520,
    260 + quoteLines.length * 50 + (noteLines.length ? noteLines.length * 38 + 60 : 0)
  )
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  drawBackgroundAndHeader(ctx, width, height, book.cover_color || '#0f4c5c')
  drawQuoteAndNote(ctx, width, quoteLines, noteLines)
  drawFooter(ctx, width, height, book, currentChapterTitle)

  const dataUrl = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `${book.title}-金句海报.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
