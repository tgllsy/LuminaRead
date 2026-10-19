import React from 'react'
import { Headphones, Play, Pause, X } from 'lucide-react'
import type { TtsAudioStatus, TtsCheckpoint } from '../../features/audio-tts'

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
      onClick={handleOpen}
      className="fixed bottom-[calc(4.35rem+env(safe-area-inset-bottom,0px))] md:bottom-6 inset-x-3 md:inset-x-auto md:right-6 z-40 h-13 md:h-12 liquid-glass-dark rounded-2xl md:rounded-full px-3.5 py-1.5 flex items-center justify-between text-white cursor-pointer hover:border-slate-500/80 active:scale-[0.98] transition-all select-none"
      title="点击展开全屏听书大剧场"
    >
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/20">
          <Headphones className={`w-4 h-4 ${status.playing ? 'animate-pulse' : ''}`} />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-[280px]">
            {title ? `《${title}》` : '阅境全局伴读'}
          </div>
          <div className="text-[10px] text-slate-300/90 truncate">{subtitle || '轻点展开听书剧场'}</div>
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
              : 'bg-white/20 hover:bg-white/30 text-white'
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
          onClick={onDismiss}
          title="收起胶囊"
          className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-[0.97] cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  )
}
