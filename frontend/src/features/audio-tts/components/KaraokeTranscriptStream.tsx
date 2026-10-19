import React, { useEffect, useRef } from 'react'
import { Headphones } from 'lucide-react'
import { KaraokeParagraphContent } from './KaraokeParagraphContent'

interface KaraokeTranscriptStreamProps {
  paragraphs: string[]
  currentParagraphIndex: number
  chapterTitle?: string
  onSelectParagraph: (idx: number) => void
}

export const KaraokeTranscriptStream: React.FC<KaraokeTranscriptStreamProps> = ({
  paragraphs,
  currentParagraphIndex,
  chapterTitle,
  onSelectParagraph,
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
    <div
      data-tts-scroll="true"
      className="dark flex-1 p-4 sm:p-6 lg:p-10 overflow-y-auto space-y-4 sm:space-y-6 font-serif text-slate-300 text-[15px] sm:text-base leading-relaxed relative select-none"
    >
      <div className="text-[11px] sm:text-xs font-sans text-slate-400 border-b border-white/10 pb-2.5 flex items-center justify-between gap-2 min-w-0">
        <span className="truncate min-w-0 flex-1">{chapterTitle || '当前章节'} · 点按段落插播</span>
        <span className="text-sky-400 flex items-center gap-1 shrink-0 whitespace-nowrap">
          <Headphones className="w-3.5 h-3.5" />
          <span>KTV 实时伴读</span>
        </span>
      </div>

      <div className="space-y-4 pt-2">
        {displayParagraphs.map((paraText, idx) => {
          const isActive = idx === currentParagraphIndex
          const dist = Math.abs(idx - currentParagraphIndex)
          const opacityClass = isActive
            ? 'opacity-100'
            : dist === 1
            ? 'opacity-75 hover:opacity-95'
            : 'opacity-50 hover:opacity-85'

          if (isActive) {
            return (
              <div
                key={idx}
                ref={activeItemRef}
                className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-sky-500/15 via-blue-500/10 to-transparent border-l-4 border-sky-400 shadow-xl transition-all"
              >
                <div className="text-white text-base sm:text-lg font-bold leading-relaxed text-justify tracking-wide">
                  <KaraokeParagraphContent paraText={paraText} isActive={true} />
                </div>
              </div>
            )
          }

          return (
            <p
              key={idx}
              onClick={() => onSelectParagraph(idx)}
              className={`indent-8 text-justify transition-all cursor-pointer ${opacityClass}`}
            >
              <KaraokeParagraphContent paraText={paraText} isActive={false} />
            </p>
          )
        })}
      </div>
    </div>
  )
}
