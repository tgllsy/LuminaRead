import React, { useState } from 'react'
import { ZoomIn } from 'lucide-react'
import type { BookSummary, ReaderTypography, HighlightItem, PdfSpreadMode } from '../types'
import { PdfCanvasPage } from './PdfCanvasPage'

export interface PdfPageCardProps {
  pNum: number
  book: BookSummary
  effectiveTotalPages: number
  pageParas: { pIdx: number; text: string }[]
  highPerformanceMode: boolean
  fitMode: 'page' | 'width'
  pdfCanvasPage: number
  pdfSpreadMode: PdfSpreadMode
  pdfZoom: number
  pdfFilterStyle: React.CSSProperties
  chapterHighlights: HighlightItem[]
  typography?: ReaderTypography
  fontClass?: string
  onJumpToPdfPage: (page: number) => void
  onOpenLightbox: (url: string, title: string, pageNum: number) => void
  onTextMouseUp: (pIdx: number) => void
  onToggleControls?: () => void
  isContinuous?: boolean
  isVisible?: boolean
  estimatedHeight?: number
  onHeightReport?: (pageNum: number, height: number) => void
  itemRef?: (el: HTMLElement | null) => void
}

export const PdfPageCard: React.FC<PdfPageCardProps> = ({
  pNum,
  book,
  effectiveTotalPages,
  pageParas,
  highPerformanceMode,
  fitMode,
  pdfCanvasPage,
  pdfSpreadMode,
  pdfZoom,
  pdfFilterStyle,
  chapterHighlights,
  typography,
  fontClass,
  onJumpToPdfPage,
  onOpenLightbox,
  onTextMouseUp,
  onToggleControls,
  isContinuous = false,
  isVisible = true,
  estimatedHeight,
  onHeightReport,
  itemRef,
}) => {
  const isDouble = !isContinuous && pdfSpreadMode === 'double'

  const handleLightbox = () => {
    const canvas = document.querySelector<HTMLCanvasElement>(`#pdf-page-${pNum} canvas`)
    let url = `/api/books/${encodeURIComponent(book.id)}/file`
    if (canvas) {
      try {
        url = canvas.toDataURL('image/jpeg', 0.9)
      } catch {}
    }
    onOpenLightbox(url, `《${book.title}》 · 第 ${pNum} 页`, pNum)
  }

  if (isContinuous && !isVisible) {
    return (
      <div
        ref={itemRef}
        id={`pdf-page-${pNum}`}
        data-pdf-page={pNum}
        style={{ minHeight: `${estimatedHeight || 550}px` }}
        className="w-full max-w-full flex flex-col items-center justify-center bg-current/[0.02] border-b border-current/5 transition-opacity py-16"
      >
        <span className="text-xs font-mono opacity-40">第 {pNum} / {effectiveTotalPages} 页</span>
      </div>
    )
  }

  return (
    <div
      ref={itemRef}
      id={`pdf-page-${pNum}`}
      data-pdf-page={pNum}
      className={`group rounded-none sm:rounded-2xl border-0 sm:border border-current/15 bg-transparent sm:bg-current/[0.025] shadow-none sm:shadow-lg overflow-hidden relative transition-all ${
        fitMode === 'page' ? 'w-fit max-w-full mx-auto' : 'w-full'
      } ${isContinuous ? 'mb-4 sm:mb-8' : ''}`}
    >
      {/* Desktop Card Header: Hidden on mobile to maximize viewport area */}
      <div className="hidden sm:flex px-3.5 py-2 border-b border-current/10 items-center justify-between text-xs bg-current/[0.04] gap-2">
        <span className="font-mono font-semibold shrink-0">
          📄 第 {pNum} / {effectiveTotalPages} 页
        </span>
        <div className="flex items-center gap-2">
          {!highPerformanceMode && pageParas.length > 0 ? (
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium hidden sm:inline">
              ✨ 下方文本层支持划词高亮/批注
            </span>
          ) : (
            <span className="text-[11px] opacity-60 font-medium hidden sm:inline">
              🎨 矢量高保真渲染
            </span>
          )}
          <button
            type="button"
            onClick={handleLightbox}
            className="px-2.5 py-1 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white font-semibold transition-colors flex items-center gap-1 shrink-0"
          >
            <ZoomIn className="w-3 h-3" />
            <span>全屏细看</span>
          </button>
        </div>
      </div>

      <div className="relative bg-transparent sm:bg-current/[0.02] flex items-center justify-center min-h-[220px] p-0 sm:p-2">
        <PdfCanvasPage
          bookId={book.id}
          pageNum={pNum}
          pdfZoom={pdfZoom}
          fitMode={fitMode}
          isDouble={isDouble}
          pdfFilterStyle={pdfFilterStyle}
          onRenderSuccess={() => {
            const el = document.getElementById(`pdf-page-${pNum}`)
            if (el && el.clientHeight > 50) {
              onHeightReport?.(pNum, el.clientHeight)
            }
          }}
        />

        {/* Left 25% click zone: previous page */}
        <div
          onClick={() => onJumpToPdfPage(pdfCanvasPage - (pdfSpreadMode === 'double' ? 2 : 1))}
          title="点击左侧翻上一页"
          className="absolute inset-y-0 left-0 w-1/4 cursor-w-resize z-20"
        />

        {/* Center 50% click zone: toggle controls on mobile */}
        <div
          onClick={onToggleControls}
          title="点击唤起/隐藏控制栏"
          className="absolute inset-y-0 left-1/4 w-1/2 cursor-pointer z-20"
        />

        {/* Right 25% click zone: next page */}
        <div
          onClick={() => onJumpToPdfPage(pdfCanvasPage + (pdfSpreadMode === 'double' ? 2 : 1))}
          title="点击右侧翻下一页"
          className="absolute inset-y-0 right-0 w-1/4 cursor-e-resize z-20"
        />
      </div>

      {!highPerformanceMode && pageParas.length > 0 && (
        <div className="p-4 sm:p-5 border-t border-current/10 bg-current/[0.02] space-y-2.5">
          <div className="flex items-center justify-between text-[11px] opacity-70 font-medium">
            <span>📝 第 {pNum} 页同步可划词文本层</span>
            <span className="font-mono">{pageParas.length} 段</span>
          </div>
          <div
            style={{
              fontSize: typography ? `${Math.max(13, typography.fontSize - 2)}px` : undefined,
              lineHeight: typography?.lineHeight || 1.7,
            }}
            className={`space-y-2 text-current leading-relaxed select-text ${fontClass || ''}`}
          >
            {pageParas.map(({ pIdx, text }) => {
              const paraHighlights = chapterHighlights.filter((h) => h.paragraph_index === pIdx)
              return (
                <p
                  key={pIdx}
                  data-para-index={pIdx}
                  onMouseUp={() => onTextMouseUp(pIdx)}
                  className={`rounded-lg px-2 py-1 transition-colors ${
                    paraHighlights.length > 0
                      ? 'bg-amber-500/20 border-l-2 border-amber-500 pl-2'
                      : 'hover:bg-current/[0.06]'
                  }`}
                >
                  {text}
                </p>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
