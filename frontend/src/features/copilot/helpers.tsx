import React from 'react'

/**
 * Render inline **bold** and *italic* segments cleanly without raw asterisks
 */
export function renderInlineFormatting(
  text: string,
  isDark: boolean
): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong
          key={idx}
          className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
        >
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <span
          key={idx}
          className={`${isDark ? 'text-blue-300' : 'text-[#1b88ee]'} font-medium`}
        >
          {part.slice(1, -1)}
        </span>
      )
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>
  })
}

/**
 * Filter out legacy disclaimers or prompt suffixes from raw response
 */
export function cleanCopilotMarkdownLines(rawContent: string): string[] {
  return (rawContent || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false
      if (/^\*?\*?[（(]说明[:：]本次未实际附带选段正文.*[)）]\*?\*?$/.test(l)) {
        return false
      }
      if (/^需要的话，我可以.*存进知识库笔记/.test(l)) {
        return false
      }
      return true
    })
}

/**
 * Render a single line in WeChat Read structured cards & lists
 */
function renderListItem(body: string, idx: number, isDark: boolean): React.ReactNode {
  const kvMatch = body.match(/^\*\*([^*]+)\*\*\s*[:：]\s*(.+)$/)
  if (kvMatch) {
    return (
      <div
        key={idx}
        className={`p-3 rounded-xl border transition-colors ${
          isDark
            ? 'bg-[#25262b] border-white/8 text-slate-200'
            : 'bg-white border-slate-100 shadow-[0_1px_4px_rgba(15,23,42,0.03)] text-slate-700'
        }`}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1b88ee] shrink-0" />
          <span className={`text-xs font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {kvMatch[1]}
          </span>
        </div>
        <p className={`text-xs sm:text-[13px] leading-relaxed pl-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          {renderInlineFormatting(kvMatch[2], isDark)}
        </p>
      </div>
    )
  }

  return (
    <div key={idx} className="flex items-start gap-2 text-xs sm:text-[13px] leading-relaxed">
      <span className="w-1.5 h-1.5 rounded-full bg-[#1b88ee] mt-2 shrink-0" />
      <div className="flex-1">{renderInlineFormatting(body, isDark)}</div>
    </div>
  )
}

function renderMarkdownLine(line: string, idx: number, isDark: boolean): React.ReactNode {
  if (/^#{1,4}\s+/.test(line)) {
    const headingText = line.replace(/^#{1,4}\s+/, '').replace(/\*\*/g, '')
    return (
      <div key={idx} className={`text-xs sm:text-[13px] font-bold pt-1 ${isDark ? 'text-blue-300' : 'text-[#1b88ee]'}`}>
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
        className={`pl-3 py-1.5 border-l-2 border-[#1b88ee] rounded-r-xl text-xs leading-relaxed ${
          isDark ? 'bg-white/[0.03] text-slate-300' : 'bg-[#f7f9fc] text-slate-600'
        }`}
      >
        {renderInlineFormatting(quoteText, isDark)}
      </blockquote>
    )
  }

  const listMatch = line.match(/^(?:[-*•]|\d+\.)\s+(.+)$/)
  if (listMatch) {
    return renderListItem(listMatch[1], idx, isDark)
  }

  return (
    <p key={idx} className={`text-xs sm:text-[13px] leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
      {renderInlineFormatting(line, isDark)}
    </p>
  )
}

/**
 * Parse AI Copilot Markdown response into structured WeChat Read cards & lists
 */
export function renderFormattedMarkdown(
  rawContent: string,
  isDark: boolean
): React.ReactNode {
  const lines = cleanCopilotMarkdownLines(rawContent)
  return (
    <div className="space-y-2.5">
      {lines.map((line, idx) => renderMarkdownLine(line, idx, isDark))}
    </div>
  )
}

/**
 * Clean markdown for plain text saving to note
 */
export function cleanNoteContent(content: string): string {
  return content.replace(/#+/g, '').replace(/\*\*/g, '').trim()
}

/**
 * Calculate short display name for star map character nodes
 */
export function formatCharacterShortName(name: string): string {
  const baseParts = (name || '')
    .split(/[（(]/)[0]
    .trim()
    .split('·')
  const rawShort =
    baseParts[0].length <= 2 && baseParts[1]
      ? `${baseParts[0]}·${baseParts[1]}`
      : baseParts[0]
  return rawShort.length > 6 ? `${rawShort.slice(0, 5)}…` : rawShort
}

/**
 * Build effective anchor text fallback for reader context
 */
export function buildEffectiveAnchorText(
  selectedText?: string,
  chapterExcerpt?: string,
  bookTitle?: string,
  chapterTitle?: string
): string {
  return (
    selectedText?.trim() ||
    chapterExcerpt?.trim() ||
    `《${bookTitle || '未知书籍'}》· ${chapterTitle || '当前章节'}`
  )
}
