import React, { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Sliders,
  FileText,
} from 'lucide-react'
import type { PdfMode } from '../types'
import { PdfMobileDrawer } from './PdfMobileDrawer'

interface PdfMobileControlsProps {
  pdfCanvasPage: number
  effectiveTotalPages: number
  fitMode: 'page' | 'width'
  pdfZoom: number
  highPerformanceMode: boolean
  showControls: boolean
  pdfMode?: PdfMode
  scrollMode?: 'continuous' | 'paged'
  onJumpToPdfPage: (page: number) => void
  onToggleFitMode: (mode: 'page' | 'width') => void
  onSetPdfZoom: (zoomOrUpdater: number | ((prev: number) => number)) => void
  onToggleHighPerformance: () => void
  onOpenLightbox?: () => void
  onToggleControls: () => void
  onSwitchPdfMode?: (mode: PdfMode) => void
  onToggleScrollMode?: (mode: 'continuous' | 'paged') => void
}

export const PdfMobileControls: React.FC<PdfMobileControlsProps> = ({
  pdfCanvasPage,
  effectiveTotalPages,
  fitMode,
  pdfZoom,
  highPerformanceMode,
  showControls,
  pdfMode = 'page_canvas',
  scrollMode = 'continuous',
  onJumpToPdfPage,
  onToggleFitMode,
  onSetPdfZoom,
  onToggleHighPerformance,
  onOpenLightbox,
  onToggleControls,
  onSwitchPdfMode,
  onToggleScrollMode,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (!showControls) {
    return (
      <div
        data-no-hud-toggle="true"
        onClick={(e) => {
          e.stopPropagation()
          onToggleControls()
        }}
        className="md:hidden fixed top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1 rounded-full bg-black/65 dark:bg-white/15 backdrop-blur-md text-white text-[11px] font-mono shadow-md cursor-pointer select-none transition-transform active:scale-95 border border-white/10"
      >
        <span>{pdfCanvasPage} / {effectiveTotalPages}</span>
        {onSwitchPdfMode && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              onSwitchPdfMode('text_only')
            }}
            className="pl-1.5 border-l border-white/20 text-blue-300 font-sans text-[10px]"
          >
            转重排
          </span>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Top Floating Mini Capsule */}
      <div
        data-no-hud-toggle="true"
        onClick={(e) => {
          e.stopPropagation()
          setDrawerOpen(true)
        }}
        className="md:hidden fixed top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/85 dark:bg-zinc-800/90 backdrop-blur-md text-white text-xs font-mono shadow-lg border border-white/15 cursor-pointer transition-transform active:scale-95"
      >
        <span>P.{pdfCanvasPage} / {effectiveTotalPages}</span>
        {onSwitchPdfMode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSwitchPdfMode('text_only')
            }}
            className="px-2 py-0.5 rounded-full bg-blue-500/25 hover:bg-blue-500/40 text-blue-300 text-[11px] font-sans font-medium flex items-center gap-1 active:scale-95 transition-all"
            title="切换到文本重排模式"
          >
            <FileText className="w-3 h-3" />
            <span>转重排</span>
          </button>
        )}
        <Sliders className="w-3 h-3 opacity-60 ml-0.5" />
      </div>

      {/* Bottom Floating Thumb Control Bar */}
      <div
        data-no-hud-toggle="true"
        onClick={(e) => e.stopPropagation()}
        className="md:hidden fixed bottom-4 left-3 right-3 z-30 flex flex-col gap-2 p-2.5 rounded-2xl bg-slate-950/85 dark:bg-zinc-900/90 backdrop-blur-xl text-white shadow-2xl border border-white/15 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] font-mono opacity-60 shrink-0">1</span>
          <input
            type="range"
            min={1}
            max={effectiveTotalPages}
            value={pdfCanvasPage}
            onChange={(e) => onJumpToPdfPage(Number(e.target.value))}
            className="w-full accent-blue-500 h-1.5 cursor-pointer"
          />
          <span className="text-[10px] font-mono opacity-60 shrink-0">{effectiveTotalPages}</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onJumpToPdfPage(pdfCanvasPage - 1)}
            disabled={pdfCanvasPage <= 1}
            className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 disabled:opacity-30 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>上一页</span>
          </button>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="py-2 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            title="排版与阅读设置"
          >
            <Sliders className="w-4 h-4 text-blue-400" />
            <span>选项</span>
          </button>

          <button
            type="button"
            onClick={() => onJumpToPdfPage(pdfCanvasPage + 1)}
            disabled={pdfCanvasPage >= effectiveTotalPages}
            className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-30 text-xs font-medium flex items-center justify-center gap-1 shadow-md transition-colors text-white"
          >
            <span>下一页</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <PdfMobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pdfMode={pdfMode}
        scrollMode={scrollMode}
        fitMode={fitMode}
        pdfZoom={pdfZoom}
        highPerformanceMode={highPerformanceMode}
        onSwitchPdfMode={onSwitchPdfMode}
        onToggleScrollMode={onToggleScrollMode}
        onToggleFitMode={onToggleFitMode}
        onSetPdfZoom={onSetPdfZoom}
        onToggleHighPerformance={onToggleHighPerformance}
        onOpenLightbox={onOpenLightbox}
      />
    </>
  )
}
