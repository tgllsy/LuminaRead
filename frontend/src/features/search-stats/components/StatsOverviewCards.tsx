import React from 'react'
import { Clock, Flame, BookCheck, Highlighter } from 'lucide-react'
import { formatLibraryWords } from '../helpers'
import type { StatsOverview } from '../types'

interface StatsOverviewCardsProps {
  stats: StatsOverview
}

export const StatsOverviewCards: React.FC<StatsOverviewCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>今日阅读</span>
          <Clock className="w-4 h-4 text-blue-600 shrink-0" />
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
          {stats.today_reading_minutes}{' '}
          <span className="text-xs font-normal text-slate-500">分钟</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          累计时长 {stats.total_reading_hours} 小时
        </p>
      </div>

      <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>连续天数</span>
          <Flame className="w-4 h-4 text-amber-500 shrink-0" />
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
          {stats.streak_days}{' '}
          <span className="text-xs font-normal text-slate-500">天</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">连续阅读记录</p>
      </div>

      <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>在读 / 读完</span>
          <BookCheck className="w-4 h-4 text-emerald-600 shrink-0" />
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
          {stats.reading_books} / {stats.finished_books}{' '}
          <span className="text-xs font-normal text-slate-500">本</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          馆藏共 {formatLibraryWords(stats.total_words_in_library)}
        </p>
      </div>

      <div className="p-3.5 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>划线与想法</span>
          <Highlighter className="w-4 h-4 text-purple-600 shrink-0" />
        </div>
        <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">
          {stats.highlights_count}{' '}
          <span className="text-xs font-normal text-slate-500">条</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          其中想法 {stats.notes_count} 条
        </p>
      </div>
    </div>
  )
}
