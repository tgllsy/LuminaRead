import React, { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Zap } from 'lucide-react'
import type {
  BookSummary,
  PdfBookMeta,
  PdfSpreadMode,
  HighlightItem,
  ReaderTypography,
} from '../types'
import { PdfPageCard } from './PdfPageCard'

interface PdfViewportProps {
  book: BookSummary
  pdfMeta: PdfBookMeta | null
  pdfCanvasPage: number
  totalPdfPages: number
  pdfSpreadMode: PdfSpreadMode
  pdfZoom: number
  pdfFilterStyle: React.CSSProperties
  paragraphs: string[]
  chapterHighlights: HighlightItem[]
  onJumpToPdfPage: (page: number) => void
  onSetPdfSpreadMode: (mode: PdfSpreadMode) => void
  onSetPdfZoom: (zoomOrUpdater: number | ((prev: number) => number)) => void
  onOpenLightbox: (url: string, title: string, pageNum: number) => void
  onTextMouseUp: (pIdx: number) => void
  typography?: ReaderTypography
  themeStyle?: { page: string; subtext: string }
  fontClass?: string
}

function buildPageParagraphsMap(paragraphs: string[]): Map<number, { pIdx: number; text: string }[]> {
  const map = new Map<number, { pIdx: number; text: string }[]>()
  let curPage = 1
  for (let i = 0; i < paragraphs.length; i++) {
    const text = paragraphs[i].trim()
    const markerMatch = text.match(/^\[\[PDF_PAGE:(\d+)\]\]$/i)
    if (markerMatch) {
      curPage = Number(markerMatch[1])
      continue
    }
    if (text) {
      let list = map.get(curPage)
      if (!list) {
        list = []
        map.set(curPage, list)
      }
      list.push({ pIdx: i, text })
    }
  }
  return map
}

