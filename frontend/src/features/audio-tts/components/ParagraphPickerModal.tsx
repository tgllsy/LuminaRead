import React, { useEffect, useRef } from 'react'
import { isNonSpokenMarkerParagraph } from '../helpers'

interface ParagraphPickerModalProps {
  paragraphs: string[]
  currentParaIdx: number
  ttsPlaying: boolean
  onSelectParagraph: (idx: number) => void
  pillIdleCls: string
  accentActivePillCls: string
}

export const ParagraphPickerModal: React.FC<ParagraphPickerModalProps> = ({
  paragraphs,
  currentParaIdx,
  ttsPlaying,
  onSelectParagraph,
  pillIdleCls,
  accentActivePillCls,
}) => {
  const currentItemRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (currentItemRef.current) {
      currentItemRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentParaIdx])

  return (
    <div className="space-y-1.5 overflow-y-auto pr-0.5 pb-2">
      {paragraphs.map((pText, idx) => {
        if (isNonSpokenMarkerParagraph(pText)) return null
        const isCurrent = currentParaIdx === idx
        return (
          <button
            key={idx}
            ref={isCurrent ? currentItemRef : undefined}
            type="button"
            onClick={() => onSelectParagraph(idx)}
            className={`w-full p-3 rounded-2xl text-left transition-all flex items-start gap-2.5 ${
              isCurrent ? accentActivePillCls : pillIdleCls
            }`}
          >
            <span className="font-mono text-[11px] opacity-75 shrink-0 mt-0.5">
              #{String(idx + 1).padStart(2, '0')}
            </span>
            <span className="text-xs font-serif leading-relaxed line-clamp-2 flex-1">
              {pText}
            </span>
            {isCurrent && (
              <span className="px-2 py-0.5 rounded-full bg-black/15 text-[10px] font-mono shrink-0">
                {ttsPlaying ? '朗读中' : '当前'}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
