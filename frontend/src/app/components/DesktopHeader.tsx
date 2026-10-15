import React from 'react'
import {
  BookOpen,
  Compass,
  Search,
  SlidersHorizontal,
  BarChart3,
  Highlighter,
} from 'lucide-react'

export type NavPage = 'shelf' | 'discovery' | 'search' | 'stats' | 'sources' | 'notes'

interface DesktopHeaderProps {
  activePage: NavPage
  onSelectPage: (page: NavPage) => void
  onOpenSearch: () => void
}

export const DesktopHeader: React.FC<DesktopHeaderProps> = ({
  activePage,
  onSelectPage,
  onOpenSearch,
}) => {
  return (
    <header className="hidden md:flex sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/70 px-6 lg:px-8 h-14 items-center justify-between">
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <div
            onClick={() => onSelectPage('shelf')}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-xl bg-[#1b88ee] text-white flex items-center justify-center font-serif font-bold text-sm shadow-2xs">
              阅
            </div>
            <span className="text-base font-bold tracking-tight text-slate-900">
              阅境
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center gap-6 lg:gap-7">
            <button
              type="button"
              onClick={() => onSelectPage('shelf')}
              className={`relative py-4 text-[15px] transition-colors flex items-center gap-1.5 cursor-pointer ${
                activePage === 'shelf'
                  ? 'text-[#1b88ee] font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>书架</span>
              {activePage === 'shelf' && (
                <span className="absolute bottom-0 inset-x-0 h-[2.5px] rounded-full bg-[#1b88ee]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectPage('notes')}
              className={`relative py-4 text-[15px] transition-colors flex items-center gap-1.5 cursor-pointer ${
                activePage === 'notes'
                  ? 'text-[#1b88ee] font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <Highlighter className="w-4 h-4" />
              <span>笔记 · 问书</span>
              {activePage === 'notes' && (
                <span className="absolute bottom-0 inset-x-0 h-[2.5px] rounded-full bg-[#1b88ee]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectPage('discovery')}
              className={`relative py-4 text-[15px] transition-colors flex items-center gap-1.5 cursor-pointer ${
                activePage === 'discovery'
                  ? 'text-[#1b88ee] font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>找书 · 书源</span>
              {activePage === 'discovery' && (
                <span className="absolute bottom-0 inset-x-0 h-[2.5px] rounded-full bg-[#1b88ee]" />
              )}
            </button>

            <button
              type="button"
              onClick={onOpenSearch}
              className={`relative py-4 text-[15px] transition-colors flex items-center gap-1.5 cursor-pointer ${
                activePage === 'search'
                  ? 'text-[#1b88ee] font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>全文秒搜</span>
              {activePage === 'search' && (
                <span className="absolute bottom-0 inset-x-0 h-[2.5px] rounded-full bg-[#1b88ee]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectPage('stats')}
              className={`relative py-4 text-[15px] transition-colors flex items-center gap-1.5 cursor-pointer ${
                activePage === 'stats'
                  ? 'text-[#1b88ee] font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>阅读记录</span>
              {activePage === 'stats' && (
                <span className="absolute bottom-0 inset-x-0 h-[2.5px] rounded-full bg-[#1b88ee]" />
              )}
            </button>
          </nav>
        </div>

        {/* Source settings button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectPage('sources')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              activePage === 'sources'
                ? 'bg-[#1b88ee] text-white font-semibold'
                : 'bg-[#f4f5f7] hover:bg-slate-200/70 text-slate-600'
            }`}
            title="书源镜像与代理配置"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>书源配置</span>
          </button>
        </div>
      </div>
    </header>
  )
}
