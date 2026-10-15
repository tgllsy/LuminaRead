import { useState, useEffect } from 'react'
import type { NotesSubTab, NotesFilterState } from '../types'

export function useNotesFilter(initialSubTab: NotesSubTab = 'all', initialBookId: string = 'all') {
  const [activeSubTab, setActiveSubTab] = useState<NotesSubTab>(initialSubTab)
  const [selectedBookId, setSelectedBookId] = useState<string>(initialBookId)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [colorFilter, setColorFilter] = useState<string>('all')
  const [styleFilter, setStyleFilter] = useState<string>('all')
  const [aiModeFilter, setAiModeFilter] = useState<string>('all')

  useEffect(() => {
    setActiveSubTab(initialSubTab)
  }, [initialSubTab])

  useEffect(() => {
    setSelectedBookId(initialBookId)
  }, [initialBookId])

  const filterState: NotesFilterState = {
    activeSubTab,
    selectedBookId,
    searchQuery,
    colorFilter,
    styleFilter,
    aiModeFilter,
  }

  const resetFilters = () => {
    setSearchQuery('')
    setColorFilter('all')
    setStyleFilter('all')
    setAiModeFilter('all')
  }

  return {
    filterState,
    activeSubTab,
    selectedBookId,
    searchQuery,
    colorFilter,
    styleFilter,
    aiModeFilter,
    setActiveSubTab,
    setSelectedBookId,
    setSearchQuery,
    setColorFilter,
    setStyleFilter,
    setAiModeFilter,
    resetFilters,
  }
}
