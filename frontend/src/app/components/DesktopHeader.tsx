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

const DesktopBrandAndNav: React.FC<{
  activePage: NavPage
  onSelectPage: (page: NavPage) => void
}> = ({ activePage, onSelectPage }) => (
  <div className="flex items-center gap-4 lg:gap-6 shrink-0">
    <div
      onClick={() => onSelectPage('shelf')}
      className="flex items-center gap-2.5 cursor-pointer select-none shrink-0 active:scale-[0.97] transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
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

    <nav className="flex items-center gap-1 text-sm bg-slate-100/75 p-1 rounded-2xl border-[0.5px] border-slate-200/80 shrink-0">
      <button
        type="button"
        onClick={() => onSelectPage('shelf')}
        className={`px-3.5 py-1.5 rounded-xl font-bold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
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
        className={`px-3.5 py-1.5 rounded-xl font-bold transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
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
)

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  activePage,
  onSelectPage,
  onOpenSearch,
  onTriggerUpload,
}) => {
  return (
    <header className="hidden md:flex sticky top-0 z-40 liquid-glass border-b-[0.5px] border-slate-200/80 px-6 xl:px-10 h-16 items-center justify-between select-none">
      <div className="max-w-[1440px] w-full mx-auto flex items-center justify-between gap-3 lg:gap-5">
        <DesktopBrandAndNav activePage={activePage} onSelectPage={onSelectPage} />

        <div className="flex-1 max-w-sm lg:max-w-md xl:max-w-lg mx-3 sm:mx-6 flex items-center justify-center min-w-0">
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full h-10 px-3.5 rounded-2xl bg-slate-100/80 hover:bg-white hover:border-[#1b88ee]/50 hover:shadow-xs border border-slate-200/90 flex items-center justify-between text-xs transition-all duration-200 group cursor-pointer shadow-2xs"
            title="全网书目与全书全文秒搜 (⌘K / Ctrl+K)"
          >
            <div className="flex items-center gap-2.5 min-w-0 truncate">
              <Search className="w-4 h-4 text-slate-400 group-hover:text-[#1b88ee] transition-colors shrink-0" />
              <span className="text-slate-400 group-hover:text-slate-600 truncate font-normal">
                全文秒搜全馆图书、作者、笔记...
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 pl-2">
              <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg bg-white border border-slate-200/80 text-[11px] font-mono text-slate-400 group-hover:text-slate-700 shadow-2xs font-semibold">
                ⌘K
              </kbd>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <HeaderTtsIsland onOpenTheater={() => onSelectPage('tts')} />

          <button
            type="button"
            onClick={() => onSelectPage('discovery')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] cursor-pointer shrink-0 whitespace-nowrap ${
              activePage === 'discovery'
                ? 'bg-[#1b88ee] text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="全网找书与下载"
          >
            <Compass
              className={`w-3.5 h-3.5 shrink-0 ${
                activePage === 'discovery' ? 'text-white' : 'text-[#1b88ee]'
              }`}
            />
            <span className="hidden 2xl:inline">找书发现</span>
          </button>

          {onTriggerUpload && (
            <button
              type="button"
              onClick={onTriggerUpload}
              className="px-3.5 py-1.5 rounded-xl bg-[#1b88ee] hover:bg-[#1575ce] text-white font-bold text-xs shadow-md shadow-blue-500/25 flex items-center gap-1.5 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] cursor-pointer shrink-0 whitespace-nowrap"
              title="导入本地书籍"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>导入</span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-200 shrink-0" />

          <ProfileDropdown
            onOpenStats={() => onSelectPage('stats')}
            onOpenSources={() => onSelectPage('sources')}
          />
        </div>
      </div>
    </header>
  )
}
