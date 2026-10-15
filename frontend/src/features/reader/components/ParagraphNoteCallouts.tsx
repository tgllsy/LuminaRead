import React from 'react'
import type { HighlightItem } from '../types'

interface ParagraphNoteCalloutsProps {
  notesWithContent: HighlightItem[]
  pIdx: number
  bilingualText?: string
  onSelectHighlightForNote: (hl: HighlightItem, pIdx: number) => void
}

export const ParagraphNoteCallouts: React.FC<ParagraphNoteCalloutsProps> = ({
  notesWithContent,
  pIdx,
  bilingualText,
  onSelectHighlightForNote,
}) => {
  return (
    <>
      {notesWithContent.map((hlNote) => (
        <div
          key={hlNote.id}
          data-no-hud-toggle="true"
          onClick={(e) => {
            e.stopPropagation()
            onSelectHighlightForNote(hlNote, pIdx)
          }}
          className="reader-ui-badge mt-2 ml-4 sm:ml-8 p-2.5 rounded-xl bg-amber-500/12 border-l-4 border-amber-500 text-xs cursor-pointer hover:bg-amber-500/20 transition-all"
        >
          <span className="font-bold">💡 想法批注：</span>
          {hlNote.note}
        </div>
      ))}

      {bilingualText && (
        <div className="mt-2 ml-4 sm:ml-8 pl-3 border-l-2 border-blue-500/40 text-xs sm:text-sm leading-relaxed opacity-75">
          {bilingualText}
        </div>
      )}
    </>
  )
}
