import React from 'react'
import {
  ListOrdered,
  Highlighter,
  Search,
  Columns2,
  Sun,
  Moon,
  Headphones,
  Languages,
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
  isCopilotOpen?: boolean
  onOpenTTS: () => void
  highlightsCount: number
  isTtsActive: boolean
  isTtsPlaying: boolean
  isTtsAmbientActive: boolean
  onToggleChinese?: () => void
  onToggleBilingual?: () => void
  bilingualLoading?: boolean
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
  isCopilotOpen = false,
  onOpenTTS,
  highlightsCount,
  isTtsActive,
  isTtsPlaying,
  isTtsAmbientActive,
  onToggleChinese,
  onToggleBilingual,
  bilingualLoading = false,
}) => {
  const isDark = typography.theme === 'dark'
  const variant = typography.chineseVariant
  const isVariantActive = Boolean(variant && variant !== 'original')
  const baseBtnClass = isDark
    ? 'bg-[#242428]/90 border-white/10 text-slate-200 hover:bg-[#303036]'
    : 'bg-white/95 border-slate-200/90 text-slate-700 hover:text-[#1b88ee]'

  const isDockedRight = drawerOpen && dockSide === 'right'
  const rightPositionClass = isCopilotOpen
    ? 'right-[440px] md:right-[470px] lg:right-[500px] xl:right-[520px]'
    : isDockedRight
    ? 'right-[335px] lg:right-[365px] xl:right-[395px]'
    : 'right-4 xl:right-8'

  return (
    <aside
      data-no-hud-toggle="true"
      className={`hidden lg:flex fixed top-1/2 -translate-y-1/2 z-30 flex-col gap-1.5 max-h-[calc(100vh-4rem)] overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1 transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${rightPositionClass}`}
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
        className={`w-12 h-12 rounded-full shadow-md border backdrop-blur-md flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-105 cursor-pointer ${
          drawerOpen && drawerTab === 'search'
            ? 'bg-[#1b88ee] border-[#1b88ee] text-white'
            : baseBtnClass
        }`}
        title="书中全文秒搜"
      >
        <Search className="w-4 h-4" />
        <span className="text-[10px] font-medium leading-none">搜索</span>
      </button>

      {/* 4. 繁简正反面：正面“简”，反面“繁”，点击 3D 翻面 */}
      {onToggleChinese && (
        <button
          type="button"
          onClick={onToggleChinese}
          className={`w-12 h-12 rounded-full shadow-md border backdrop-blur-md flex items-center justify-center transition-transform hover:scale-105 cursor-pointer relative [perspective:500px] overflow-hidden ${baseBtnClass}`}
          title={`繁简正反面切换（正面:简 / 反面:繁，当前: ${variant === 'traditional' ? '繁体' : variant === 'simplified' ? '简体' : '原文'}，点击翻面）`}
        >
          <div
            style={{
              transform: variant === 'traditional' ? 'rotateY(180deg)' : 'rotateY(0deg)',
              transformStyle: 'preserve-3d',
              transition: 'transform 0.42s cubic-bezier(0.34, 1.45, 0.64, 1)',
            }}
            className="w-full h-full relative"
          >
            {/* 正面：简 */}
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center backface-hidden rounded-full ${
                variant === 'simplified' ? 'bg-[#1b88ee] text-white' : ''
              }`}
            >
              <span className="font-serif font-black text-sm leading-none select-none">简</span>
              <span className="text-[9px] font-sans opacity-70 scale-90 leading-none mt-0.5 select-none">
                {variant === 'simplified' ? '已转' : '正'}
              </span>
            </div>

            {/* 背面：繁 (180deg) */}
            <div
              style={{ transform: 'rotateY(180deg)' }}
              className={`absolute inset-0 flex flex-col items-center justify-center backface-hidden rounded-full ${
                variant === 'traditional' ? 'bg-[#1b88ee] text-white' : 'bg-amber-500/10 text-amber-600'
              }`}
            >
              <span className="font-serif font-black text-sm leading-none select-none">繁</span>
              <span className="text-[9px] font-sans opacity-70 scale-90 leading-none mt-0.5 select-none">
                {variant === 'traditional' ? '已转' : '反'}
              </span>
            </div>
          </div>
        </button>
      )}

      {/* 5. 双语对照 / 翻译 */}
      {onToggleBilingual && (
        <button
          type="button"
          onClick={onToggleBilingual}
          className={`w-12 h-12 rounded-full shadow-md border backdrop-blur-md flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-105 cursor-pointer ${
            typography.bilingualMode
              ? 'bg-[#1b88ee] border-[#1b88ee] text-white'
              : baseBtnClass
          }`}
          title={bilingualLoading ? '段落双语翻译中...' : '段落级双语翻译与对照'}
        >
          <Languages className="w-4 h-4" />
          <span className="text-[10px] font-medium leading-none">
            {bilingualLoading ? '翻译中' : '双语'}
          </span>
        </button>
      )}

      {/* 6. 双栏分页 / 上下滚动 */}
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
        className={`w-12 h-12 rounded-full shadow-md border backdrop-blur-md flex flex-col items-center justify-center gap-0.5 transition-all hover:scale-105 cursor-pointer ${
          isCopilotOpen
            ? 'bg-[#1b88ee] border-[#1b88ee] text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-400/30'
            : baseBtnClass
        }`}
        title={isCopilotOpen ? '收回 AI 伴读边栏' : '展开 AI 伴读边栏'}
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
