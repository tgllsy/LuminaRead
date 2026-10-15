import React, { useMemo } from 'react'
import { GitFork, FileDown, Send, Trash2 } from 'lucide-react'
import type { BookSummary, TocItem, HighlightItem } from '../types'
import { COLOR_HEX, COLOR_FILTERS } from '../constants'
import { filterHighlights, computeMindmapLayout } from '../helpers'
import { useSidebarHighlights } from '../hooks'
import { MindmapView } from './MindmapView'

interface HighlightsTabProps {
  book: BookSummary
  toc: TocItem[]
  highlights: HighlightItem[]
  onSelectChapter: (chapterIndex: number, paragraphIndex?: number) => void
  onDeleteHighlight: (id: string) => void
  onCloseIfOverlay: () => void
  isDark: boolean
}

export const HighlightsTab: React.FC<HighlightsTabProps> = ({
  book,
  toc,
  highlights,
  onSelectChapter,
  onDeleteHighlight,
  onCloseIfOverlay,
  isDark,
}) => {
  const {
    notesViewMode,
    setNotesViewMode,
    colorFilter,
    setColorFilter,
    chapterFilter,
    setChapterFilter,
    mindmapZoom,
    syncMsg,
    handleExportMd,
    handlePushLifeOS,
    zoomIn,
    zoomOut,
    resetZoom,
  } = useSidebarHighlights(book)

  const safeToc = useMemo(() => (Array.isArray(toc) ? toc : []), [toc])
  const safeHighlights = useMemo(
    () => (Array.isArray(highlights) ? highlights : []),
    [highlights]
  )

  const filteredHighlights = useMemo(
    () => filterHighlights(safeHighlights, colorFilter, chapterFilter),
    [safeHighlights, colorFilter, chapterFilter]
  )

  const mindmapLayout = useMemo(
    () => computeMindmapLayout(safeToc, filteredHighlights),
    [safeToc, filteredHighlights]
  )

  return (
    <div
      className={`flex-1 flex flex-col overflow-hidden ${
        isDark ? 'bg-[#141416]' : 'bg-[#f7f8fa]'
      }`}
    >
      {/* Toolbar: List vs Mindmap + Export */}
      <div
        className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 ${
          isDark
            ? 'bg-[#1c1c1e] border-white/8'
            : 'bg-white border-slate-200/70'
        }`}
      >
        <div
          className={`inline-flex rounded-full p-0.5 ${
            isDark ? 'bg-[#2c2c2e]' : 'bg-[#f2f3f5]'
          }`}
        >
          <button
            onClick={() => setNotesViewMode('list')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              notesViewMode === 'list'
                ? isDark
                  ? 'bg-[#1c1c1e] text-[#1b88ee] font-semibold shadow-2xs'
                  : 'bg-white text-[#1b88ee] font-semibold shadow-2xs'
                : isDark
                ? 'text-slate-400'
                : 'text-slate-600'
            }`}
          >
            笔记列表
          </button>
          <button
            onClick={() => setNotesViewMode('mindmap')}
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 transition-all ${
              notesViewMode === 'mindmap'
                ? isDark
                  ? 'bg-[#1c1c1e] text-[#1b88ee] font-semibold shadow-2xs'
                  : 'bg-white text-[#1b88ee] font-semibold shadow-2xs'
                : isDark
                ? 'text-slate-400'
                : 'text-slate-600'
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            思维导图
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExportMd}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 transition-colors ${
              isDark
                ? 'bg-[#2c2c2e] text-slate-200 hover:bg-white/10'
                : 'bg-[#f2f3f5] hover:bg-slate-200/70 text-slate-700'
            }`}
          >
            <FileDown className="w-3 h-3" />
            导出MD
          </button>
          <button
            onClick={handlePushLifeOS}
            className="px-2.5 py-1 rounded-full bg-[#1b88ee]/12 hover:bg-[#1b88ee]/20 text-[11px] font-medium text-[#1b88ee] flex items-center gap-1 transition-colors"
          >
            <Send className="w-3 h-3" />
            同步LifeOS
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className="px-4 py-2 bg-emerald-500/15 border-b border-emerald-500/25 text-emerald-600 dark:text-emerald-300 text-xs">
          {syncMsg}
        </div>
      )}

      {/* Color & Chapter filter bar */}
      <div
        className={`px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2 text-xs ${
          isDark ? 'bg-[#1c1c1e] border-white/8' : 'bg-white border-slate-100'
        }`}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-400 shrink-0 whitespace-nowrap">
            筛选:
          </span>
          {COLOR_FILTERS.map((c) => (
            <button
              key={c.id}
              onClick={() => setColorFilter(c.id)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] shrink-0 whitespace-nowrap transition-colors ${
                colorFilter === c.id
                  ? 'bg-[#1b88ee] text-white font-semibold'
                  : isDark
                  ? 'bg-[#2c2c2e] text-slate-300 hover:bg-white/10'
                  : 'bg-[#f2f3f5] text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <select
          value={chapterFilter}
          onChange={(e) =>
            setChapterFilter(
              e.target.value === 'all' ? 'all' : Number(e.target.value)
            )
          }
          aria-label="按章节筛选笔记"
          className={`px-2.5 py-1 rounded-full border text-[11px] max-w-[150px] truncate ${
            isDark
              ? 'border-white/10 bg-[#2c2c2e] text-slate-200'
              : 'border-slate-200 bg-white text-slate-600'
          }`}
        >
          <option value="all">全部章节 ({safeToc.length})</option>
          {safeToc.map((ch) => (
            <option key={ch.id} value={ch.index}>
              {ch.title}
            </option>
          ))}
        </select>
      </div>

      {notesViewMode === 'list' ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredHighlights.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              暂无划线记录，在阅读器中划选任意文字即可添加5色高亮与想法
            </div>
          ) : (
            filteredHighlights.map((hl) => (
              <div
                key={hl.id}
                onClick={() => {
                  onSelectChapter(hl.chapter_index, hl.paragraph_index)
                  onCloseIfOverlay()
                }}
                className={`p-4 rounded-2xl border hover:border-[#1b88ee]/60 cursor-pointer space-y-2 shadow-2xs transition-colors ${
                  isDark
                    ? 'bg-[#1c1c1e] border-white/8'
                    : 'bg-white border-slate-200/80'
                }`}
                style={{
                  borderLeftWidth: '4px',
                  borderLeftColor: COLOR_HEX[hl.color] || '#f59e0b',
                }}
              >
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span
                    className={`font-medium ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {hl.chapter_title}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteHighlight(hl.id)
                    }}
                    className="p-1 text-slate-400 hover:text-rose-500"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p
                  className={`text-xs sm:text-sm font-serif leading-relaxed ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  “{hl.selected_text}”
                </p>
                {hl.note && (
                  <div
                    className={`p-2.5 rounded-xl text-xs ${
                      isDark
                        ? 'bg-amber-500/10 border border-amber-500/20 text-amber-200'
                        : 'bg-amber-50/70 border border-amber-200/70 text-slate-700'
                    }`}
                  >
                    <span className="font-semibold text-amber-600 dark:text-amber-300">
                      💡 想法：
                    </span>
                    {hl.note}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <MindmapView
          bookTitle={book.title}
          layout={mindmapLayout}
          zoom={mindmapZoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          onSelectChapter={onSelectChapter}
          onCloseIfOverlay={onCloseIfOverlay}
          isDark={isDark}
        />
      )}
    </div>
  )
}
