import React, { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import type { BookSummary, ReadingLibrary } from '../types'
import { CATEGORY_PRESETS } from '../constants'
import { parseTagsInput } from '../helpers'

interface OrganizeBookModalProps {
  book: BookSummary
  libraries: ReadingLibrary[]
  onClose: () => void
  onSave: (bookId: string, payload: { library_id: string; category: string; tags: string[] }) => Promise<void>
  onDelete: (e: React.MouseEvent, bookId: string, title: string) => void
}

export const OrganizeBookModal: React.FC<OrganizeBookModalProps> = ({
  book,
  libraries,
  onClose,
  onSave,
  onDelete,
}) => {
  const [libraryId, setLibraryId] = useState(book.library_id || 'lib-default')
  const [category, setCategory] = useState(book.category || '未分类')
  const [tagsText, setTagsText] = useState((book.tags || []).join(', '))
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const parsedTags = parseTagsInput(tagsText)
      await onSave(book.id, {
        library_id: libraryId,
        category: category.trim() || '未分类',
        tags: parsedTags,
      })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 truncate pr-2">
            管理《{book.title}》
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Library Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              所属阅读书库
            </label>
            <select
              value={libraryId}
              onChange={(e) => setLibraryId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1b88ee]/20 focus:border-[#1b88ee]"
            >
              {libraries.map((lib) => (
                <option key={lib.id} value={lib.id}>
                  {lib.icon || '📚'} {lib.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Select & Preset Pills */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              分类主题
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="输入或选择分类..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1b88ee]/20 focus:border-[#1b88ee] mb-2"
            />
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_PRESETS.slice(0, 6).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCategory(preset)}
                  className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              自定义标签（英文逗号隔开）
            </label>
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="例如: 科幻, 经典, 必读"
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1b88ee]/20 focus:border-[#1b88ee]"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={(e) => {
                onDelete(e, book.id, book.title)
                onClose()
              }}
              className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>从书架移除</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-xs font-medium text-white bg-[#1b88ee] hover:bg-[#1677d2] rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {submitting ? '保存中...' : '保存更改'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
