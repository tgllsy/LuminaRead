import React, { useState, useRef } from 'react'
import { X, Headphones } from 'lucide-react'
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

const MobileFloatingThumbOrbs: React.FC<{
  isDark: boolean
  isScrolling: boolean
  isTtsActive: boolean
  isTtsPlaying: boolean
  isTtsAmbientActive: boolean
  onOpenTTS: () => void
}> = ({ isDark, isScrolling, isTtsActive, isTtsPlaying, isTtsAmbientActive, onOpenTTS }) => {
  const [swipedHidden, setSwipedHidden] = useState(false)
  const startYRef = useRef<number | null>(null)

  React.useEffect(() => {
    if (!isScrolling) setSwipedHidden(false)
  }, [isScrolling])

  return (
    <div
      data-no-hud-toggle="true"
      onTouchStart={(e) => { startYRef.current = e.touches[0]?.clientY ?? null }}
      onTouchMove={(e) => {
        if (startYRef.current !== null && (e.touches[0]?.clientY ?? 0) - startYRef.current > 24) {
          setSwipedHidden(true)
        }
      }}
      onTouchEnd={() => { startYRef.current = null }}
      className={`lg:hidden fixed right-4 bottom-[max(1.25rem,env(safe-area-inset-bottom,0px)+0.5rem)] z-40 flex items-center gap-2 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isScrolling || swipedHidden ? 'opacity-0 translate-y-12 scale-90 pointer-events-none' : 'opacity-100 translate-y-0 scale-100'
      }`}
    >
      <button
        type="button" onClick={onOpenTTS}
        title="下滑隐藏 · 点击展开听书播放器"
        className={`relative w-11 h-11 rounded-full shadow-[0_6px_20px_rgba(27,136,238,0.35)] flex items-center justify-center transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer active:scale-95 ${
          isDark
            ? 'bg-gradient-to-tr from-[#1b88ee] to-sky-400 border border-sky-300/40 text-white ring-4 ring-[#1b88ee]/20'
            : 'bg-gradient-to-tr from-[#1b88ee] to-sky-400 border border-white text-white ring-4 ring-[#1b88ee]/20'
        }`}
      >
        <Headphones className={`w-5 h-5 text-white ${isTtsPlaying ? 'animate-pulse' : ''}`} />
        {isTtsActive && (
          <span
            className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
              isTtsPlaying || isTtsAmbientActive ? 'bg-amber-300 animate-ping' : 'bg-emerald-400'
            }`}
          />
        )}
      </button>
    </div>
  )
}

export const ReaderBottomBar: React.FC<ReaderBottomBarProps> = ({
  typography, isScrolling, immersiveHudVisible, showTypography, showAmbientTTS,
  drawerOpen, isCopilotOpen, hasSelection, hasFootnoteModal,
  isTtsActive, isTtsPlaying, isTtsAmbientActive, onOpenTTS,
  bookmarkToast, returnAnchor, onReturnToAnchor, onClearReturnAnchor,
  readingEstimateText, isPageCanvas,
}) => {
  const showMobileFloatingButtons =
    isTtsActive && !immersiveHudVisible && !showTypography && !showAmbientTTS &&
    !drawerOpen && !isCopilotOpen && !hasSelection && !hasFootnoteModal

  return (
    <>
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

      {bookmarkToast && (
        <div className="fixed top-[calc(4rem+env(safe-area-inset-top,0px))] right-4 z-50 px-4 py-2 rounded-full bg-[#1b88ee] text-white text-xs font-medium shadow-lg animate-in fade-in duration-150">
          {bookmarkToast}
        </div>
      )}

      {returnAnchor && (
        <div
          data-no-hud-toggle="true"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] left-4 z-50 animate-in fade-in slide-in-from-bottom-3"
        >
          <div className="flex items-center gap-1.5 pl-3.5 pr-2 py-2 rounded-full bg-[#1b88ee] hover:bg-[#1677d2] text-white shadow-xl text-xs font-semibold">
            <button type="button" onClick={onReturnToAnchor} className="flex items-center gap-1.5 text-left cursor-pointer active:scale-[0.97]">
              <span>↩ 返回原位置</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-normal max-w-[160px] truncate">{returnAnchor.label}</span>
            </button>
            <button type="button" onClick={onClearReturnAnchor} title="清除返回锚点" className="p-1 rounded-full hover:bg-white/20 text-white/80 hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {showMobileFloatingButtons && (
        <MobileFloatingThumbOrbs
          isDark={typography.theme === 'dark'} isScrolling={isScrolling}
          isTtsActive={isTtsActive} isTtsPlaying={isTtsPlaying} isTtsAmbientActive={isTtsAmbientActive}
          onOpenTTS={onOpenTTS}
        />
      )}
    </>
  )
}
