import React, { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Sliders,
  X,
  ZoomIn,
  ZoomOut,
  Zap,
  Maximize2,
} from 'lucide-react'

interface PdfMobileControlsProps {
  pdfCanvasPage: number
  effectiveTotalPages: number
  fitMode: 'page' | 'width'
  pdfZoom: number
  highPerformanceMode: boolean
  showControls: boolean
  onJumpToPdfPage: (page: number) => void
  onToggleFitMode: (mode: 'page' | 'width') => void
  onSetPdfZoom: (zoomOrUpdater: number | ((prev: number) => number)) => void
  onToggleHighPerformance: () => void
  onOpenLightbox?: () => void
  onToggleControls: () => void
}

export const PdfMobileControls: React.FC<PdfMobileControlsProps> = ({
  pdfCanvasPage,
  effectiveTotalPages,
  fitMode,
  pdfZoom,
  highPerformanceMode,
  showControls,
  onJumpToPdfPage,
  onToggleFitMode,
  onSetPdfZoom,
  onToggleHighPerformance,
  onOpenLightbox,
  onToggleControls,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (!showControls) {
    // When controls are hidden (pure reading mode), display only a tiny floating capsule indicator
    return (
      <div
        data-no-hud-toggle="true"
        onClick={(e) => {
          e.stopPropagation()
          onToggleControls()
        }}
        className="md:hidden fixed top-3 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-black/60 dark:bg-white/15 backdrop-blur-md text-white dark:text-zinc-100 text-[11px] font-mono shadow-md cursor-pointer select-none transition-transform active:scale-95"
      >
        {pdfCanvasPage} / {effectiveTotalPages}
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
        className="md:hidden fixed top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 dark:bg-zinc-800/85 backdrop-blur-md text-white text-xs font-mono shadow-lg border border-white/10 cursor-pointer transition-transform active:scale-95"
      >
        <span>P.{pdfCanvasPage} / {effectiveTotalPages}</span>
        <Sliders className="w-3 h-3 opacity-70" />
      </div>

      {/* Bottom Floating Thumb Control Bar */}
      <div
        data-no-hud-toggle="true"
        onClick={(e) => e.stopPropagation()}
        className="md:hidden fixed bottom-4 left-3 right-3 z-30 flex flex-col gap-2 p-2.5 rounded-2xl bg-slate-950/85 dark:bg-zinc-900/90 backdrop-blur-xl text-white shadow-2xl border border-white/15 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200"
      >
        {/* Quick Slider */}
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

        {/* Action Buttons */}
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
            className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 active:bg-white/20 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
            title="排版与阅读设置"
          >
            <Sliders className="w-4 h-4" />
            <span>设置</span>
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

      {/* Settings Bottom Sheet */}
      {drawerOpen && (
        <div
          data-no-hud-toggle="true"
          onClick={(e) => {
            e.stopPropagation()
            setDrawerOpen(false)
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
                <span>PDF 排版与阅读选项</span>
              </h3>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-full bg-white/10 text-white/70 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Fit mode selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-white/70 font-medium">适应模式</label>
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
                    setDrawerOpen(false)
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
      )}
    </>
  )
}
