import React, { useState, useEffect, useRef } from 'react'
import { Headphones, Play, Pause, ChevronDown, X } from 'lucide-react'
import type { TtsAudioStatus, TtsCheckpoint } from '../../features/audio-tts'
import { useDraggableCapsule } from '../hooks/useDraggableCapsule'

interface GlobalListeningCapsuleProps {
  status: TtsAudioStatus
  checkpoint: TtsCheckpoint | null
  bookTitle?: string
  dismissed: boolean
  onResumeListening: (openReaderModal: boolean) => void
  onTogglePlayPause: () => void
  onDismiss: () => void
  onOpenTheater?: () => void
}

function formatCapsuleSubtitle(status: TtsAudioStatus, checkpoint: TtsCheckpoint | null): string {
  if (status.active) {
    const chText = status.chapterTitle || `第 ${(status.chapterIndex ?? 0) + 1} 章`
    const paraText = typeof status.paragraphIndex === 'number' ? ` · 第 ${status.paragraphIndex + 1} 段` : ''
    return `${status.playing ? '正在伴读' : '已暂停'} · ${chText}${paraText}`
  }
  if (checkpoint) {
    return `上次听至：${checkpoint.chapterTitle || `第 ${checkpoint.chapterIndex + 1} 章`}`
  }
  return ''
}

export const GlobalListeningCapsule: React.FC<GlobalListeningCapsuleProps> = ({
  status,
  checkpoint,
  bookTitle,
  dismissed,
  onTogglePlayPause,
  onDismiss,
  onOpenTheater,
}) => {
  const drag = useDraggableCapsule('global_listening_capsule', true)
  const [hiddenByScroll, setHiddenByScroll] = useState(false)
  const lastScrollYRef = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0
      const delta = y - lastScrollYRef.current
      if (delta > 12 && y > 40) {
        setHiddenByScroll(true)
      } else if (delta < -8 || y <= 20) {
        setHiddenByScroll(false)
      }
      lastScrollYRef.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (dismissed || !status.active) return null
  const title = status.bookTitle || checkpoint?.bookTitle || bookTitle || '阅境全局伴读'
  const subtitle = formatCapsuleSubtitle(status, checkpoint)

  const handleOpen = () => {
    if (onOpenTheater) {
      onOpenTheater()
    }
  }

  return (
    <aside
      ref={drag.ref}
      data-no-hud-toggle="true"
      style={drag.dragStyle}
      onPointerDown={drag.onPointerDown}
      onClickCapture={drag.onClickCapture}
      onClick={handleOpen}
      className={`fixed bottom-[calc(5.15rem+env(safe-area-inset-bottom,0px))] md:bottom-6 inset-x-3.5 md:inset-x-auto md:right-6 z-40 h-13 md:h-12 liquid-glass-dark rounded-2xl md:rounded-full px-3.5 py-1.5 flex items-center justify-between text-white select-none ${
        hiddenByScroll && !drag.isDragging
          ? 'translate-y-24 opacity-0 pointer-events-none transition-all duration-300'
          : drag.isDragging
          ? 'cursor-grabbing scale-[1.02] transition-none shadow-2xl ring-2 ring-[#1b88ee]/40'
          : 'cursor-grab hover:border-slate-500/80 active:scale-[0.98] transition-all duration-300'
      }`}
      title="下滑页面自动隐藏 · 点击展开听书播放器"
    >
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/20">
          <Headphones className={`w-4 h-4 ${status.playing ? 'animate-pulse' : ''}`} />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-white truncate max-w-[190px] sm:max-w-[280px]">
            {title ? `《${title}》` : '阅境全局伴读'}
          </div>
          <div className="text-[10px] text-slate-300/90 truncate">{subtitle || '轻点展开听书播放器'}</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onTogglePlayPause}
          title={status.playing ? '暂停伴读' : '继续播放'}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-[0.97] cursor-pointer ${
            status.playing
              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
              : 'bg-slate-700 hover:bg-slate-600 text-white'
          }`}
        >
          {status.playing ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setHiddenByScroll(true)}
          title="下滑隐藏悬浮条"
          className="md:hidden w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:text-white bg-slate-800/80 transition-all active:scale-[0.97] cursor-pointer"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onDismiss}
          title="关闭伴读悬浮条"
          className="w-7 h-7 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-all active:scale-[0.97] cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  )
}

