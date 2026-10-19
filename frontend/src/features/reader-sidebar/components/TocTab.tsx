import React from 'react'
import { Search, Pin } from 'lucide-react'
import type { TocItem } from '../types'
import { useTocNavigation } from '../hooks'

interface TocTabProps {
  toc: TocItem[]
  currentChapterIndex: number
  onSelectChapter: (chapterIndex: number) => void
  onCloseIfOverlay: () => void
  isDark: boolean
  dockSide?: 'left' | 'right' | 'none'
  onToggleDockSide?: (side: 'left' | 'right' | 'none') => void
}

export const TocTab: React.FC<TocTabProps> = ({
  toc,
  currentChapterIndex,
  onSelectChapter,
  onCloseIfOverlay,
  isDark,
  dockSide = 'none',
  onToggleDockSide,
}) => {
  const { tocFilter, setTocFilter, filteredToc } = useTocNavigation(toc)
  const currentItemRef = React.useRef<HTMLButtonElement | null>(null)

  React.useEffect(() => {
    if (tocFilter) return
    const timer = setTimeout(() => {
      if (currentItemRef.current) {
        currentItemRef.current.scrollIntoView({ behavior: 'auto', block: 'center' })
      }
    }, 60)
    return () => clearTimeout(timer)
  }, [currentChapterIndex, tocFilter])

  return (
    <div
      className={`flex-1 flex flex-col overflow-hidden ${
        isDark ? 'bg-[#1c1c1e]' : 'bg-white'
      }`}
    >
      {/* 目录常驻定位切换栏（仅桌面大屏显示） */}
      <div
        className={`hidden lg:flex px-4 py-2 border-b items-center justify-between gap-2 text-xs ${
          isDark ? 'border-white/8 bg-[#25262b]/60' : 'border-slate-100 bg-slate-50/80'
        }`}
      >
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <Pin className="w-3.5 h-3.5 text-[#1b88ee]" />
          <span className="font-semibold text-[11px]">目录钉住位置:</span>
        </div>
        <div className="flex items-center gap-1 bg-current/5 rounded-full p-0.5">
          <button
            type="button"
            onClick={() => onToggleDockSide?.('left')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition-all ${
              dockSide === 'left'
                ? 'bg-[#1b88ee] text-white font-semibold shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#1b88ee]'
            }`}
          >
            <span>订左侧</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleDockSide?.('right')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition-all ${
              dockSide === 'right'
                ? 'bg-[#1b88ee] text-white font-semibold shadow-2xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#1b88ee]'
            }`}
          >
            <span>订右侧</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleDockSide?.('none')}
            className={`px-2 py-1 rounded-full text-[11px] font-medium transition-all ${
              dockSide === 'none'
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-900 dark:text-white font-semibold'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <span>浮动</span>
          </button>
        </div>
      </div>
      <div
        className={`px-4 py-2.5 border-b ${
          isDark ? 'border-white/8' : 'border-slate-100'
        }`}
      >
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={tocFilter}
            onChange={(e) => setTocFilter(e.target.value)}
            placeholder={`搜索章节目录 (共 ${toc.length} 章)...`}
            className={`w-full pl-9 pr-3 py-2 rounded-full border border-transparent text-xs focus:outline-none transition-all ${
              isDark
                ? 'bg-[#2c2c2e] text-slate-100 placeholder:text-slate-500 focus:border-[#1b88ee]/50'
                : 'bg-[#f2f3f5] text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#1b88ee]/40'
            }`}
          />
        </div>
      </div>

      <div
        className={`flex-1 overflow-y-auto divide-y px-2 ${
          isDark ? 'divide-white/5' : 'divide-slate-100'
        }`}
      >
        {filteredToc.map((ch) => {
          const isCurrent = ch.index === currentChapterIndex
          return (
            <button
              key={ch.id}
              ref={isCurrent ? currentItemRef : undefined}
              onClick={() => {
                onSelectChapter(ch.index)
                onCloseIfOverlay()
              }}
              className={`w-full text-left px-3.5 py-3.5 flex items-center justify-between gap-3 transition-colors rounded-xl my-0.5 ${
                isCurrent
                  ? 'bg-[#1b88ee]/12 text-[#1b88ee] font-semibold ring-1 ring-[#1b88ee]/30'
                  : isDark
                  ? 'hover:bg-white/5 text-slate-200'
                  : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isCurrent
                      ? 'bg-[#1b88ee]'
                      : isDark
                      ? 'bg-slate-600'
                      : 'bg-slate-300'
                  }`}
                />
                <span className="text-[13px] truncate">{ch.title}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isCurrent && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#1b88ee]/15 text-[#1b88ee] font-medium leading-none">
                    当前
                  </span>
                )}
                <span
                  className={`text-[11px] font-mono ${
                    isCurrent ? 'text-[#1b88ee]/80' : 'text-slate-400'
                  }`}
                >
                  {ch.wordCount} 字
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
