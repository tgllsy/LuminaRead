import React from 'react'
import { X } from 'lucide-react'
import type { DesktopPanelHeaderProps } from '../types'

export const DesktopPanelHeader: React.FC<DesktopPanelHeaderProps> = ({
  currentTab,
  setTab,
  onClose,
  isDark,
}) => {
  return (
    <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-current/10">
      <div
        className={`flex items-center p-1 rounded-full text-xs font-semibold ${
          isDark ? 'bg-slate-800' : 'bg-[#f2f3f5]'
        }`}
      >
        <button
          type="button"
          onClick={() => setTab('font')}
          className={`px-3.5 py-1.5 rounded-full transition-all ${
            currentTab === 'font'
              ? 'bg-[#1b88ee] text-white shadow-2xs'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          A 字号排版
        </button>
        <button
          type="button"
          onClick={() => setTab('theme')}
          className={`px-3.5 py-1.5 rounded-full transition-all ${
            currentTab === 'theme'
              ? 'bg-[#1b88ee] text-white shadow-2xs'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          ☀ 亮度背景
        </button>
        <button
          type="button"
          onClick={() => setTab('progress')}
          className={`px-3.5 py-1.5 rounded-full transition-all ${
            currentTab === 'progress'
              ? 'bg-[#1b88ee] text-white shadow-2xs'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
          }`}
        >
          章节进度
        </button>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-current/5"
        title="关闭设置面板"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
