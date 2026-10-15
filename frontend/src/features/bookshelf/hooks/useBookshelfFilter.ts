import { useState, useCallback } from 'react'
import type { BookshelfFilterState, BookshelfViewMode } from '../types'

export function useBookshelfFilter() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [libraryFilter, setLibraryFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<BookshelfViewMode>('grid')
  const [localFilterText, setLocalFilterText] = useState('')

  const resetFilters = useCallback(() => {
    setStatusFilter('all')
    setLibraryFilter('all')
    setCategoryFilter('all')
    setLocalFilterText('')
  }, [])

  const filterState: BookshelfFilterState = {
    statusFilter,
    libraryFilter,
    categoryFilter,
    viewMode,
    localFilterText,
  }

  return {
    filterState,
    statusFilter,
    libraryFilter,
    categoryFilter,
    viewMode,
    localFilterText,
    setStatusFilter,
    setLibraryFilter,
    setCategoryFilter,
    setViewMode,
    setLocalFilterText,
    resetFilters,
  }
}
