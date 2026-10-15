import { useState, useEffect, useCallback } from 'react'
import { searchStatsApi } from '../api'
import { DEFAULT_BOOK_ID } from '../constants'
import { downloadMarkdownFile } from '../helpers'
import type { BookSummary, StatsOverview } from '../types'

export interface UseReadingStatsOptions {
  isOpen: boolean
  asPage?: boolean
  books: BookSummary[]
}

export function useReadingStats({
  isOpen,
  asPage = false,
  books,
}: UseReadingStatsOptions) {
  const [stats, setStats] = useState<StatsOverview | null>(null)
  const [selectedBookId, setSelectedBookId] = useState<string>(
    books[0]?.id || DEFAULT_BOOK_ID
  )
  const [exportPreview, setExportPreview] = useState<string>('')
  const [lifeOsMessage, setLifeOsMessage] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const data = await searchStatsApi.getReadingStats()
      setStats(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen || asPage) {
      fetchStats()
    }
  }, [isOpen, asPage, fetchStats])

  useEffect(() => {
    if ((isOpen || asPage) && books.length > 0 && !selectedBookId) {
      setSelectedBookId(books[0].id)
    }
  }, [isOpen, asPage, books, selectedBookId])

  const handleExportObsidian = useCallback(async () => {
    if (!selectedBookId) return
    const data = await searchStatsApi.exportMarkdown(selectedBookId)
    if (data?.markdown) {
      setExportPreview(data.markdown)
      downloadMarkdownFile(data.markdown, data.filename || '读书笔记.md')
    }
  }, [selectedBookId])

  const handleSyncLifeOS = useCallback(async () => {
    if (!selectedBookId) return
    const data = await searchStatsApi.syncLifeOs(selectedBookId)
    if (data?.summary) {
      setLifeOsMessage(data.summary)
    }
  }, [selectedBookId])

  return {
    stats,
    loading,
    selectedBookId,
    setSelectedBookId,
    exportPreview,
    lifeOsMessage,
    handleExportObsidian,
    handleSyncLifeOS,
    reloadStats: fetchStats,
  }
}
