import { useState, useEffect, useRef, useCallback } from 'react'
import { discoveryApi } from '../api'
import type { ExternalBookResult } from '../types'

export function useBookSearch(enabled: boolean) {
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [formatFilter, setFormatFilter] = useState('all')
  const [langFilter, setLangFilter] = useState('all')
  const [results, setResults] = useState<ExternalBookResult[]>([])
  const [searching, setSearching] = useState(false)
  const searchSeqRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleSearch = useCallback(
    async (q = query, src = sourceFilter, fmt = formatFilter, lng = langFilter) => {
      const seq = ++searchSeqRef.current
      if (abortControllerRef.current) abortControllerRef.current.abort()
      const controller = new AbortController()
      abortControllerRef.current = controller

      setSearching(true)
      try {
        const books = await discoveryApi.searchBooks(
          { q, source: src, format: fmt, lang: lng },
          controller.signal
        )
        if (seq === searchSeqRef.current) setResults(books)
      } catch (err: unknown) {
        if ((err as { name?: string })?.name === 'AbortError') return
      } finally {
        if (seq === searchSeqRef.current) setSearching(false)
      }
    },
    [query, sourceFilter, formatFilter, langFilter]
  )

  useEffect(() => {
    if (enabled) {
      handleSearch(query, sourceFilter, formatFilter, langFilter)
    }
  }, [enabled, sourceFilter, formatFilter, langFilter])

  return {
    query,
    setQuery,
    sourceFilter,
    setSourceFilter,
    formatFilter,
    setFormatFilter,
    langFilter,
    setLangFilter,
    results,
    setResults,
    searching,
    handleSearch,
  }
}
