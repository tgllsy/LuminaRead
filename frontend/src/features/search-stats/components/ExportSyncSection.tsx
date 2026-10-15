import React from 'react'
import { FileDown, Send, CheckCircle2 } from 'lucide-react'
import type { BookSummary } from '../types'

interface ExportSyncSectionProps {
  books: BookSummary[]
  selectedBookId: string
  onSelectBookId: (id: string) => void
  onExportObsidian: () => void
  onSyncLifeOS: () => void
  lifeOsMessage?: string
  exportPreview?: string
}

export const ExportSyncSection: React.FC<ExportSyncSectionProps> = ({
  books,
  selectedBookId,
  onSelectBookId,
  onExportObsidian,
  onSyncLifeOS,
  lifeOsMessage,
  exportPreview,
}) => {
  return (
    <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            笔记导出与同步
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            导出结构化 Markdown 笔记，或同步划线数据至本地 LifeOS
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedBookId}
            onChange={(e) => onSelectBookId(e.target.value)}
            className="w-full sm:w-auto max-w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 truncate"
          >
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                《{b.title}》({b.highlights_count}条划线)
              </option>
            ))}
          </select>

          <button
            onClick={onExportObsidian}
            className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer transition-colors"
          >
            <FileDown className="w-3.5 h-3.5 shrink-0" />
            导出 Markdown (.md)
          </button>

          <button
            onClick={onSyncLifeOS}
            className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer transition-colors"
          >
            <Send className="w-3.5 h-3.5 shrink-0" />
            同步至 LifeOS
          </button>
        </div>
      </div>

      {lifeOsMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{lifeOsMessage}</span>
        </div>
      )}

      {exportPreview && (
        <div className="mt-2">
          <div className="text-[11px] font-mono text-slate-500 mb-1">
            Markdown 导出预览：
          </div>
          <pre className="p-3 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto max-h-44">
            {exportPreview}
          </pre>
        </div>
      )}
    </div>
  )
}
