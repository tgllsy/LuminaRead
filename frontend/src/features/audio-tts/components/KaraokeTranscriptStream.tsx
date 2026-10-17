import React, { useEffect, useRef } from 'react'
import { Sparkles, Bookmark } from 'lucide-react'

interface KaraokeTranscriptStreamProps {
  paragraphs: string[]
  currentParagraphIndex: number
  chapterTitle?: string
  onSelectParagraph: (idx: number) => void
  onExtractQuote?: (text: string) => void
}

export const KaraokeTranscriptStream: React.FC<KaraokeTranscriptStreamProps> = ({
  paragraphs,
  currentParagraphIndex,
  chapterTitle,
  onSelectParagraph,
  onExtractQuote,
}) => {
  const activeItemRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeItemRef.current) {
      activeItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentParagraphIndex])

  // Fallback demo paragraphs if empty
  const displayParagraphs =
    paragraphs.length > 0
      ? paragraphs
      : [
          '本书以我国地方政府投融资为主线，分上下两篇。微观机制包括地方政府的基本事务、收入、支出、土地融资和开发、投资和债务等。',
          '为应该怎么办，比了解“我”认为应该怎么办，重要得多。在复杂现实世界中，任何政策制度的设计都受制于既有约束条件与博弈各方的激励机制。',
          '复旦大学经济学院是研究中国经济的重镇，向来重视制度和历史分析，这些特点在思考中打下了深深烙印。',
          '本书虽为大众读者所写，但使用了大量前沿研究成果，参考文献数百篇。与各章节内容相匹配的文献清单可通过各章节末尾获取。',
        ]

  return (
    <div className="flex-1 p-6 lg:p-10 overflow-y-auto space-y-6 font-serif text-slate-400 text-base leading-relaxed relative select-none">
      <div className="text-xs font-sans text-slate-500 tracking-wider uppercase border-b border-white/10 pb-3 flex items-center justify-between">
        <span>{chapterTitle || '当前章节'} · 点击任意段落即可插播</span>
        <span className="text-amber-400 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>双击文字可沉淀金句</span>
        </span>
      </div>

      <div className="space-y-4 pt-2">
        {displayParagraphs.map((paraText, idx) => {
          const isActive = idx === currentParagraphIndex
          const dist = Math.abs(idx - currentParagraphIndex)
          const opacityClass = isActive
            ? 'opacity-100'
            : dist === 1
            ? 'opacity-60 hover:opacity-90'
            : 'opacity-35 hover:opacity-80'

          if (isActive) {
            return (
              <div
                key={idx}
                ref={activeItemRef}
                onDoubleClick={() => onExtractQuote?.(paraText)}
                className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-blue-500/10 to-transparent border-l-4 border-amber-400 shadow-xl space-y-2.5 relative transition-all"
              >
                <div className="flex items-center justify-between text-xs font-sans">
                  <span className="text-amber-300 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>正在朗读当前段落 (第 {idx + 1} 段)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => onExtractQuote?.(paraText)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] text-white flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Bookmark className="w-3 h-3 text-amber-300" />
                    <span>沉淀金句</span>
                  </button>
                </div>
                <p className="text-white text-base sm:text-lg font-bold leading-relaxed text-justify tracking-wide">
                  {paraText}
                </p>
              </div>
            )
          }

          return (
            <p
              key={idx}
              onClick={() => onSelectParagraph(idx)}
              onDoubleClick={() => onExtractQuote?.(paraText)}
              className={`indent-8 text-justify transition-all cursor-pointer ${opacityClass}`}
            >
              {paraText}
            </p>
          )
        })}
      </div>
    </div>
  )
}
