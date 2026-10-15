import React from 'react'
import { X, Calendar } from 'lucide-react'
import { useReadingStats, useEscapeKey } from '../hooks'
import { StatsOverviewCards } from './StatsOverviewCards'
import { ReadingHeatmap } from './ReadingHeatmap'
import { ExportSyncSection } from './ExportSyncSection'
import type { ReadingStatsModalProps } from '../types'

export const ReadingStatsModal: React.FC<ReadingStatsModalProps> = ({
  isOpen,
  onClose,
  books,
  asPage = false,
}) => {
  const {
    stats,
    selectedBookId,
    setSelectedBookId,
    exportPreview,
    lifeOsMessage,
    handleExportObsidian,
    handleSyncLifeOS,
  } = useReadingStats({
    isOpen,
    asPage,
    books,
  })

  useEscapeKey(isOpen && !asPage, onClose)

  if (!isOpen && !asPage) return null

  const innerContent = (
    <div
      onClick={(e) => e.stopPropagation()}
      className={
        asPage
          ? 'max-w-6xl w-full mx-auto px-4 sm:px-8 py-5 sm:py-8 pb-24 sm:pb-12 space-y-5'
          : 'bg-white sm:rounded-3xl sm:shadow-2xl sm:border border-slate-200/80 w-full max-w-3xl h-dvh sm:h-auto sm:max-h-[88dvh] flex flex-col overflow-hidden'
      }
    >
      {/* Unified WeChat Read Header */}
      <div
        className={
          asPage
            ? 'p-5 sm:p-7 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3'
            : 'px-5 py-4 sm:px-6 bg-white border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0'
        }
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#1b88ee]/10 text-[#1b88ee] flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-lg font-bold text-slate-900 leading-snug">
              阅读统计
            </h2>
            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
              累计阅读记录与笔记数据
            </p>
          </div>
        </div>
        {asPage ? (
          <button
            onClick={onClose}
            className="hidden sm:inline-flex px-3.5 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 items-center gap-1.5 shrink-0 transition-colors"
          >
            <span>返回书架</span>
          </button>
        ) : (
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div
        className={
          asPage
            ? 'space-y-5'
            : 'flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6'
        }
      >
        {/* Metric Cards */}
        {stats && <StatsOverviewCards stats={stats} />}

        {/* Reading Calendar Heatmap */}
        {stats && <ReadingHeatmap heatmap={stats.heatmap} />}

        {/* Obsidian & LifeOS Bidirectional Export */}
        <ExportSyncSection
          books={books}
          selectedBookId={selectedBookId}
          onSelectBookId={setSelectedBookId}
          onExportObsidian={handleExportObsidian}
          onSyncLifeOS={handleSyncLifeOS}
          lifeOsMessage={lifeOsMessage}
          exportPreview={exportPreview}
        />
      </div>
    </div>
  )

  if (asPage) {
    return innerContent
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-white sm:bg-slate-950/60 sm:backdrop-blur-sm p-0 sm:p-4"
    >
      {innerContent}
    </div>
  )
}
