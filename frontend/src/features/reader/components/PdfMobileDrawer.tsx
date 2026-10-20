import React from 'react'
import {
  Sliders,
  X,
  ZoomIn,
  ZoomOut,
  Zap,
  Maximize2,
  FileText,
  ScrollText,
  BookOpen,
} from 'lucide-react'
import type { PdfMode } from '../types'

interface PdfMobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  pdfMode?: PdfMode
  scrollMode?: 'continuous' | 'paged'
  fitMode: 'page' | 'width'
  pdfZoom: number
  highPerformanceMode: boolean
  onSwitchPdfMode?: (mode: PdfMode) => void
  onToggleScrollMode?: (mode: 'continuous' | 'paged') => void
  onToggleFitMode: (mode: 'page' | 'width') => void
  onSetPdfZoom: (zoomOrUpdater: number | ((prev: number) => number)) => void
  onToggleHighPerformance: () => void
  onOpenLightbox?: () => void
}

export const PdfMobileDrawer: React.FC<PdfMobileDrawerProps> = ({
  isOpen,
  onClose,
  pdfMode = 'page_canvas',
  scrollMode = 'continuous',
  fitMode,
  pdfZoom,
  highPerformanceMode,
  onSwitchPdfMode,
  onToggleScrollMode,
  onToggleFitMode,
  onSetPdfZoom,
  onToggleHighPerformance,
  onOpenLightbox,
}) => {
  if (!isOpen) return null

  return (
    <div
      data-no-hud-toggle="true"
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
      className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 dark:bg-zinc-900 text-white rounded-t-3xl p-5 space-y-4 border-t border-white/15 shadow-2xl animate-in slide-in-from-bottom duration-250 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-blue-400" />
            <span>PDF 模式与排版设置</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full bg-white/10 text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode: Original vs Text Reflow vs Hybrid */}
        {onSwitchPdfMode && (
          <div className="space-y-1.5">
            <label className="text-xs text-white/70 font-medium">排版模式切换</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  onSwitchPdfMode('hybrid')
                  onClose()
                }}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                  pdfMode === 'hybrid'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-xs'
                    : 'bg-white/5 border-white/10 text-white/80'
                }`}
              >
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>图文重排</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSwitchPdfMode('page_canvas')
                  onClose()
                }}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                  pdfMode === 'page_canvas'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-xs'
                    : 'bg-white/5 border-white/10 text-white/80'
                }`}
              >
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>原版影印</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSwitchPdfMode('text_only')
                  onClose()
                }}
                className={`py-2 px-2 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                  pdfMode === 'text_only'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-xs'
                    : 'bg-white/5 border-white/10 text-white/80'
                }`}
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>极简文本</span>
              </button>
            </div>
          </div>
        )}

        {/* Continuous vs Paged Mode */}
        {onToggleScrollMode && (
          <div className="space-y-1.5">
            <label className="text-xs text-white/70 font-medium">浏览与翻页体验</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onToggleScrollMode('continuous')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                  scrollMode === 'continuous'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-xs'
                    : 'bg-white/5 border-white/10 text-white/80'
                }`}
              >
                <ScrollText className="w-4 h-4" />
                <span>📜 连续垂直滑动</span>
              </button>
              <button
                type="button"
                onClick={() => onToggleScrollMode('paged')}
                className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                  scrollMode === 'paged'
                    ? 'bg-blue-600 border-blue-500 text-white shadow-xs'
                    : 'bg-white/5 border-white/10 text-white/80'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>📑 单页点击翻页</span>
              </button>
            </div>
          </div>
        )}

        {/* Fit mode selector */}
        <div className="space-y-1.5">
          <label className="text-xs text-white/70 font-medium">自适应宽度与版心</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onToggleFitMode('width')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                fitMode === 'width'
                  ? 'bg-blue-600 border-blue-500 text-white shadow-xs'
                  : 'bg-white/5 border-white/10 text-white/80'
              }`}
            >
              ↔ 适合宽度（推荐手机）
            </button>
            <button
              type="button"
              onClick={() => onToggleFitMode('page')}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                fitMode === 'page'
                  ? 'bg-blue-600 border-blue-500 text-white shadow-xs'
                  : 'bg-white/5 border-white/10 text-white/80'
              }`}
            >
              📐 适合页面（完整视口）
            </button>
          </div>
        </div>

        {/* Zoom selector */}
        <div className="space-y-1.5">
          <label className="text-xs text-white/70 font-medium">缩放比例</label>
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => onSetPdfZoom((z) => Math.max(50, z - 15))}
              className="py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center gap-1 text-xs"
            >
              <ZoomOut className="w-3.5 h-3.5" />
              <span>缩小</span>
            </button>
            <button
              type="button"
              onClick={() => onSetPdfZoom(100)}
              className="text-xs font-mono font-bold px-2 py-1 bg-white/10 rounded-md"
            >
              {pdfZoom}% (重置)
            </button>
            <button
              type="button"
              onClick={() => onSetPdfZoom((z) => Math.min(250, z + 15))}
              className="py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center gap-1 text-xs"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>放大</span>
            </button>
          </div>
        </div>

        {/* Performance and Lightbox */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onToggleHighPerformance}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
              highPerformanceMode
                ? 'bg-amber-600/30 border-amber-500/60 text-amber-300'
                : 'bg-white/5 border-white/10 text-white/80'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{highPerformanceMode ? '高性能: 开启' : '精细模式'}</span>
          </button>

          {onOpenLightbox && (
            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenLightbox()
              }}
              className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium border border-white/15 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>全屏细看</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
