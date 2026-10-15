import React from 'react'
import {
  BookOpen,
  Compass,
  Highlighter,
} from 'lucide-react'
import type { NavPage } from './DesktopHeader'

interface MobileBottomNavProps {
  activePage: NavPage
  onSelectPage: (page: NavPage) => void
  onOpenSearch?: () => void
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activePage,
  onSelectPage,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-3 pt-1.5 pb-[max(0.65rem,env(safe-area-inset-bottom,0px))] grid grid-cols-3 items-center shadow-[0_-4px_20px_rgba(15,23,42,0.06)] select-none">
      <button
        type="button"
        onClick={() => onSelectPage('shelf')}
        className={`flex flex-col items-center justify-center gap-1 py-1 transition-all active:scale-95 cursor-pointer ${
          activePage === 'shelf'
            ? 'text-[#1b88ee] font-bold'
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <BookOpen className={`w-5 h-5 transition-transform ${activePage === 'shelf' ? 'scale-110' : ''}`} />
        <span className="text-[11px] leading-tight">书架</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectPage('discovery')}
        className={`flex flex-col items-center justify-center gap-1 py-1 transition-all active:scale-95 cursor-pointer ${
          activePage === 'discovery' || activePage === 'sources'
            ? 'text-[#1b88ee] font-bold'
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <Compass className={`w-5 h-5 transition-transform ${activePage === 'discovery' || activePage === 'sources' ? 'scale-110' : ''}`} />
        <span className="text-[11px] leading-tight">找书·书源</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectPage('notes')}
        className={`flex flex-col items-center justify-center gap-1 py-1 transition-all active:scale-95 cursor-pointer ${
          activePage === 'notes'
            ? 'text-[#1b88ee] font-bold'
            : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <Highlighter className={`w-5 h-5 transition-transform ${activePage === 'notes' ? 'scale-110' : ''}`} />
        <span className="text-[11px] leading-tight">笔记·问书</span>
      </button>
    </nav>
  )
}
