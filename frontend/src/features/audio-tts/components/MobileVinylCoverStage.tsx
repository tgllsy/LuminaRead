import React from 'react'
import { Headphones, ChevronRight } from 'lucide-react'
import { KaraokeParagraphContent } from './KaraokeParagraphContent'

export interface MobileVinylCoverStageProps {
  title: string
  author: string
  chapterTitle: string
  coverUrl?: string
  coverColor: string
  isPlaying: boolean
  currentParaText: string
  currentParaIdx: number
  onSwitchToLyrics: () => void
}

export const MobileVinylCoverStage: React.FC<MobileVinylCoverStageProps> = ({
  title,
  author,
  chapterTitle,
  coverUrl,
  coverColor,
  isPlaying,
  currentParaText,
  currentParaIdx: _currentParaIdx,
  onSwitchToLyrics,
}) => (
  <div className="dark flex-1 min-h-0 flex flex-col items-center justify-between px-5 py-2 overflow-y-auto">
    {/* 唱针与黑胶唱片封面舞台 */}
    <div className="relative flex flex-col items-center justify-center my-auto py-2">
      <div
        className={`w-20 h-1.5 rounded-full bg-gradient-to-r from-slate-400 to-amber-400 origin-left transition-transform duration-500 mb-2 shadow-md ${
          isPlaying ? 'rotate-6' : '-rotate-12 opacity-60'
        }`}
      />
      <div className="relative flex items-center justify-center">
        <div
          className={`absolute -inset-4 rounded-full bg-gradient-to-tr from-[#1b88ee]/25 via-indigo-500/15 to-amber-500/20 blur-2xl transition-opacity duration-500 ${
            isPlaying ? 'opacity-100' : 'opacity-35'
          }`}
        />
        <div
          onClick={onSwitchToLyrics}
          style={{ animationDuration: '20s', animationPlayState: isPlaying ? 'running' : 'paused' }}
          className="relative w-52 h-52 xs:w-60 xs:h-60 rounded-full bg-gradient-to-tr from-[#0b0d13] via-[#1b2030] to-[#0d1017] p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.75)] ring-4 ring-slate-800/90 border border-white/15 flex items-center justify-center cursor-pointer animate-spin"
          title="点击切换完整词幕"
        >
          <div className="absolute inset-3 rounded-full border border-white/5 pointer-events-none" />
          <div className="absolute inset-6 rounded-full border border-white/5 pointer-events-none" />
          <div
            className="relative w-full h-full rounded-full overflow-hidden border-2 border-slate-700/90 shadow-inner flex items-center justify-center"
            style={{ backgroundColor: coverColor || '#1e293b' }}
          >
            {coverUrl ? (
              <img src={coverUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 p-5 flex flex-col items-center justify-center text-center bg-gradient-to-b from-slate-800/80 to-slate-950/90">
                <div className="font-serif font-bold text-xs text-amber-100 line-clamp-2 px-3">{title}</div>
              </div>
            )}
            <div className="relative w-8 h-8 rounded-full bg-[#0f131c] border-2 border-amber-400/60 shadow-[0_0_12px_rgba(0,0,0,0.8)] z-10 shrink-0 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-slate-400" />
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* 歌曲/书籍信息栏 + 实时双行同步词幕卡 */}
    <div className="w-full max-w-md space-y-3 shrink-0 pt-2">
      <div className="min-w-0 flex-1">
        <h2 className="text-base xs:text-lg font-bold text-slate-100 truncate">{title}</h2>
        <p className="text-xs text-slate-400 truncate mt-0.5">
          {author ? `${author} · ` : ''}{chapterTitle || '正文章节'}
        </p>
      </div>

      <div
        onClick={onSwitchToLyrics}
        className="w-full rounded-2xl bg-slate-900/90 border border-slate-700/80 px-4 py-3 cursor-pointer active:scale-[0.99] transition-all shadow-inner"
      >
        <div className="flex items-center justify-between text-[11px] text-sky-400 font-medium mb-1">
          <span className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full bg-sky-400 ${isPlaying ? 'animate-ping' : ''}`} />
            <span>KTV 实时伴读</span>
          </span>
          <span className="text-slate-400 flex items-center gap-0.5 text-[11px]">
            <Headphones className="w-3 h-3 text-sky-400" />
            <span>展开词幕</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </span>
        </div>
        <div className="text-xs xs:text-[13px] font-serif text-slate-100 leading-relaxed line-clamp-2">
          <KaraokeParagraphContent paraText={currentParaText} isActive={true} />
        </div>
      </div>
    </div>
  </div>
)
