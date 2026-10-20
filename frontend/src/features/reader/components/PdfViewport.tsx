import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Zap, ScrollText, BookOpen } from 'lucide-react'
import type {
  BookSummary,
  PdfBookMeta,
  PdfSpreadMode,
  HighlightItem,
  ReaderTypography,
  PdfMode,
} from '../types'
import { PdfPageCard } from './PdfPageCard'
import { PdfMobileControls } from './PdfMobileControls'
import { usePdfContinuousScroll } from '../hooks/usePdfContinuousScroll'
import { buildPageParagraphsMap } from '../helpers/pdfParagraphsHelper'

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
  pdfMode?: PdfMode
  onSwitchPdfMode?: (mode: PdfMode) => void
  onJumpToPdfPage: (page: number) => void
  onSetPdfSpreadMode: (mode: PdfSpreadMode) => void
  onSetPdfZoom: (zoomOrUpdater: number | ((prev: number) => number)) => void
  onOpenLightbox: (url: string, title: string, pageNum: number) => void
  onTextMouseUp: (pIdx: number) => void
  typography?: ReaderTypography
  themeStyle?: { page: string; subtext: string }
  fontClass?: string
}

export const PdfViewport: React.FC<PdfViewportProps> = (props) => {
  const {
    book,
    pdfMeta,
    pdfCanvasPage,
    totalPdfPages,
    pdfSpreadMode,
    pdfZoom,
    paragraphs,
    pdfMode = 'page_canvas',
    onSwitchPdfMode,
    onJumpToPdfPage,
    onSetPdfSpreadMode,
    onSetPdfZoom,
  } = props

  const [highPerformanceMode, setHighPerformanceMode] = useState(() => {
    try {
      return localStorage.getItem('luminaread_pdf_high_perf') === 'true'
    } catch {
      return false
    }
  })
  const [fitMode, setFitMode] = useState<'page' | 'width'>(() => {
    try {
      return (localStorage.getItem('luminaread_pdf_fit_mode') as 'page' | 'width') || 'width'
    } catch {
      return 'width'
    }
  })
  const [scrollMode, setScrollMode] = useState<'continuous' | 'paged'>(() => {
    try {
      return (localStorage.getItem('luminaread_pdf_scroll_mode') as 'continuous' | 'paged') || 'continuous'
    } catch {
      return 'continuous'
    }
  })
  const [showMobileControls, setShowMobileControls] = useState(true)

  const effectiveTotalPages = Math.max(totalPdfPages, pdfMeta?.total_pages || 1, 1)
  const isContinuous = scrollMode === 'continuous'
  const isMobileScreen = typeof window !== 'undefined' ? window.innerWidth < 768 : false
  const isDouble = !isContinuous && !isMobileScreen && pdfSpreadMode === 'double' && pdfCanvasPage + 1 <= effectiveTotalPages

  const pageParagraphMap = useMemo(() => buildPageParagraphsMap(paragraphs), [paragraphs])

  const {
    visiblePages,
    registerPageRef,
    reportPageHeight,
    scrollToPage,
    pageHeights,
  } = usePdfContinuousScroll({
    totalPages: effectiveTotalPages,
    currentPage: pdfCanvasPage,
    isContinuous,
    onPageChange: (newPage) => {
      if (newPage !== pdfCanvasPage) {
        onJumpToPdfPage(newPage)
      }
    },
  })

  const handleJump = useCallback((targetPage: number) => {
    onJumpToPdfPage(targetPage)
    if (isContinuous) {
      scrollToPage(targetPage, true)
    }
  }, [onJumpToPdfPage, isContinuous, scrollToPage])

  const handleToggleScrollMode = (mode: 'continuous' | 'paged') => {
    setScrollMode(mode)
    try {
      localStorage.setItem('luminaread_pdf_scroll_mode', mode)
    } catch {}
    if (mode === 'continuous') {
      setTimeout(() => scrollToPage(pdfCanvasPage, false), 50)
    }
  }

  const handleToggleFitMode = (mode: 'page' | 'width') => {
    setFitMode(mode)
    try {
      localStorage.setItem('luminaread_pdf_fit_mode', mode)
    } catch {}
  }

  const pagesToRender = useMemo(() => {
    if (isContinuous) {
      return Array.from({ length: effectiveTotalPages }, (_, i) => i + 1)
    }
    return [pdfCanvasPage, ...(isDouble ? [pdfCanvasPage + 1] : [])]
  }, [isContinuous, effectiveTotalPages, pdfCanvasPage, isDouble])

  return (
    <div className="space-y-0 sm:space-y-4 w-full relative pb-16 sm:pb-0">
      <PdfMobileControls
        pdfCanvasPage={pdfCanvasPage}
        effectiveTotalPages={effectiveTotalPages}
        fitMode={fitMode}
        pdfZoom={pdfZoom}
        highPerformanceMode={highPerformanceMode}
        showControls={showMobileControls}
        pdfMode={pdfMode}
        scrollMode={scrollMode}
        onJumpToPdfPage={handleJump}
        onToggleFitMode={handleToggleFitMode}
        onSetPdfZoom={onSetPdfZoom}
        onToggleHighPerformance={() => {
          setHighPerformanceMode((p) => {
            const next = !p
            try {
              localStorage.setItem('luminaread_pdf_high_perf', String(next))
            } catch {}
            return next
          })
        }}
        onOpenLightbox={() => {
          props.onOpenLightbox(`/api/books/${encodeURIComponent(book.id)}/file`, `《${book.title}》 · 第 ${pdfCanvasPage} 页`, pdfCanvasPage)
        }}
        onToggleControls={() => setShowMobileControls((v) => !v)}
        onSwitchPdfMode={onSwitchPdfMode}
        onToggleScrollMode={handleToggleScrollMode}
      />

      {/* Desktop Top Control Bar */}
      <div data-no-hud-toggle="true" onClick={(e) => e.stopPropagation()} className="hidden md:flex p-3 sm:p-3.5 rounded-2xl border border-current/15 bg-current/[0.03] flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button" onClick={() => handleJump(pdfCanvasPage - 1)} disabled={pdfCanvasPage <= 1}
            className="px-3 py-1.5 rounded-xl border border-current/20 hover:bg-current/10 disabled:opacity-35 text-xs font-bold flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /><span>上一页</span>
          </button>
          <div className="px-3 py-1.5 rounded-xl bg-current/10 font-mono text-xs font-bold">
            第 {pdfCanvasPage}{isDouble ? `-${pdfCanvasPage + 1}` : ''} / {effectiveTotalPages} 页
          </div>
          <button
            type="button" onClick={() => handleJump(pdfCanvasPage + 1)} disabled={pdfCanvasPage >= effectiveTotalPages}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-35 text-xs font-bold flex items-center gap-1 shadow-xs transition-colors"
          >
            <span>下一页</span><ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-w-[140px] max-w-xs flex items-center gap-2">
          <span className="text-[11px] font-mono opacity-70 shrink-0">跳页</span>
          <input
            type="range" min={1} max={effectiveTotalPages} value={pdfCanvasPage}
            onChange={(e) => handleJump(Number(e.target.value))}
            className="w-full accent-blue-600 h-1.5 cursor-pointer"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Scroll Mode Switch */}
          <div className="inline-flex rounded-xl border border-current/15 p-0.5 bg-current/5 text-xs">
            <button
              type="button" onClick={() => handleToggleScrollMode('continuous')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${isContinuous ? 'bg-blue-600 text-white' : 'opacity-75 hover:opacity-100'}`}
              title="连续纵向滑动浏览"
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>连续滑动</span>
            </button>
            <button
              type="button" onClick={() => handleToggleScrollMode('paged')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 transition-all ${!isContinuous ? 'bg-blue-600 text-white' : 'opacity-75 hover:opacity-100'}`}
              title="单页/双页分页翻页"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>分页</span>
            </button>
          </div>

          {/* View Mode Switch if onSwitchPdfMode provided */}
          {onSwitchPdfMode && (
            <div className="inline-flex rounded-xl border border-current/15 p-0.5 bg-current/5 text-xs">
              <button
                type="button" onClick={() => onSwitchPdfMode('page_canvas')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${pdfMode === 'page_canvas' ? 'bg-blue-600 text-white' : 'opacity-75 hover:opacity-100'}`}
              >
                📄 原版
              </button>
              <button
                type="button" onClick={() => onSwitchPdfMode('text_only')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${pdfMode === 'text_only' ? 'bg-blue-600 text-white' : 'opacity-75 hover:opacity-100'}`}
              >
                📝 重排
              </button>
            </div>
          )}

          <div className="inline-flex rounded-xl border border-current/15 p-0.5 bg-current/5 text-xs">
            <button
              type="button" onClick={() => handleToggleFitMode('width')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${fitMode === 'width' ? 'bg-blue-600 text-white' : 'opacity-75 hover:opacity-100'}`}
              title="适合宽度：按最大可用宽度排版，支持平滑上下滚动浏览"
            >
              ↔ 适合宽度
            </button>
            <button
              type="button" onClick={() => handleToggleFitMode('page')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${fitMode === 'page' ? 'bg-blue-600 text-white' : 'opacity-75 hover:opacity-100'}`}
              title="适合页面：自适应视口高度，完整呈现整页内容"
            >
              📐 适合页面
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
          className={`mx-auto grid gap-3 sm:gap-6 items-start ${isDouble ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 justify-items-center'}`}
        >
          {pagesToRender.map((pNum) => (
            <PdfPageCard
              {...props}
              key={pNum}
              pNum={pNum}
              effectiveTotalPages={effectiveTotalPages}
              pageParas={pageParagraphMap.get(pNum) || []}
              highPerformanceMode={highPerformanceMode}
              fitMode={fitMode}
              isContinuous={isContinuous}
              isVisible={!isContinuous || visiblePages.has(pNum)}
              estimatedHeight={pageHeights.current.get(pNum)}
              onHeightReport={reportPageHeight}
              itemRef={(el) => registerPageRef(pNum, el)}
              onToggleControls={() => setShowMobileControls((v) => !v)}
              onJumpToPdfPage={handleJump}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
