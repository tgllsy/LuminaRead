import React from 'react'
import { Search, Plus, SlidersHorizontal, Compass } from 'lucide-react'
import type { NavPage } from './DesktopHeader'

interface MobileAppBarProps {
  activePage: NavPage
  onSelectPage: (page: NavPage) => void
  onOpenSearch: () => void
  onTriggerUpload?: () => void
}

const PAGE_LABELS: Record<NavPage, string> = {
  shelf: '书架',
  discovery: '找书发现',
  search: '全文秒搜',
  stats: '阅读统计',
  sources: '书源配置',
  notes: '笔记·问书',
  tts: '听书剧场',
}

export const MobileAppBar: React.FC<MobileAppBarProps> = ({
  activePage,
  onSelectPage,
  onOpenSearch,
  onTriggerUpload,
}) => {
  return (
    <header className="md:hidden sticky top-0 z-30 liquid-glass border-b border-slate-200/75 pt-[env(safe-area-inset-top,0px)] select-none">
      <div className="h-13 px-3.5 flex items-center justify-between gap-2">
        {/* Left: Brand Identity + Current View Pill */}
        <div
          onClick={() => onSelectPage('shelf')}
          className="flex items-center gap-2 min-w-0 cursor-pointer active:scale-[0.97] transition-transform"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1b88ee] to-sky-400 text-white flex items-center justify-center font-serif font-bold text-sm shadow-sm shadow-blue-500/20 shrink-0">
            阅
          </div>
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span className="font-black text-slate-900 text-[15px] tracking-tight truncate">
              阅境
            </span>
            <span className="text-[11px] font-bold text-[#1b88ee] bg-blue-50/90 px-1.5 py-0.5 rounded-md border border-blue-200/50 truncate">
              {PAGE_LABELS[activePage] || '书架'}
            </span>
          </div>
        </div>

        {/* Right: Full Feature Parity Quick Actions (Search / Discovery / Import / Sources) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenSearch}
            className="h-8 px-2.5 rounded-xl bg-slate-100/90 hover:bg-slate-200/80 text-slate-600 text-xs font-medium flex items-center gap-1 border border-slate-200/70 transition-all active:scale-[0.97] cursor-pointer"
            title="全文秒搜"
          >
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span>秒搜</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectPage('discovery')}
            className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all active:scale-[0.97] cursor-pointer ${
              activePage === 'discovery'
                ? 'bg-[#1b88ee] text-white border-[#1b88ee] shadow-xs'
                : 'bg-slate-100/90 text-slate-700 border-slate-200/70'
            }`}
            title="全网找书"
          >
            <Compass className="w-4 h-4" />
          </button>

          {onTriggerUpload && (
            <button
              type="button"
              onClick={onTriggerUpload}
              className="h-8 px-2.5 rounded-xl bg-[#1b88ee] text-white font-bold text-xs shadow-sm shadow-blue-500/20 flex items-center gap-1 transition-all active:scale-[0.97] cursor-pointer"
              title="导入本地书籍"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>导入</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelectPage('sources')}
            className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all active:scale-[0.97] cursor-pointer ${
              activePage === 'sources'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-100/90 text-slate-600 border-slate-200/70'
            }`}
            title="书源与镜像设置"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  )
}
