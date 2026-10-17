import React from 'react'
import { BookOpen, X } from 'lucide-react'

interface TheaterHeaderProps {
  title: string
  chapterTitle: string
  onReturnToReader: () => void
  onClose: () => void
}

export const TheaterHeader: React.FC<TheaterHeaderProps> = ({
  title,
  chapterTitle,
  onReturnToReader,
  onClose,
}) => {
  return (
    <div className="h-14 px-6 lg:px-8 bg-black/40 backdrop-blur-md border-b border-white/10 flex items-center justify-between shrink-0 z-20">
      <div className="flex items-center gap-4 min-w-0">
        <button
          type="button"
          onClick={onReturnToReader}
          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#1b88ee]" />
          <span className="hidden sm:inline">进入纸书阅读</span>
        </button>
        <div className="h-4 w-px bg-white/15 hidden sm:block" />
        <div className="min-w-0 truncate">
          <span className="font-bold text-white text-xs font-serif truncate">《{title}》</span>
          <span className="text-[11px] text-slate-400 ml-2 truncate hidden md:inline">{chapterTitle}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Edge 神经拟真伴读</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="收起听书剧场"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
