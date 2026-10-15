import React from 'react'
import { ChevronDown, Sparkles, LocateFixed } from 'lucide-react'

interface TtsHeaderProps {
  onClose: () => void
  onExitTts: () => void
  onToggleParagraphDrawer: () => void
  onAlignCurrent: () => void
  isOutOfSync: boolean
  currentParaIdx: number
  totalParagraphs: number
  lastCacheStatus: 'HIT' | 'MISS' | 'LOCAL' | null
  serverCacheClips: number
  accentBadgeCls: string
  accentActivePillCls: string
}

export const TtsHeader: React.FC<TtsHeaderProps> = ({
  onClose,
  onExitTts,
  onToggleParagraphDrawer,
  onAlignCurrent,
  isOutOfSync,
  currentParaIdx,
  totalParagraphs,
  lastCacheStatus,
  serverCacheClips,
  accentBadgeCls,
  accentActivePillCls,
}) => {
  return (
    <header className="w-full px-5 pt-4 pb-2 flex items-center justify-between shrink-0">
      <button
        type="button"
        onClick={onClose}
        title="收起并后台伴读"
        className="p-2 -ml-2 rounded-full hover:bg-current/8 transition-colors flex items-center gap-1 text-xs"
      >
        <ChevronDown className="w-6 h-6 stroke-[1.8]" />
        <span className="hidden sm:inline opacity-70">收起</span>
      </button>

      <button
        type="button"
        onClick={onToggleParagraphDrawer}
        title="点击选择本章任意段落开始朗读"
        className={`px-3.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-transform active:scale-95 ${accentBadgeCls}`}
      >
        <Sparkles className="w-3 h-3" />
        <span>阅境伴读</span>
        <span className="opacity-40">·</span>
        <span className="font-mono text-[11px]">
          第 {Math.min(totalParagraphs, currentParaIdx + 1)}/
          {Math.max(1, totalParagraphs)} 段
        </span>
        <span className="text-[10px] opacity-75">▾</span>
        {lastCacheStatus === 'HIT' && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-current opacity-75"
            title={`已命中 SQLite 语音缓存（共 ${serverCacheClips} 段）`}
          />
        )}
      </button>

      <div className="flex items-center gap-2">
        {isOutOfSync && (
          <button
            type="button"
            onClick={onAlignCurrent}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition-all ${accentActivePillCls}`}
            title="对齐到当前阅读段落"
          >
            <LocateFixed className="w-3 h-3" />
            <span>读当前</span>
          </button>
        )}
        <button
          type="button"
          onClick={onExitTts}
          title="停止播放并退出听书"
          className="px-2.5 py-1 rounded-full text-[11px] font-medium border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all"
        >
          退出听书
        </button>
      </div>
    </header>
  )
}