export const PdfViewport: React.FC<PdfViewportProps> = (props) => {
  const { book, pdfMeta, pdfCanvasPage, totalPdfPages, pdfSpreadMode, pdfZoom, paragraphs, onJumpToPdfPage, onSetPdfSpreadMode, onSetPdfZoom } = props
  const [highPerformanceMode, setHighPerformanceMode] = useState(() => {
    try {
      return localStorage.getItem('luminaread_pdf_high_perf') === 'true'
    } catch {
      return false
    }
  })
  const [fitMode, setFitMode] = useState<'page' | 'width'>(() => {
    try {
      return (localStorage.getItem('luminaread_pdf_fit_mode') as 'page' | 'width') || 'page'
    } catch {
      return 'page'
    }
  })

  const effectiveTotalPages = Math.max(totalPdfPages, pdfMeta?.total_pages || 1, 1)
  const isDouble = pdfSpreadMode === 'double' && pdfCanvasPage + 1 <= effectiveTotalPages
  const activePages = [pdfCanvasPage, ...(isDouble ? [pdfCanvasPage + 1] : [])]

  const pageParagraphMap = useMemo(() => buildPageParagraphsMap(paragraphs), [paragraphs])

  useEffect(() => {
    const ahead = [pdfCanvasPage + 1, pdfCanvasPage + 2, pdfCanvasPage - 1].filter((p) => p >= 1 && p <= effectiveTotalPages)
    ahead.forEach((p) => {
      const img = new Image()
      img.src = `/api/books/${encodeURIComponent(book.id)}/pdf-page/${p}`
    })
  }, [book.id, pdfCanvasPage, effectiveTotalPages])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pdfCanvasPage])

  const handleToggleFitMode = (mode: 'page' | 'width') => {
    setFitMode(mode)
    try {
      localStorage.setItem('luminaread_pdf_fit_mode', mode)
    } catch {}
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div data-no-hud-toggle="true" onClick={(e) => e.stopPropagation()} className="p-3 sm:p-3.5 rounded-2xl border border-current/15 bg-current/[0.03] flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button" onClick={() => onJumpToPdfPage(pdfCanvasPage - (pdfSpreadMode === 'double' ? 2 : 1))} disabled={pdfCanvasPage <= 1}
            className="px-3 py-1.5 rounded-xl border border-current/20 hover:bg-current/10 disabled:opacity-35 text-xs font-bold flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /><span>上一页</span>
          </button>
          <div className="px-3 py-1.5 rounded-xl bg-current/10 font-mono text-xs font-bold">
            第 {pdfCanvasPage}{isDouble ? `-${pdfCanvasPage + 1}` : ''} / {effectiveTotalPages} 页
          </div>
          <button
            type="button" onClick={() => onJumpToPdfPage(pdfCanvasPage + (pdfSpreadMode === 'double' ? 2 : 1))} disabled={pdfCanvasPage >= effectiveTotalPages}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-35 text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
          >
            <span>下一页</span><ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-w-[160px] max-w-xs flex items-center gap-2">
          <span className="text-[11px] font-mono opacity-70 shrink-0">跳页</span>
          <input
            type="range" min={1} max={effectiveTotalPages} value={pdfCanvasPage}
            onChange={(e) => onJumpToPdfPage(Number(e.target.value))}
            className="w-full accent-blue-600 h-1.5 cursor-pointer"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setHighPerformanceMode((p) => {
                const next = !p
                try {
                  localStorage.setItem('luminaread_pdf_high_perf', String(next))
                } catch {}
                return next
              })
            }}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
              highPerformanceMode ? 'bg-amber-500 text-white shadow-xs' : 'border border-current/20 hover:bg-current/10 opacity-80'
            }`}
            title="高性能渲染模式：预加载邻近页面、极速双缓冲"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{highPerformanceMode ? '⚡ 高性能' : '精细模式'}</span>
          </button>

          <div className="inline-flex rounded-xl border border-current/15 p-0.5 bg-current/5 text-xs">
            <button
              type="button" onClick={() => onSetPdfSpreadMode('single')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${pdfSpreadMode === 'single' ? 'bg-blue-600 text-white' : 'opacity-75 hover:opacity-100'}`}
            >
              📄 单页
            </button>
            <button
              type="button" onClick={() => onSetPdfSpreadMode('double')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${pdfSpreadMode === 'double' ? 'bg-blue-600 text-white' : 'opacity-75 hover:opacity-100'}`}
            >
              📖 双页
            </button>
          </div>

          <div className="inline-flex rounded-xl border border-current/15 p-0.5 bg-current/5 text-xs">
            <button
              type="button" onClick={() => handleToggleFitMode('page')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${fitMode === 'page' ? 'bg-blue-600 text-white' : 'opacity-75 hover:opacity-100'}`}
              title="适合页面：自适应视口高度，完整呈现整页内容"
            >
              📐 适合页面
            </button>
            <button
              type="button" onClick={() => handleToggleFitMode('width')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${fitMode === 'width' ? 'bg-blue-600 text-white' : 'opacity-75 hover:opacity-100'}`}
              title="适合宽度：按最大可用宽度排版，支持平滑上下滚动浏览"
            >
              ↔ 适合宽度
            </button>
          </div>

          <div className="inline-flex items-center gap-1 rounded-xl border border-current/15 px-2 py-1 bg-current/5 text-xs font-mono">
            <button type="button" onClick={() => onSetPdfZoom((z) => Math.max(50, z - 15))} className="p-1 rounded hover:bg-current/10" title="缩小书页">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span onClick={() => onSetPdfZoom(100)} className="px-1.5 cursor-pointer font-bold" title="点击重置为 100%">{pdfZoom}%</span>
            <button type="button" onClick={() => onSetPdfZoom((z) => Math.min(200, z + 15))} className="p-1 rounded hover:bg-current/10" title="放大书页">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div
          style={{
            width: fitMode === 'width' && pdfZoom > 100 ? `${pdfZoom}%` : undefined,
            maxWidth: fitMode === 'page'
              ? (isDouble ? '100%' : 'max-content')
              : (isDouble ? '100%' : `${Math.round(860 * (Math.max(50, pdfZoom) / 100))}px`),
          }}
          className={`mx-auto grid gap-4 sm:gap-6 items-start ${isDouble ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 justify-items-center'}`}
        >
          {activePages.map((pNum) => (
            <PdfPageCard
              key={pNum} pNum={pNum} effectiveTotalPages={effectiveTotalPages}
              pageParas={pageParagraphMap.get(pNum) || []}
              highPerformanceMode={highPerformanceMode}
              fitMode={fitMode}
              {...props}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
