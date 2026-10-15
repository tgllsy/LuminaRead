import React from 'react'
import { X } from 'lucide-react'
import type { ReaderTypography, ReturnAnchorState } from '../types'

interface ReaderBottomBarProps {
  typography: ReaderTypography
  isScrolling: boolean
  immersiveHudVisible: boolean
  showTypography: boolean
  showAmbientTTS: boolean
  drawerOpen: boolean
  isCopilotOpen: boolean
  hasSelection: boolean
  hasFootnoteModal: boolean
  isTtsActive: boolean
  isTtsPlaying: boolean
  isTtsAmbientActive: boolean
  onOpenCopilot: () => void
  onOpenTTS: () => void
  bookmarkToast: string
  returnAnchor: ReturnAnchorState | null
  onReturnToAnchor: () => void
  onClearReturnAnchor: () => void
  readingEstimateText?: string
  isPageCanvas?: boolean
}

export const ReaderBottomBar: React.FC<ReaderBottomBarProps> = ({
  typography,
  isScrolling,
  immersiveHudVisible,
  showTypography,
  showAmbientTTS,
  drawerOpen,
  isCopilotOpen,
  hasSelection,
  hasFootnoteModal,
  isTtsActive,
  isTtsPlaying,
  isTtsAmbientActive,
  onOpenCopilot,
  onOpenTTS,
  bookmarkToast,
  returnAnchor,
  onReturnToAnchor,
  onClearReturnAnchor,
  readingEstimateText,
  isPageCanvas,
}) => {
  const showMobileFloatingButtons =
    !immersiveHudVisible &&
    !showTypography &&
    !showAmbientTTS &&
    !drawerOpen &&
    !isCopilotOpen &&
    !hasSelection &&
    !hasFootnoteModal

  return (
    <>
      {/* Reading Estimate Subtle Footer Pill */}
      {readingEstimateText && !hasSelection && !hasFootnoteModal && !isPageCanvas && (
        <div
          data-no-hud-toggle="true"
          className={`fixed bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none select-none transition-all duration-300 ${
            isScrolling ? 'opacity-0 translate-y-2' : 'opacity-90 translate-y-0'
          } ${!immersiveHudVisible ? 'hidden md:hidden' : ''}`}
        >
          <div className="px-3.5 py-1 rounded-full text-xs font-sans tracking-tight backdrop-blur-md bg-slate-900/75 dark:bg-slate-100/85 text-white dark:text-slate-900 shadow-md border border-white/10 dark:border-slate-800/20 flex items-center gap-1.5 font-medium">
            <span className="text-[10px] opacity-75">⏱️</span>
            <span>{readingEstimateText}</span>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {bookmarkToast && (
        <div className="fixed top-16 right-4 z-50 px-4 py-2 rounded-full bg-[#1b88ee] text-white text-xs font-medium shadow-lg animate-in fade-in duration-150">
          {bookmarkToast}
        </div>
      )}

      {/* Floating Return to Anchor Button */}
      {returnAnchor && (
        <div
          data-no-hud-toggle="true"
          className="fixed bottom-20 left-4 z-50 animate-in fade-in slide-in-from-bottom-3"
        >
          <div className="flex items-center gap-1.5 pl-3.5 pr-2 py-2 rounded-full bg-[#1b88ee] hover:bg-[#1677d2] text-white shadow-xl text-xs font-semibold">
            <button
              type="button"
              onClick={onReturnToAnchor}
              className="flex items-center gap-1.5 text-left"
            >
              <span>↩ 返回原位置</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-normal max-w-[160px] truncate">
                {returnAnchor.label}
              </span>
            </button>
            <button
              type="button"
              onClick={onClearReturnAnchor}
              title="清除返回锚点"
              className="p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Floating Circular Buttons (< 1024px) */}
      {showMobileFloatingButtons && (
        <div
          data-no-hud-toggle="true"
          className={`lg:hidden fixed right-4 bottom-[max(1.5rem,env(safe-area-inset-bottom,0px)+0.75rem)] z-30 flex items-center gap-2.5 transition-all duration-200 ${
            isScrolling
              ? 'opacity-0 translate-y-3 scale-90 pointer-events-none'
              : 'opacity-100 translate-y-0 scale-100'
          }`}
        >
          <button
            onClick={onOpenCopilot}
            className={`w-11 h-11 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.08)] border backdrop-blur-md flex items-center justify-center font-bold text-[13px] tracking-tight transition-transform active:scale-95 ${
              typography.theme === 'dark'
                ? 'bg-[#2c2c2e]/95 border-white/10 text-[#f2f2f7] hover:bg-[#3a3a3c]'
                : 'bg-white/95 border-black/[0.08] text-[#1e1f22] hover:bg-white'
            }`}
            title="AI 伴读与章节导读"
          >
            <span>
              AI<sup className="text-[9px] font-extrabold ml-0.5">+</sup>
            </span>
          </button>

          <button
            onClick={onOpenTTS}
            className={`relative w-11 h-11 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.12)] border backdrop-blur-md flex items-center justify-center font-bold text-[14px] transition-all active:scale-95 ${
              isTtsActive
                ? typography.theme === 'dark'
                  ? 'bg-amber-500 border-amber-400 text-slate-950 ring-4 ring-amber-400/25'
                  : 'bg-emerald-700 border-emerald-700 text-white ring-4 ring-emerald-600/25'
                : typography.theme === 'dark'
                ? 'bg-[#2c2c2e]/95 border-white/10 text-[#f2f2f7] hover:bg-[#3a3a3c]'
                : 'bg-white/95 border-black/[0.08] text-[#1e1f22] hover:bg-white'
            }`}
            title={isTtsActive ? '伴读已折叠至悬浮球 · 点击展开' : '打开阅境伴读听书'}
          >
            <span>听</span>
            {isTtsActive && (
              <span
                className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                  isTtsPlaying || isTtsAmbientActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
            )}
          </button>
        </div>
      )}
    </>
  )
}
