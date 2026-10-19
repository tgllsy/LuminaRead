import React from 'react'
import type { HighlightItem } from '../types'
import type { SelectionAnchorRect } from '../../reader-controls/types'
import { BilingualMarkdownRenderer } from './BilingualMarkdownRenderer'

interface ParagraphNoteCalloutsProps {
  notesWithContent: HighlightItem[]
  pIdx: number
  bilingualText?: string
  onSelectHighlightForNote: (hl: HighlightItem, pIdx: number, anchorRect?: SelectionAnchorRect | null) => void
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
            const r = e.currentTarget.getBoundingClientRect()
            onSelectHighlightForNote(hlNote, pIdx, {
              top: r.top, left: r.left, bottom: r.bottom, width: r.width,
            })
          }}
          className="reader-ui-badge mt-2 ml-4 sm:ml-8 p-2.5 rounded-xl bg-amber-500/12 border-l-4 border-amber-500 text-xs cursor-pointer hover:bg-amber-500/20 transition-all"
        >
          <span className="font-bold">💡 想法批注：</span>
          {hlNote.note}
        </div>
      ))}

      {bilingualText && <BilingualMarkdownRenderer bilingualText={bilingualText} />}
    </>
  )
}
