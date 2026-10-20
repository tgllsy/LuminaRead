import React from 'react'
import { Play, Headphones, Sparkles } from 'lucide-react'
import type { BookSummary, JumpTarget } from '../types'
import { useTtsStore } from '../../../stores/ttsStore'

interface BookshelfHeroCardProps {
  books: BookSummary[]
  onOpenBook: (target: JumpTarget) => void
  onOpenTts?: (bookId: string) => void
  onOpenNotesHub?: () => void
}

export const BookshelfHeroCard: React.FC<BookshelfHeroCardProps> = ({
  books,
  onOpenBook,
  onOpenTts,
  onOpenNotesHub,
}) => {
  const triggerResumeTts = useTtsStore((s) => s.triggerResumeTts)
  const triggerOpenTtsModal = useTtsStore((s) => s.triggerOpenTtsModal)

  // 优先选取最近阅读过的书籍（按阅读时间/更新时间倒序），其次回退至书架第一本书
  const heroBook = React.useMemo(() => {
    if (!books || books.length === 0) return null

    const readCandidates = books
      .filter((b) => Boolean(b.last_read_at || (b.progress?.percentage ?? 0) > 0))
      .sort((a, b) => {
        const timeA = a.last_read_at || a.progress?.updated_at || ''
        const timeB = b.last_read_at || b.progress?.updated_at || ''
        return timeB.localeCompare(timeA)
      })

    const activeRecent = readCandidates.find((b) => b.status !== 'finished')
    if (activeRecent) return activeRecent

    if (readCandidates.length > 0) return readCandidates[0]
    return books[0]
  }, [books])

  if (!heroBook) return null

  const pct = Math.round(heroBook.progress?.percentage || 0)
  const chapterIdx = heroBook.progress?.chapter_index ?? 0
  const chapterTitle = chapterIdx > 0 ? `第 ${chapterIdx + 1} 章` : '前言 / 开始章节'

  const handleContinueReading = () => {
    onOpenBook({
      bookId: heroBook.id,
      chapterIndex: heroBook.progress?.chapter_index,
      paragraphIndex: typeof heroBook.progress?.scroll_offset === 'number'
        ? Math.floor(heroBook.progress.scroll_offset)
        : undefined,
    })
  }

  const handleContinueListening = () => {
    if (onOpenTts) {
      onOpenTts(heroBook.id)
      return
    }
    onOpenBook({
      bookId: heroBook.id,
      chapterIndex: heroBook.progress?.chapter_index,
      paragraphIndex: typeof heroBook.progress?.scroll_offset === 'number'
        ? Math.floor(heroBook.progress.scroll_offset)
        : undefined,
    })
    triggerOpenTtsModal()
    triggerResumeTts(heroBook.id)
  }

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-7 shadow-lg sm:shadow-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 sm:gap-6 relative overflow-hidden border border-slate-700/50 mb-3 sm:mb-6 select-none">
      <div className="relative z-10 flex items-center gap-3.5 md:block md:space-y-3 max-w-xl min-w-0">
        {/* 移动端紧凑左侧封面缩略图 */}
        <div
          onClick={handleContinueReading}
          className="md:hidden relative w-16 h-22 rounded-xl overflow-hidden shadow-md border border-white/20 p-1.5 flex flex-col justify-between shrink-0 cursor-pointer active:scale-95 transition-transform"
          style={{ backgroundColor: heroBook.cover_color || '#1e3a8a' }}
        >
          {heroBook.cover_url ? (
            <img
              src={heroBook.cover_url}
              alt={heroBook.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <>
              <div className="relative z-10 text-[8px] text-white/80 font-mono uppercase">
                {heroBook.format}
              </div>
              <div className="relative z-10 font-serif font-bold text-[10px] text-white line-clamp-2 leading-tight">
                {heroBook.title}
              </div>
            </>
          )}
        </div>

        {/* 书籍进度与操作区 */}
        <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold tracking-wider flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              继续阅读
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400 truncate">
              {pct > 0 ? `已读 ${pct}%` : '尚未开卷'} · {chapterTitle}
            </span>
          </div>

          <h2
            onClick={handleContinueReading}
            className="text-base sm:text-2xl font-bold font-serif leading-snug text-white tracking-wide truncate cursor-pointer"
          >
            {heroBook.title}
          </h2>

          <p className="hidden sm:block text-xs text-slate-300 leading-relaxed line-clamp-1">
            上次读至：{chapterTitle} {heroBook.author ? `· ${heroBook.author} 著` : ''}
          </p>

          <div className="pt-1 sm:pt-2 flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleContinueReading}
              className="px-3.5 sm:px-6 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-[#1b88ee] to-sky-500 hover:from-[#1575ce] hover:to-sky-600 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center gap-1.5 active:scale-[0.97] transition-all cursor-pointer shrink-0"
            >
              <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
              <span>继续阅读</span>
            </button>

            <button
              type="button"
              onClick={handleContinueListening}
              className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 border border-white/15 active:scale-[0.97] transition-all cursor-pointer shrink-0"
            >
              <Headphones className="w-3.5 h-3.5 text-emerald-400" />
              <span>听书</span>
            </button>

            {onOpenNotesHub && (
              <button
                type="button"
                onClick={onOpenNotesHub}
                title="笔记与回顾"
                className="px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 active:scale-[0.97] transition-all cursor-pointer shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">笔记与回顾</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 桌面端右侧封面 */}
      <div
        onClick={handleContinueReading}
        className="hidden md:flex relative z-10 w-28 h-40 sm:w-32 sm:h-44 rounded-2xl overflow-hidden shadow-2xl border border-white/20 p-3 flex-col justify-between shrink-0 cursor-pointer hover:scale-[1.02] transition-transform"
        style={{ backgroundColor: heroBook.cover_color || '#1e3a8a' }}
      >
        {heroBook.cover_url ? (
          <img
            src={heroBook.cover_url}
            alt={heroBook.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <>
            <div className="relative z-10 text-[9px] text-white/80 font-mono uppercase tracking-wider">
              {heroBook.format}
            </div>
            <div className="relative z-10">
              <div className="font-serif font-bold text-xs sm:text-sm text-white line-clamp-2 leading-tight">
                {heroBook.title}
              </div>
              <div className="text-[10px] text-white/70 truncate mt-0.5">{heroBook.author}</div>
            </div>
          </>
        )}
      </div>

      {/* Ambient Glow */}
      <div className="absolute -right-12 -bottom-12 w-72 h-72 bg-[#1b88ee]/15 rounded-full blur-3xl pointer-events-none" />
    </div>
  )
}

