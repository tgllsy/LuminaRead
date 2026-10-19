import React from 'react'
import { Search, Plus, SlidersHorizontal, ArrowLeft, BarChart3 } from 'lucide-react'
import type { NavPage } from './DesktopHeader'

interface MobileAppBarProps {
  activePage: NavPage
  onSelectPage: (page: NavPage) => void
  onOpenSearch: () => void
  onTriggerUpload?: () => void
}

const PAGE_LABELS: Record<NavPage, string> = {
  shelf: '书架',
  discovery: '找书',
  search: '全文秒搜',
  stats: '阅读统计',
  sources: '书源中心',
  notes: '笔记',
  tts: '听书剧场',
}

const SECONDARY_PAGES = new Set<NavPage>(['search', 'stats', 'sources'])

export const MobileAppBar: React.FC<MobileAppBarProps> = ({
  activePage,
  onSelectPage,
  onOpenSearch,
  onTriggerUpload,
}) => {
  const isSecondary = SECONDARY_PAGES.has(activePage)

  return (
    <header className="md:hidden sticky top-0 z-30 liquid-glass border-b border-slate-200/75 pt-[env(safe-area-inset-top,0px)] select-none">
      <div className="h-12 px-3.5 flex items-center justify-between gap-2">
        {isSecondary ? (
          <button
            type="button"
            onClick={() => onSelectPage(activePage === 'sources' ? 'discovery' : 'shelf')}
            className="flex items-center gap-1.5 min-w-0 cursor-pointer active:scale-[0.97] transition-transform text-slate-800"
          >
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
              <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="font-bold text-slate-900 text-[15px] tracking-tight truncate">
              {PAGE_LABELS[activePage]}
            </span>
          </button>
        ) : (
          <div
            onClick={() => onSelectPage('shelf')}
            className="flex items-center gap-2 min-w-0 cursor-pointer active:scale-[0.97] transition-transform"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#1b88ee] to-sky-400 text-white flex items-center justify-center font-serif font-bold text-xs shadow-sm shadow-blue-500/20 shrink-0">
              阅
            </div>
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-black text-slate-900 text-[15px] tracking-tight truncate">
                阅境
              </span>
              <span className="text-[11px] font-bold text-[#1b88ee] bg-blue-50/90 px-1.5 py-0.5 rounded-md border border-blue-200/50 truncate">
                {PAGE_LABELS[activePage] || '书架'}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          {activePage !== 'search' && (
            <button
              type="button"
              onClick={onOpenSearch}
              className="h-8 px-2.5 rounded-full bg-slate-100/90 hover:bg-slate-200/80 text-slate-600 text-xs font-medium flex items-center gap-1 border border-slate-200/70 transition-all active:scale-[0.97] cursor-pointer"
              title="跨书全文秒搜"
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>全文搜</span>
            </button>
          )}

          {activePage === 'discovery' ? (
            <button
              type="button"
              onClick={() => onSelectPage('sources')}
              className="h-8 px-2.5 rounded-full bg-slate-100/90 text-slate-700 text-xs font-semibold flex items-center gap-1 border border-slate-200/70 transition-all active:scale-[0.97] cursor-pointer"
              title="书源与镜像设置"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#1b88ee]" />
              <span>书源</span>
            </button>
          ) : activePage === 'notes' ? (
            <button
              type="button"
              onClick={() => onSelectPage('stats')}
              className="h-8 px-2.5 rounded-full bg-slate-100/90 text-slate-700 text-xs font-semibold flex items-center gap-1 border border-slate-200/70 transition-all active:scale-[0.97] cursor-pointer"
              title="阅读统计与热力图"
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#1b88ee]" />
              <span>统计</span>
            </button>
          ) : (
            onTriggerUpload && (
              <button
                type="button"
                onClick={onTriggerUpload}
                className="h-8 px-3 rounded-full bg-[#1b88ee] text-white font-bold text-xs shadow-sm shadow-blue-500/20 flex items-center gap-1 transition-all active:scale-[0.97] cursor-pointer"
                title="导入本地书籍"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>导入</span>
              </button>
            )
          )}
        </div>
      </div>
    </header>
  )
}

