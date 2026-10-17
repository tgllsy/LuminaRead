import React from 'react'
import { BookOpen, Compass, Search, Highlighter, Plus } from 'lucide-react'
import { HeaderTtsIsland } from './HeaderTtsIsland'
import { ProfileDropdown } from './ProfileDropdown'

export type NavPage = 'shelf' | 'discovery' | 'search' | 'stats' | 'sources' | 'notes' | 'tts'

interface DesktopHeaderProps {
  activePage: NavPage
  onSelectPage: (page: NavPage) => void
  onOpenSearch: () => void
  onTriggerUpload?: () => void
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  activePage,
  onSelectPage,
  onOpenSearch,
  onTriggerUpload,
}) => {
  return (
    <header className="hidden md:flex sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-6 xl:px-10 h-16 items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.04)] select-none">
      <div className="max-w-[1440px] w-full mx-auto flex items-center justify-between gap-3 lg:gap-5">
        {/* Left: Brand + Tier 1 High-Retention Navigation Links (Core 2) */}
        <div className="flex items-center gap-4 lg:gap-6 shrink-0">
          <div
            onClick={() => onSelectPage('shelf')}
            className="flex items-center gap-2.5 cursor-pointer select-none shrink-0"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#1b88ee] to-sky-400 text-white flex items-center justify-center font-serif font-bold text-base shadow-md shadow-blue-500/25">
              阅
            </div>
            <div className="flex flex-col">
              <span className="font-black text-slate-900 text-base tracking-tight leading-tight">
                阅境
              </span>
              <span className="text-[9px] text-[#1b88ee] font-mono font-bold tracking-widest uppercase">
                LuminaRead
              </span>
            </div>
          </div>

          {/* High-Frequency Tabs (停留时长 >90% 的双核心) */}
          <nav className="flex items-center gap-1 text-sm bg-slate-100/70 p-1 rounded-2xl border border-slate-200/60 shrink-0">
            <button
              type="button"
              onClick={() => onSelectPage('shelf')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activePage === 'shelf'
                  ? 'bg-white text-[#1b88ee] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#1b88ee]" />
              <span>书架</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectPage('notes')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activePage === 'notes'
                  ? 'bg-white text-[#1b88ee] shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Highlighter className="w-4 h-4 text-amber-500" />
              <span>笔记</span>
            </button>
          </nav>
        </div>

        {/* Center: Tier 2 Audio Living Island (听书高停留常驻灵动岛) */}
        <div className="flex items-center justify-center min-w-0 shrink">
          <HeaderTtsIsland onOpenTheater={() => onSelectPage('tts')} />
        </div>

        {/* Right: Tier 3 Tools & Tier 4 Profile Dropdown */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Tier 3: Instant Global Search */}
          <div
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/80 rounded-xl text-xs text-slate-500 cursor-pointer border border-slate-200/70 transition-all shrink-0 whitespace-nowrap"
            title="快捷全文检索 (⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="hidden xl:inline">全文秒搜...</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white text-[10px] text-slate-400 font-mono shadow-2xs shrink-0">
              ⌘K
            </kbd>
          </div>

          {/* Tier 3: Book Discovery */}
          <button
            type="button"
            onClick={() => onSelectPage('discovery')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
              activePage === 'discovery'
                ? 'bg-[#1b88ee] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="全网找书与下载"
          >
            <Compass className="w-3.5 h-3.5 text-[#1b88ee] shrink-0" />
            <span className="hidden 2xl:inline">找书发现</span>
          </button>

          {/* Upload Button */}
          {onTriggerUpload && (
            <button
              type="button"
              onClick={onTriggerUpload}
              className="px-3.5 py-1.5 rounded-xl bg-[#1b88ee] hover:bg-[#1575ce] text-white font-bold text-xs shadow-md shadow-blue-500/25 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 whitespace-nowrap"
              title="导入本地书籍"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>导入</span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-200 shrink-0" />

          {/* Tier 4: Personal Center & Low-Frequency Settings Dropdown */}
          <ProfileDropdown
            onOpenStats={() => onSelectPage('stats')}
            onOpenSources={() => onSelectPage('sources')}
          />
        </div>
      </div>
    </header>
  )
}
