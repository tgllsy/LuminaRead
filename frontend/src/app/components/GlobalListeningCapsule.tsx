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
}

function formatCapsuleSubtitle(status: TtsAudioStatus, checkpoint: TtsCheckpoint | null): string {
  if (status.active) {
    const stateText = status.playing ? '正在伴读' : status.paused ? '已暂停' : '环境音伴读'
    const chText = status.chapterTitle || `第 ${(status.chapterIndex ?? 0) + 1} 章`
    const paraText = typeof status.paragraphIndex === 'number' ? ` · 第 ${status.paragraphIndex + 1} 段` : ''
    return `${stateText} · ${chText}${paraText}`
  }
  if (checkpoint) {
    return `上次听至：${checkpoint.chapterTitle || `第 ${checkpoint.chapterIndex + 1} 章`} · 第 ${checkpoint.paragraphIndex + 1} 段`
  }
  return ''
}

export const GlobalListeningCapsule: React.FC<GlobalListeningCapsuleProps> = ({
  status,
  checkpoint,
  bookTitle,
  dismissed,
  onResumeListening,
  onTogglePlayPause,
  onDismiss,
}) => {
  if (dismissed || !status.active) return null
  const title = status.bookTitle || checkpoint?.bookTitle || bookTitle || '阅境全局伴读'
  const subtitle = formatCapsuleSubtitle(status, checkpoint)

  return (
    <aside className="fixed right-4 bottom-20 md:bottom-7 z-40 flex items-center gap-2 select-none">
      <div className="flex items-center gap-2 pl-3.5 pr-1.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200/85 shadow-[0_8px_28px_rgba(15,23,42,0.14)]">
        <button
          type="button"
          onClick={() => onResumeListening(true)}
          className="text-left min-w-0 max-w-[180px] sm:max-w-[230px] pr-1 group cursor-pointer"
          title="点击进入听书页面"
        >
          <div className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
            {title ? `《${title}》` : '阅境全局伴读'}
          </div>
          <div className="text-[10px] text-slate-500 truncate">{subtitle || '点击继续听书'}</div>
        </button>

        <button
          type="button"
          onClick={onTogglePlayPause}
          title={status.active && status.playing ? '暂停伴读' : '继续播放'}
          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer ${
            status.active && status.playing
              ? 'bg-emerald-700 text-white shadow-[0_4px_14px_rgba(4,120,87,0.3)]'
              : 'bg-slate-900 hover:bg-emerald-700 text-white'
          }`}
        >
          {status.active && status.playing ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onResumeListening(true)}
          title="打开听书控制面板"
          className={`w-9 h-9 rounded-full flex flex-col items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer ${
            status.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
          }`}
        >
          {status.active && status.playing ? (
            <div className="flex items-end gap-[2px] h-3 mb-0.5">
              <span className="w-[2px] h-2 bg-current rounded-full animate-pulse" />
              <span className="w-[2px] h-3 bg-current rounded-full animate-bounce" />
              <span className="w-[2px] h-1.5 bg-current rounded-full animate-pulse" />
            </div>
          ) : (
            <Headphones className="w-3.5 h-3.5" />
          )}
          <span className="text-[9px] font-bold leading-none">听</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          title="收起胶囊"
          className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors ml-0.5 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  )
}
