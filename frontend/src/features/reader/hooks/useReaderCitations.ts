import { useCallback } from 'react'
import type { BookChapter, ReturnAnchorState, FootnoteModalState } from '../types'
import { findCitationDefinition, findCitationReferenceParagraph } from '../helpers'

interface UseReaderCitationsOptions {
  paragraphs: string[]
  chapters: BookChapter[]
  chapterIndex: number
  currentChapterTitle: string
  bibChapterIndex: number
  returnAnchor: ReturnAnchorState | null
  setReturnAnchor: (anchor: ReturnAnchorState | null) => void
  setFootnoteModal: (modal: FootnoteModalState | null) => void
  onSelectChapter: (nextIdx: number, targetParaIdx?: number) => void
}

export function useReaderCitations({
  paragraphs,
  chapters,
  chapterIndex,
  currentChapterTitle,
  bibChapterIndex,
  returnAnchor,
  setReturnAnchor,
  setFootnoteModal,
  onSelectChapter,
}: UseReaderCitationsOptions) {
  const handleOpenCitationMarker = useCallback(
    (rawMarker: string, sourceParaIdx: number, sourceChapterIdx?: number) => {
      const effectiveChIdx = sourceChapterIdx !== undefined ? sourceChapterIdx : chapterIndex
      const effectiveParas =
        effectiveChIdx === chapterIndex
          ? paragraphs
          : String(chapters[effectiveChIdx]?.content || '')
              .split(/\n{2,}|\n/)
              .map((p) => p.trim())
              .filter(Boolean)
      const effectiveChTitle = chapters[effectiveChIdx]?.title || currentChapterTitle

      const modal = findCitationDefinition(
        effectiveParas,
        chapters,
        effectiveChIdx,
        rawMarker,
        sourceParaIdx,
        bibChapterIndex,
        effectiveChTitle
      )
      setFootnoteModal(modal)
    },
    [paragraphs, chapters, chapterIndex, bibChapterIndex, currentChapterTitle, setFootnoteModal]
  )

  const handleJumpBackFromFootnoteDef = useCallback(
    (key: string) => {
      if (returnAnchor) {
        const target = returnAnchor
        setReturnAnchor(null)
        onSelectChapter(target.chapterIndex, target.paragraphIndex)
        return
      }
      const refPara = findCitationReferenceParagraph(paragraphs, key)
      if (refPara >= 0) {
        onSelectChapter(chapterIndex, refPara)
      }
    },
    [returnAnchor, paragraphs, chapterIndex, setReturnAnchor, onSelectChapter]
  )

  return { handleOpenCitationMarker, handleJumpBackFromFootnoteDef }
}
