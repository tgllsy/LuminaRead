import React from 'react'
import { Sparkles, Network, X, PanelLeft, PanelRight, Square } from 'lucide-react'
import type { CopilotLayoutMode } from '../types'

interface CopilotHeaderProps {
  bookTitle: string
  currentChapterTitle: string
  activeTab: 'recap' | 'copilot'
  onTabChange: (tab: 'recap' | 'copilot') => void
  layoutMode?: CopilotLayoutMode
  onChangeLayoutMode?: (mode: CopilotLayoutMode) => void
  onClose: () => void
  isDark: boolean
}

export const CopilotHeader: React.FC<CopilotHeaderProps> = ({
  bookTitle,
  currentChapterTitle,
  activeTab,
  onTabChange,
  layoutMode = 'modal',
  onChangeLayoutMode,
  onClose,
  isDark,
}) => {
  return (
    <div
      className={`px-5 pt-4 pb-3.5 border-b shrink-0 flex flex-col gap-3 ${
        isDark ? 'bg-[#1c1c1e] border-white/8' : 'bg-white border-slate-100'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-full bg-[#1b88ee]/12 text-[#1b88ee] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-[15px] font-bold truncate">
                AI 问书 · 伴读与脉络
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#1b88ee]/10 text-[#1b88ee] text-[10px] font-semibold shrink-0">
                防剧透保护
              </span>
            </div>
            <p
              className={`text-[11px] truncate mt-0.5 ${
                isDark ? 'text-slate-400' : 'text-slate-400'
              }`}
            >
              《{bookTitle}》· {currentChapterTitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onChangeLayoutMode && (
            <div className="hidden sm:flex items-center bg-current/5 rounded-full p-0.5 text-xs mr-1">
              <button
                type="button"
                onClick={() => onChangeLayoutMode(layoutMode === 'dock-left' ? 'modal' : 'dock-left')}
                title={layoutMode === 'dock-left' ? '还原为居中窗口' : '悬浮在左侧'}
                className={`p-1.5 rounded-full transition-all ${
                  layoutMode === 'dock-left'
                    ? 'bg-[#1b88ee] text-white shadow-2xs'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <PanelLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onChangeLayoutMode('modal')}
                title="居中窗口"
                className={`p-1.5 rounded-full transition-all ${
                  layoutMode === 'modal'
                    ? 'bg-[#1b88ee] text-white shadow-2xs'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Square className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onChangeLayoutMode(layoutMode === 'dock-right' ? 'modal' : 'dock-right')}
                title={layoutMode === 'dock-right' ? '还原为居中窗口' : '悬浮在右侧'}
                className={`p-1.5 rounded-full transition-all ${
                  layoutMode === 'dock-right'
                    ? 'bg-[#1b88ee] text-white shadow-2xs'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <PanelRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full shrink-0 transition-colors ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-white/10'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2-Tab Pill Switcher */}
      <div
        className={`grid grid-cols-2 gap-1 rounded-full p-1 ${
          isDark ? 'bg-[#2c2c2e]' : 'bg-[#f2f3f5]'
        }`}
      >
        <button
          type="button"
          onClick={() => onTabChange('recap')}
          className={`py-1.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'recap'
              ? isDark
                ? 'bg-[#1c1c1e] text-[#1b88ee] shadow-2xs'
                : 'bg-white text-[#1b88ee] shadow-2xs'
              : isDark
              ? 'text-slate-400 hover:text-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Network className="w-3.5 h-3.5 shrink-0" />
          <span>前情脉络 & 星图</span>
        </button>
        <button
          type="button"
          onClick={() => onTabChange('copilot')}
          className={`py-1.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
            activeTab === 'copilot'
              ? isDark
                ? 'bg-[#1c1c1e] text-[#1b88ee] shadow-2xs'
                : 'bg-white text-[#1b88ee] shadow-2xs'
              : isDark
              ? 'text-slate-400 hover:text-slate-200'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>AI 深度解读 & 提问</span>
        </button>
      </div>
    </div>
  )
}
