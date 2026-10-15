import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import type { FullTextSearchResponse } from '../types'
import { sidebarApi } from '../api'
import { useTypographyStore } from '../../../stores/typographyStore'
import {
  getAlternateChineseQuery,
  convertFullTextSearchResponse,
} from '../../../utils/chineseConversion'

export interface UseSidebarSearchReturn {
  searchQuery: string
  setSearchQuery: (q: string) => void
  searchResult: FullTextSearchResponse | null
  isSearching: boolean
  runSearch: (q: string) => Promise<void>
}

export function useSidebarSearch(
  bookId: string,
  initialQuery: string = ''
): UseSidebarSearchReturn {
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [rawSearchResult, setRawSearchResult] = useState<FullTextSearchResponse | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const chineseVariant = useTypographyStore((s) => s.typography.chineseVariant ?? 'original')

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentSearchTokenRef = useRef(0)

  const executeSearch = useCallback(
    async (q: string, token: number) => {
      const trimmed = q.trim()
      if (!trimmed) {
        setRawSearchResult(null)
        setIsSearching(false)
        return
      }
      setIsSearching(true)
      try {
        let data = await sidebarApi.searchInBook(bookId, trimmed)
        if (token !== currentSearchTokenRef.current) return
        if (data.total_matches === 0) {
          const alt = getAlternateChineseQuery(trimmed)
          if (alt) {
            const altData = await sidebarApi.searchInBook(bookId, alt)
            if (token !== currentSearchTokenRef.current) return
            if (altData.total_matches > 0) data = altData
          }
        }
        setRawSearchResult(data)
      } catch (err) {
        console.error('In-book search failed:', err)
      } finally {
        if (token === currentSearchTokenRef.current) {
          setIsSearching(false)
        }
      }
    },
    [bookId]
  )

  const runSearch = useCallback(
    async (q: string) => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      const token = ++currentSearchTokenRef.current
      if (!q.trim()) {
        setRawSearchResult(null)
        setIsSearching(false)
        return
      }
      setIsSearching(true)
      debounceTimerRef.current = setTimeout(() => {
        executeSearch(q, token)
      }, 240)
    },
    [executeSearch]
  )

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery)
      void runSearch(initialQuery)
    }
  }, [initialQuery, runSearch])

  const searchResult = useMemo(
    () => convertFullTextSearchResponse(rawSearchResult, chineseVariant),
    [rawSearchResult, chineseVariant]
  )

  return {
    searchQuery,
    setSearchQuery,
    searchResult,
    isSearching,
    runSearch,
  }
}
