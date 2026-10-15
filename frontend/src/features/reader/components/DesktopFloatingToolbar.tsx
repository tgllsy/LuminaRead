import React from 'react'
import {
  ListOrdered,
  Highlighter,
  Search,
  Columns2,
  Sun,
  Moon,
  Headphones,
} from 'lucide-react'
import type { ReaderTypography } from '../types'
import type { WeReadBottomTab } from '../../reader-controls'

interface DesktopFloatingToolbarProps {
  typography: ReaderTypography
  onToggleLayoutMode: () => void
  showTypography: boolean
  activeBottomTab: WeReadBottomTab
  onOpenTypographyTab: (tab: WeReadBottomTab) => void
  drawerOpen: boolean
  drawerTab: 'toc' | 'search' | 'notes' | 'bookmarks'
  onOpenDrawerTab: (tab: 'toc' | 'search' | 'notes') => void
  dockSide?: 'left' | 'right' | 'none'
  onOpenCopilot: () => void
  onOpenTTS: () => void
  highlightsCount: number
  isTtsActive: boolean
  isTtsPlaying: boolean
  isTtsAmbientActive: boolean
}

export const DesktopFloatingToolbar: React.FC<DesktopFloatingToolbarProps> = ({
  typography,
  onToggleLayoutMode,
  showTypography,
  activeBottomTab,
  onOpenTypographyTab,
  drawerOpen,
  drawerTab,
  onOpenDrawerTab,
  dockSide = 'none',
  onOpenCopilot,
  onOpenTTS,
  highlightsCount,
  isTtsActive,
  isTtsPlaying,
  isTtsAmbientActive,
}) => {
  const isDark = typography.theme === 'dark'
  const baseBtnClass = isDark
    ? 'bg-[#242428]/90 border-white/10 text-slate-200 hover:bg-[#303036]'
    : 'bg-white/95 border-slate-200/90 text-slate-700 hover:text-[#1b88ee]'

  return (
    <aside
      data-no-hud-toggle="true"
      className="hidden lg:flex fixed right-4 xl:right-8 top-1/2 -translate-y-1/2 z-30 flex-col gap-2 max-h-[calc(100vh-5rem)] overflow-y-auto scrollbar-none py-1"
    >
      {/* 1. 目录 (TOC) */}
      <button
        type="button"
        onClick={() => onOpenDrawerTab('toc')}
        className={`w-12 h-12 rounded-full shadow-md border backdrop-blur-md flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-105 ${
          drawerOpen && drawerTab === 'toc'
            ? 'bg-[#1b88ee] border-[#1b88ee] text-white'
            : baseBtnClass
        }`}
        title={drawerOpen && dockSide !== 'none' ? `章节目录 (已钉在${dockSide === 'left' ? '左侧' : '右侧'})` : '章节目录'}
      >
        <ListOrdered className="w-4 h-4" />
        <span className="text-[10px] font-medium leading-none">
          {drawerOpen && dockSide === 'left' ? '目录·左' : drawerOpen && dockSide === 'right' ? '目录·右' : '目录'}
        </span>
      </button>

      {/* 2. 笔记 (Notes & Highlights) */}
      <button
        type="button"
        onClick={() => onOpenDrawerTab('notes')}
        className={`w-12 h-12 rounded-full shadow-md border backdrop-blur-md flex flex-col items-center justify-center gap-0.5 relative transition-all hover:scale-105 ${
          drawerOpen && drawerTab === 'notes'
            ? 'bg-[#1b88ee] border-[#1b88ee] text-white'
            : baseBtnClass
        }`}
        title="划线与想法笔记"
      >
        <Highlighter className="w-4 h-4" />
        <span className="text-[10px] font-medium leading-none">笔记</span>
        {highlightsCount > 0 && (
          <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-[#1b88ee]" />
        )}
      </button>

      {/* 3. 搜索 (Full-Text Search) */}
      <button
        type="button"
        onClick={() => onOpenDrawerTab('search')}
        className={`w-12 h-12 rounded-full shadow-md border backdrop-blur-md flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-105 ${
          drawerOpen && drawerTab === 'search'
            ? 'bg-[#1b88ee] border-[#1b88ee] text-white'
            : baseBtnClass
        }`}
        title="书中全文秒搜"
      >
        <Search className="w-4 h-4" />
        <span className="text-[10px] font-medium leading-none">搜索</span>
      </button>

      {/* 4. 双栏分页 / 上下滚动 */}
      <button
        type="button"
        onClick={onToggleLayoutMode}
        className={`w-12 h-12 rounded-full shadow-md border backdrop-blur-md flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-105 ${
          typography.layoutMode === 'dual'
            ? 'bg-[#1b88ee]/15 border-[#1b88ee]/40 text-[#1b88ee]'
            : baseBtnClass
        }`}
        title="切换双栏分页书页 / 单栏上下滚动"
      >
        <Columns2 className="w-4 h-4" />
        <span className="text-[10px] font-medium leading-none">
          {typography.layoutMode === 'dual' ? '双栏' : '滚动'}
        </span>
      </button>

      {/* 5. 字号排版 (A) */}
      <button
        type="button"
        onClick={() => onOpenTypographyTab('font')}
        className={`w-12 h-12 rounded-full shadow-md border backdrop-blur-md flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-105 ${
          showTypography && activeBottomTab === 'font'
            ? 'bg-[#1b88ee] border-[#1b88ee] text-white'
            : baseBtnClass
        }`}
        title="字号、字体、边距与行距设置"
      >
        <span className="text-sm font-bold leading-none">A</span>
        <span className="text-[10px] font-medium leading-none">排版</span>
      </button>

      {/* 6. 主题背景 (☀ / 🌙) */}
      <button
        type="button"
        onClick={() => onOpenTypographyTab('theme')}
        className={`w-12 h-12 rounded-full shadow-md border backdrop-blur-md flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-105 ${
          showTypography && activeBottomTab === 'theme'
            ? 'bg-[#1b88ee] border-[#1b88ee] text-white'
            : baseBtnClass
        }`}
        title="亮度、主题色与日夜切换"
      >
        {isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        <span className="text-[10px] font-medium leading-none">主题</span>
      </button>

      {/* 7. AI 伴读 (AI+) */}
      <button
        type="button"
        onClick={onOpenCopilot}
        className={`w-12 h-12 rounded-full shadow-md border backdrop-blur-md flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-105 ${baseBtnClass}`}
        title="AI 伴读与防剧透导读"
      >
        <span className="text-xs font-extrabold leading-none">
          AI<sup className="text-[8px] ml-0.5">+</sup>
        </span>
        <span className="text-[10px] font-medium leading-none">伴读</span>
      </button>

      {/* 8. AI 听书 */}
      <button
        type="button"
        onClick={onOpenTTS}
        className={`relative w-12 h-12 rounded-full shadow-md border backdrop-blur-md flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-105 ${
          isTtsActive
            ? isDark
              ? 'bg-amber-500 border-amber-400 text-slate-950 ring-4 ring-amber-400/20 font-bold'
              : 'bg-emerald-700 border-emerald-700 text-white ring-4 ring-emerald-600/20 font-bold'
            : baseBtnClass
        }`}
        title={isTtsActive ? '伴读播放中 · 点击展开听书台' : '打开阅境伴读听书'}
      >
        <Headphones className="w-4 h-4" />
        <span className="text-[10px] font-medium leading-none">
          {isTtsPlaying ? '朗读中' : '听书'}
        </span>
        {isTtsActive && (
          <span
            className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
              isTtsPlaying || isTtsAmbientActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
            }`}
          />
        )}
      </button>
    </aside>
  )
}
