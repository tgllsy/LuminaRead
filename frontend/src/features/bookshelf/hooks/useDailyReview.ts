import { useState, useEffect, useCallback } from 'react'
import type { HighlightItem } from '../../../types'
import { bookshelfApi } from '../api/bookshelfApi'

export function useDailyReview() {
  const [reviews, setReviews] = useState<HighlightItem[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const fetchReviews = useCallback(async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setLoading(true)
    try {
      const items = await bookshelfApi.fetchDailyReviews()
      setReviews(items.slice(0, 3))
    } catch {
      // silent fallback
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const toggleExpanded = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setExpanded((prev) => !prev)
  }, [])

  return {
    reviews,
    loading,
    expanded,
    fetchReviews,
    toggleExpanded,
  }
}
