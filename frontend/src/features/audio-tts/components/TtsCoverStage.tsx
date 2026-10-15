import React from 'react'
import { Play, LocateFixed } from 'lucide-react'
import type { TtsCheckpoint } from '../types'

interface TtsCoverStageProps {
  bookTitle: string
  bookAuthor?: string
  chapterTitle?: string
  coverUrl?: string
  coverColor?: string
  currentSpokenText: string
  savedCheckpoint: TtsCheckpoint | null
  bookId?: string
  chapterIndex: number
  activeParagraphIndex: number | null
  ttsPlaying: boolean
  ttsPaused: boolean
  mutedTextCls: string
  accentBadgeCls: string
  onToggleParagraphDrawer: () => void
  onResumeCheckpoint: (cp: TtsCheckpoint) => void
  onLocateOriginalText: () => void
}

export const TtsCoverStage: React.FC<TtsCoverStageProps> = ({
  bookTitle,
  bookAuthor = '阅境伴读',
  chapterTitle = '',
  coverUrl = '',
  coverColor = '#2b593f',
  currentSpokenText,
  savedCheckpoint,
  bookId = '',
  chapterIndex,
  activeParagraphIndex,
  ttsPlaying,
  ttsPaused,
  mutedTextCls,
  accentBadgeCls,
  onToggleParagraphDrawer,
  onResumeCheckpoint,
  onLocateOriginalText,
}) => {
  const showResumeCheckpoint =
    savedCheckpoint &&
    savedCheckpoint.bookId === bookId &&
    !(
      (ttsPlaying || ttsPaused) &&
      chapterIndex === savedCheckpoint.chapterIndex &&
      activeParagraphIndex === savedCheckpoint.paragraphIndex
    )

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-7 py-2 space-y-5 overflow-hidden">
      <div
        style={{ backgroundColor: coverColor || '#2b593f' }}
        className="w-36 h-50 sm:w-40 sm:h-56 rounded-lg shadow-[0_18px_38px_rgba(15,23,42,0.18)] relative overflow-hidden flex flex-col justify-between p-4 text-white shrink-0"
      >
        {coverUrl && (
          <img
            src={coverUrl}
            alt={bookTitle}
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
            className="absolute inset-0 w-full h-full object-cover z-10"
          />
        )}
        <div className="absolute inset-y-0 left-0 w-2.5 bg-black/15 z-20" />
        <div className="text-[9px] font-mono tracking-widest opacity-75">
          LUMINAREAD
        </div>
        <div className="font-serif font-bold text-sm sm:text-base leading-snug line-clamp-3">
          {bookTitle}
        </div>
        <div className="text-[11px] opacity-80 truncate">{bookAuthor}</div>
      </div>

      <div className="w-full text-center space-y-2.5 max-w-sm">
        <h2 className="text-base sm:text-lg font-bold line-clamp-1 px-2">
          {chapterTitle || bookTitle}
        </h2>

        <button
          type="button"
          onClick={onLocateOriginalText}
          title="点击返回正文并定位到当前朗读位置"
          className={`group w-full text-xs sm:text-[13px] font-serif leading-relaxed px-3.5 py-2.5 rounded-2xl min-h-[3.2rem] hover:bg-current/8 active:scale-[0.99] transition-all cursor-pointer border border-current/10 flex flex-col items-center justify-center gap-1.5 ${mutedTextCls}`}
        >
          <span className="line-clamp-2 italic">“{currentSpokenText}”</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-[#1b88ee] opacity-90 group-hover:opacity-100 group-hover:underline">
            <LocateFixed className="w-3 h-3" />
            定位到正文当前播放
          </span>
        </button>

        {showResumeCheckpoint && (
          <button
            type="button"
            onClick={() => onResumeCheckpoint(savedCheckpoint)}
            className={`mx-auto px-3.5 py-1.5 rounded-full text-[11px] font-medium border flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] ${accentBadgeCls}`}
            title="从上次记录的听书节点继续播放"
          >
            <Play className="w-3 h-3 fill-current shrink-0" />
            <span className="truncate max-w-[235px]">
              上次听至：
              {savedCheckpoint.chapterTitle ||
                `第 ${savedCheckpoint.chapterIndex + 1} 章`}{' '}
              · 第 {savedCheckpoint.paragraphIndex + 1} 段 · 续听
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
