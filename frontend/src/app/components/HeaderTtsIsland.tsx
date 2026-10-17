import React, { useState, useEffect } from 'react'
import { Play, Pause, X } from 'lucide-react'
import { useTtsStore } from '../../stores/ttsStore'

interface HeaderTtsIslandProps {
  onOpenTheater: () => void
  floating?: boolean
  onClose?: () => void
}

export const HeaderTtsIsland: React.FC<HeaderTtsIslandProps> = ({
  onOpenTheater,
  floating = false,
  onClose,
}) => {
  const isPlaying = useTtsStore((s) => s.audioStatus.playing)
  const isActive = useTtsStore((s) => s.audioStatus.active)
  const bookTitle = useTtsStore((s) => s.audioStatus.bookTitle || s.checkpoint?.bookTitle)
  const triggerTogglePlayPause = useTtsStore((s) => s.triggerTogglePlayPause)
  const isGlobalDismissed = useTtsStore((s) => s.listeningCapsuleDismissed)
  const setListeningCapsuleDismissed = useTtsStore((s) => s.setListeningCapsuleDismissed)

  const [localDismissed, setLocalDismissed] = useState(false)

  // 播放状态恢复时自动唤醒
  useEffect(() => {
    if (isPlaying) {
      setLocalDismissed(false)
    }
  }, [isPlaying])

  if ((!isActive && !bookTitle) || localDismissed || isGlobalDismissed) {
    return null
  }

  const handlePlayToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    triggerTogglePlayPause()
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation()
    setLocalDismissed(true)
    setListeningCapsuleDismissed(true)
    onClose?.()
  }

  const containerCls = floating
    ? 'fixed top-2.5 left-1/2 -translate-x-1/2 z-40 hidden md:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/95 backdrop-blur-xl text-white shadow-2xl shadow-black/40 border border-slate-700/80 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all group select-none animate-in fade-in slide-in-from-top-2 duration-200'
    : 'hidden xl:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/95 text-white shadow-lg shadow-slate-900/20 border border-slate-800 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all group select-none shrink-0'

  return (
    <div
      onClick={onOpenTheater}
      className={containerCls}
      title="点击展开全屏听书大剧场"
    >
      <div className="flex items-center gap-1 text-emerald-400 shrink-0">
        <span
          className={`w-1 bg-emerald-400 rounded-full ${
            isPlaying ? 'h-3 animate-bounce' : 'h-1.5 opacity-60'
          }`}
        />
        <span
          className={`w-1 bg-emerald-400 rounded-full ${
            isPlaying ? 'h-4 animate-bounce' : 'h-2.5 opacity-60'
          }`}
          style={{ animationDelay: '0.1s' }}
        />
        <span
          className={`w-1 bg-emerald-400 rounded-full ${
            isPlaying ? 'h-2 animate-bounce' : 'h-1 opacity-60'
          }`}
          style={{ animationDelay: '0.2s' }}
        />
      </div>

      <div className="flex items-center gap-1.5 text-xs max-w-[130px] 2xl:max-w-[180px] min-w-0">
        <span className="font-bold text-white truncate">{bookTitle || '伴随听书'}</span>
        <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">
          · {isPlaying ? '伴读中' : '已暂停'}
        </span>
      </div>

      <button
        type="button"
        onClick={handlePlayToggle}
        className="w-6 h-6 rounded-full bg-white/20 hover:bg-[#1b88ee] text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
        title={isPlaying ? '暂停' : '播放'}
      >
        {isPlaying ? (
          <Pause className="w-3 h-3 fill-current" />
        ) : (
          <Play className="w-3 h-3 fill-current ml-0.5" />
        )}
      </button>

      <button
        type="button"
        onClick={handleDismiss}
        className="w-5 h-5 rounded-full hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-0.5"
        title="关闭/收起灵动岛"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}
