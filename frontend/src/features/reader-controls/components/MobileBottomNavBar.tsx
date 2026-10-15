import React from 'react'
import {
  ListOrdered,
  SlidersHorizontal,
  Sun,
  Moon,
  Type,
  Highlighter,
} from 'lucide-react'
import type { MobileBottomNavBarProps } from '../types'

export const MobileBottomNavBar: React.FC<MobileBottomNavBarProps> = ({
  currentTab,
  setTab,
  isDark,
  onClose,
  onOpenToc,
  onOpenNotesOrIdeas,
}) => {
  return (
    <div
      className={`pt-2.5 border-t grid grid-cols-5 items-center text-center ${
        isDark ? 'border-slate-800/80' : 'border-slate-100'
      }`}
    >
      {/* 1. 目录抽屉 */}
      <button
        type="button"
        onClick={() => {
          onClose()
          onOpenToc?.()
        }}
        aria-label="目录"
        className="py-1 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
      >
        <ListOrdered className="w-5 h-5 stroke-[1.8]" />
        <span className="text-[11px] font-medium leading-none">目录</span>
      </button>

      {/* 2. 章节进度 */}
      <button
        type="button"
        onClick={() => setTab('progress')}
        aria-label="阅读进度"
        className={`py-1 flex flex-col items-center justify-center gap-1 transition-colors ${
          currentTab === 'progress'
            ? 'text-[#1b88ee] font-semibold'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        }`}
      >
        <SlidersHorizontal className="w-5 h-5 stroke-[1.8]" />
        <span className="text-[11px] font-medium leading-none">进度</span>
      </button>

      {/* 3. 亮度与主题 */}
      <button
        type="button"
        onClick={() => setTab('theme')}
        aria-label="亮度与主题"
        className={`py-1 flex flex-col items-center justify-center gap-1 transition-colors ${
          currentTab === 'theme'
            ? 'text-[#1b88ee] font-semibold'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        }`}
      >
        {isDark ? <Moon className="w-5 h-5 stroke-[1.8]" /> : <Sun className="w-5 h-5 stroke-[1.8]" />}
        <span className="text-[11px] font-medium leading-none">主题</span>
      </button>

      {/* 4. 字号与排版 */}
      <button
        type="button"
        onClick={() => setTab('font')}
        aria-label="字号与排版"
        className={`py-1 flex flex-col items-center justify-center gap-1 transition-colors ${
          currentTab === 'font'
            ? 'text-[#1b88ee] font-semibold'
            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
        }`}
      >
        <Type className="w-5 h-5 stroke-[1.8]" />
        <span className="text-[11px] font-medium leading-none">排版</span>
      </button>

      {/* 5. 想法与划线笔记 */}
      <button
        type="button"
        onClick={() => {
          onClose()
          onOpenNotesOrIdeas?.()
        }}
        aria-label="笔记"
        className="py-1 flex flex-col items-center justify-center gap-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
      >
        <Highlighter className="w-5 h-5 stroke-[1.8]" />
        <span className="text-[11px] font-medium leading-none">笔记</span>
      </button>
    </div>
  )
}

