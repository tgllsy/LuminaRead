import React from 'react'
import type { HighlightItem, BookmarkItem, AIConversationItem, NotesFilterState } from './types'

export function renderInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-bold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <span key={idx} className="text-[#1b88ee] font-medium">
          {part.slice(1, -1)}
        </span>
      )
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>
  })
}

export function renderStructuredMarkdown(rawContent: string): React.ReactNode {
  const lines = (rawContent || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false
      if (/^\*?\*?[（(]说明[:：]本次未实际附带选段正文.*[)）]\*?\*?$/.test(l)) return false
      if (/^需要的话，我可以.*存进知识库笔记/.test(l)) return false
      return true
    })

  return (
    <div className="space-y-2">
      {lines.map((line, idx) => {
        if (/^#{1,4}\s+/.test(line)) {
          const headingText = line.replace(/^#{1,4}\s+/, '').replace(/\*\*/g, '')
          return (
            <div key={idx} className="text-xs sm:text-[13px] font-bold text-[#1b88ee] pt-1">
              {headingText}
            </div>
          )
        }

        if (line.startsWith('>')) {
          const quoteText = line.replace(/^>\s*/, '')
          if (!quoteText) return null
          return (
            <blockquote
              key={idx}
              className="pl-3 py-1.5 border-l-2 border-[#1b88ee] rounded-r-xl bg-[#f7f9fc] text-slate-600 text-xs leading-relaxed"
            >
              {renderInlineFormatting(quoteText)}
            </blockquote>
          )
        }

        const listMatch = line.match(/^(?:[-*•]|\d+\.)\s+(.+)$/)
        if (listMatch) {
          const body = listMatch[1]
          const kvMatch = body.match(/^\*\*([^*]+)\*\*\s*[:：]\s*(.+)$/)
          if (kvMatch) {
            return (
              <div
                key={idx}
                className="p-2.5 sm:p-3 rounded-xl bg-[#f8fafc] border border-slate-100 text-slate-700"
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1b88ee] shrink-0" />
                  <span className="text-xs font-bold text-slate-900">{kvMatch[1]}</span>
                </div>
                <p className="text-xs sm:text-[13px] leading-relaxed pl-3 text-slate-600">
                  {renderInlineFormatting(kvMatch[2])}
                </p>
              </div>
            )
          }

          return (
            <div key={idx} className="flex items-start gap-2 text-xs sm:text-[13px] leading-relaxed text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1b88ee] mt-2 shrink-0" />
              <div className="flex-1">{renderInlineFormatting(body)}</div>
            </div>
          )
        }

        return (
          <p key={idx} className="text-xs sm:text-[13px] leading-relaxed text-slate-700">
            {renderInlineFormatting(line)}
          </p>
        )
      })}
    </div>
  )
}

export function filterHighlights(
  items: HighlightItem[],
  filters: NotesFilterState
): HighlightItem[] {
  const { selectedBookId, searchQuery, colorFilter, styleFilter, activeSubTab } = filters
  const q = searchQuery.trim().toLowerCase()

  return items.filter((item) => {
    if (selectedBookId !== 'all' && item.book_id !== selectedBookId) return false
    if (colorFilter !== 'all' && item.color !== colorFilter) return false
    if (styleFilter !== 'all' && item.style_type !== styleFilter) return false
    if (activeSubTab === 'notes' && !item.note?.trim()) return false
    if (activeSubTab === 'highlights' && item.note?.trim()) return false

    if (q) {
      const matchQuote = item.selected_text.toLowerCase().includes(q)
      const matchNote = (item.note || '').toLowerCase().includes(q)
      const matchBook = (item.book_title || '').toLowerCase().includes(q)
      const matchChapter = (item.chapter_title || '').toLowerCase().includes(q)
      return matchQuote || matchNote || matchBook || matchChapter
    }
    return true
  })
}

export function filterAiConversations(
  items: AIConversationItem[],
  filters: NotesFilterState
): AIConversationItem[] {
  const { selectedBookId, searchQuery, aiModeFilter } = filters
  const q = searchQuery.trim().toLowerCase()

  return items.filter((item) => {
    if (selectedBookId !== 'all' && item.book_id !== selectedBookId) return false
    if (aiModeFilter !== 'all' && item.mode !== aiModeFilter) return false

    if (q) {
      const matchQ = item.question.toLowerCase().includes(q)
      const matchA = (item.answer_content || '').toLowerCase().includes(q)
      const matchBook = (item.book_title || '').toLowerCase().includes(q)
      return matchQ || matchA || matchBook
    }
    return true
  })
}

export function filterBookmarks(
  items: BookmarkItem[],
  filters: NotesFilterState
): BookmarkItem[] {
  const { selectedBookId, searchQuery } = filters
  const q = searchQuery.trim().toLowerCase()

  return items.filter((item) => {
    if (selectedBookId !== 'all' && item.book_id !== selectedBookId) return false
    if (q) {
      const matchBook = (item.book_title || '').toLowerCase().includes(q)
      const matchChapter = (item.chapter_title || '').toLowerCase().includes(q)
      return matchBook || matchChapter
    }
    return true
  })
}
