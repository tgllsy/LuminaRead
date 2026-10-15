import { useState, useCallback } from 'react'
import type { AskAiPayload, AIConversationItem } from '../types'
import { notesApi } from '../api'
import { invalidateBookCache } from '../../../utils/bookCache'

export function useAiMutations(refreshHub: () => void, onBooksChanged: () => void) {
  const [askingAi, setAskingAi] = useState(false)

  const askAi = useCallback(
    async (payload: AskAiPayload) => {
      setAskingAi(true)
      try {
        const conv = await notesApi.askAi(payload)
        refreshHub()
        return conv
      } finally {
        setAskingAi(false)
      }
    },
    [refreshHub]
  )

  const convertAiToNote = useCallback(
    async (conv: AIConversationItem) => {
      const hl = await notesApi.createNoteHighlight({
        bookId: conv.book_id,
        chapterIndex: conv.chapter_index,
        chapterTitle: conv.chapter_title || `第 ${conv.chapter_index + 1} 章`,
        quote: conv.selected_text || `问：${conv.question}`,
        note: `【AI伴读 · ${conv.question}】\n\n${conv.answer_content}`,
        color: 'blue',
        style: 'marker',
      })
      await notesApi.updateAiConversation(conv.id, { saved_highlight_id: hl.id })
      invalidateBookCache(conv.book_id)
      refreshHub()
      onBooksChanged()
    },
    [refreshHub, onBooksChanged]
  )

  const togglePinAi = useCallback(
    async (conv: AIConversationItem) => {
      await notesApi.updateAiConversation(conv.id, { is_pinned: !conv.is_pinned })
      refreshHub()
    },
    [refreshHub]
  )

  const deleteAi = useCallback(
    async (convId: string) => {
      await notesApi.deleteAiConversation(convId)
      refreshHub()
    },
    [refreshHub]
  )

  return { askingAi, askAi, convertAiToNote, togglePinAi, deleteAi }
}
