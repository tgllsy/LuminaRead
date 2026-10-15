import { useState, useCallback, useEffect, useRef } from 'react'
import type { NotesHubOverviewResponse } from '../types'
import { notesApi } from '../api'

export function useNotesHub() {
  const [hubData, setHubData] = useState<NotesHubOverviewResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [bookTocMap, setBookTocMap] = useState<
    Record<string, Array<{ id?: string; index: number; title: string; word_count?: number }>>
  >({})
  const inFlightTocRef = useRef<Set<string>>(new Set())

  const fetchHubData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await notesApi.fetchNotesHub()
      setHubData(data)
    } catch {
      // offline / ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHubData()
  }, [fetchHubData])

  const loadTocForBook = useCallback(async (bookId: string) => {
    if (!bookId) return
    if (inFlightTocRef.current.has(bookId)) return
    inFlightTocRef.current.add(bookId)
    try {
      const toc = await notesApi.fetchBookToc(bookId)
      setBookTocMap((curr) => ({ ...curr, [bookId]: toc }))
    } catch {
      // offline / ignore
    } finally {
      inFlightTocRef.current.delete(bookId)
    }
  }, [])

  return {
    hubData,
    loading,
    bookTocMap,
    fetchHubData,
    loadTocForBook,
  }
}
