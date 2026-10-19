import React from 'react'
import { X, Calendar } from 'lucide-react'
import { BottomSheet } from '../../../shared/ui/BottomSheet'
import { useReadingStats } from '../hooks'
import { StatsOverviewCards } from './StatsOverviewCards'
import { ReadingHeatmap } from './ReadingHeatmap'
import { ExportSyncSection } from './ExportSyncSection'
import type { ReadingStatsModalProps } from '../types'

const StatsHeader: React.FC<{
  asPage: boolean
  onClose: () => void
}> = ({ asPage, onClose }) => (
  <div
    className={
      asPage
        ? 'p-5 sm:p-7 bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl border-[0.5px] border-slate-200/80 shadow-2xs flex items-center justify-between gap-3'
        : 'px-5 py-3.5 sm:px-6 bg-white/90 border-b-[0.5px] border-slate-200/70 flex items-center justify-between gap-3 shrink-0'
    }
  >
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#1b88ee]/10 text-[#1b88ee] flex items-center justify-center shrink-0">
        <Calendar className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm sm:text-lg font-bold text-slate-900 leading-snug">阅读统计</h2>
        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">累计阅读记录与笔记数据</p>
      </div>
    </div>
    {asPage ? (
      <button
        type="button"
        onClick={onClose}
        className="hidden sm:inline-flex px-3.5 py-1.5 rounded-full border-[0.5px] border-slate-200/90 hover:bg-slate-50 text-xs font-semibold text-slate-600 items-center gap-1.5 shrink-0 active:scale-[0.97] transition-all cursor-pointer"
      >
        <span>返回书架</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0 active:scale-[0.97] transition-all cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
)

export const ReadingStatsModal: React.FC<ReadingStatsModalProps> = ({
  isOpen,
  onClose,
  books,
  asPage = false,
}) => {
  const s = useReadingStats({ isOpen, asPage, books })

  if (!isOpen && !asPage) return null

  const innerContent = (
    <div
      className={
        asPage
          ? 'max-w-6xl w-full mx-auto px-4 sm:px-8 py-5 sm:py-8 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-12 space-y-5'
          : 'w-full flex-1 min-h-0 flex flex-col overflow-hidden'
      }
    >
      <StatsHeader asPage={asPage} onClose={onClose} />

      <div
        className={
          asPage ? 'space-y-5' : 'flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6'
        }
      >
        {s.stats && <StatsOverviewCards stats={s.stats} />}
        {s.stats && <ReadingHeatmap heatmap={s.stats.heatmap} />}
        <ExportSyncSection
          books={books}
          selectedBookId={s.selectedBookId}
          onSelectBookId={s.setSelectedBookId}
          onExportObsidian={s.handleExportObsidian}
          onSyncLifeOS={s.handleSyncLifeOS}
          lifeOsMessage={s.lifeOsMessage}
          exportPreview={s.exportPreview}
        />
      </div>
    </div>
  )

  if (asPage) return innerContent

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} maxWidthClass="md:max-w-3xl">
      {innerContent}
    </BottomSheet>
  )
}
