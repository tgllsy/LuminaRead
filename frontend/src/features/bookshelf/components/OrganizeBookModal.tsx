import React, { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { BookSummary, ReadingLibrary } from '../types'
import { CATEGORY_PRESETS } from '../constants'
import { parseTagsInput } from '../helpers'
import { BottomSheet } from '../../../shared/ui'

interface OrganizeBookModalProps {
  book: BookSummary
  libraries: ReadingLibrary[]
  onClose: () => void
  onSave: (bookId: string, payload: { library_id: string; category: string; tags: string[] }) => Promise<void>
  onDelete: (e: React.MouseEvent, bookId: string, title: string) => void
}

const CategoryFieldSection: React.FC<{
  category: string
  onChange: (value: string) => void
}> = ({ category, onChange }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-700 mb-1.5">分类主题</label>
    <input
      type="text" value={category} onChange={(e) => onChange(e.target.value)}
      placeholder="输入或选择分类..."
      className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1b88ee]/20 focus:border-[#1b88ee] mb-2"
    />
    <div className="flex flex-wrap gap-1.5">
      {CATEGORY_PRESETS.slice(0, 6).map((preset) => (
        <button
          key={preset} type="button" onClick={() => onChange(preset)}
          className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer active:scale-[0.97]"
        >
          {preset}
        </button>
      ))}
    </div>
  </div>
)

export const OrganizeBookModal: React.FC<OrganizeBookModalProps> = ({
  book, libraries, onClose, onSave, onDelete,
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
      await onSave(book.id, {
        library_id: libraryId,
        category: category.trim() || '未分类',
        tags: parseTagsInput(tagsText),
      })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <BottomSheet isOpen={true} onClose={onClose} title={`管理《${book.title}》`} maxWidthClass="md:max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 pb-2 select-none">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">所属阅读书库</label>
          <select
            value={libraryId} onChange={(e) => setLibraryId(e.target.value)}
            className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1b88ee]/20 focus:border-[#1b88ee]"
          >
            {libraries.map((lib) => (
              <option key={lib.id} value={lib.id}>{lib.icon || '📚'} {lib.name}</option>
            ))}
          </select>
        </div>

        <CategoryFieldSection category={category} onChange={setCategory} />

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">自定义标签（英文逗号隔开）</label>
          <input
            type="text" value={tagsText} onChange={(e) => setTagsText(e.target.value)}
            placeholder="例如: 科幻, 经典, 必读"
            className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1b88ee]/20 focus:border-[#1b88ee]"
          />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            type="button" onClick={(e) => { onDelete(e, book.id, book.title); onClose() }}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 font-semibold cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>从书架移除</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer active:scale-[0.97]"
            >
              取消
            </button>
            <button
              type="submit" disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1b88ee] hover:bg-[#1677d2] rounded-xl shadow-xs transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer active:scale-[0.97]"
            >
              {submitting ? '保存中...' : '保存更改'}
            </button>
          </div>
        </div>
      </form>
    </BottomSheet>
  )
}
