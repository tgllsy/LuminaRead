import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { searchStatsApi } from '../api'
import type { FullTextSearchResponse } from '../types'
import { useTypographyStore } from '../../../stores/typographyStore'
import {
  getAlternateChineseQuery,
  convertFullTextSearchResponse,
} from '../../../utils/chineseConversion'

export interface UseGlobalSearchOptions {
  isOpen: boolean
  asPage?: boolean
  initialQuery?: string
}

export function useGlobalSearch({
  isOpen,
  asPage = false,
  initialQuery = '',
}: UseGlobalSearchOptions) {
  const [query, setQuery] = useState(initialQuery)
  const [rawResult, setRawResult] = useState<FullTextSearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<number | null>(null)
  const searchSeqRef = useRef(0)
  const chineseVariant = useTypographyStore((s) => s.typography.chineseVariant ?? 'original')

  const executeSearch = useCallback(async (q: string) => {
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    const trimmed = q.trim()
    if (!trimmed) {
      setRawResult(null)
      setLoading(false)
      return
    }
    const currentSeq = ++searchSeqRef.current
    setLoading(true)
    try {
      let data = await searchStatsApi.search(trimmed)
      if (data.total_matches === 0) {
        const alt = getAlternateChineseQuery(trimmed)
        if (alt) {
          const altData = await searchStatsApi.search(alt)
          if (altData.total_matches > 0) data = altData
        }
      }
      if (currentSeq === searchSeqRef.current) setRawResult(data)
    } catch {
      if (currentSeq === searchSeqRef.current) setRawResult(null)
    } finally {
      if (currentSeq === searchSeqRef.current) setLoading(false)
    }
  }, [])

  const handleQueryChange = useCallback(
    (newVal: string) => {
      setQuery(newVal)
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
      const trimmed = newVal.trim()
      if (!trimmed) {
        setRawResult(null)
        setLoading(false)
        return
      }
      debounceTimerRef.current = window.setTimeout(() => executeSearch(trimmed), 250)
    },
    [executeSearch]
  )

  useEffect(() => {
    if (isOpen || asPage) {
      setTimeout(() => inputRef.current?.focus(), 50)
      if (initialQuery.trim()) {
        setQuery(initialQuery.trim())
        executeSearch(initialQuery.trim())
      }
    }
    return () => {
      if (debounceTimerRef.current) window.clearTimeout(debounceTimerRef.current)
    }
  }, [isOpen, asPage, initialQuery, executeSearch])

  const result = useMemo(
    () => convertFullTextSearchResponse(rawResult, chineseVariant),
    [rawResult, chineseVariant]
  )

  return { query, setQuery: handleQueryChange, result, loading, inputRef, executeSearch }
}
