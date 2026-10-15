import { useState, useCallback } from 'react'
import type { CreateNotePayload, HighlightItem } from '../types'
import { notesApi } from '../api'
import { invalidateBookCache } from '../../../utils/bookCache'

export function useHighlightMutations(refreshHub: () => void, onBooksChanged: () => void) {
  const [submitting, setSubmitting] = useState(false)

  const createNote = useCallback(
    async (payload: CreateNotePayload) => {
      setSubmitting(true)
      try {
        await notesApi.createNoteHighlight(payload)
        invalidateBookCache(payload.bookId)
        refreshHub()
        onBooksChanged()
      } finally {
        setSubmitting(false)
      }
    },
    [refreshHub, onBooksChanged]
  )

  const editHighlight = useCallback(
    async (hlId: string, bookId: string, patch: {
      note?: string
      selected_text?: string
      color?: HighlightItem['color']
      style_type?: HighlightItem['style_type']
    }) => {
      await notesApi.updateHighlight(hlId, patch)
      invalidateBookCache(bookId)
      refreshHub()
      onBooksChanged()
    },
    [refreshHub, onBooksChanged]
  )

  const deleteHighlight = useCallback(
    async (hlId: string, bookId: string) => {
      await notesApi.deleteHighlight(hlId)
      invalidateBookCache(bookId)
      refreshHub()
      onBooksChanged()
    },
    [refreshHub, onBooksChanged]
  )

  const deleteBookmark = useCallback(
    async (bmId: string, bookId: string) => {
      await notesApi.deleteBookmark(bmId)
      invalidateBookCache(bookId)
      refreshHub()
    },
    [refreshHub]
  )

  return { submitting, createNote, editHighlight, deleteHighlight, deleteBookmark }
}
