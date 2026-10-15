import { useMemo } from 'react'
import type { BookSummary } from '../types'
import { useTypographyStore } from '../../../stores/typographyStore'
import { convertBookSummary } from '../../../utils/chineseConversion'

interface UseBookTabsOptions {
  openTabBookIds: string[]
  allBooks: BookSummary[]
  activeBookId: string
  onSwitchBookTab: (bookId: string) => void
  onCloseBookTab: (bookId: string) => void
}

export function useBookTabs({
  openTabBookIds,
  allBooks,
  activeBookId,
  onSwitchBookTab,
  onCloseBookTab,
}: UseBookTabsOptions) {
  const chineseVariant = useTypographyStore((s) => s.typography.chineseVariant)
  const openTabBooks = useMemo(
    () =>
      openTabBookIds
        .map((id) => allBooks.find((b) => b.id === id))
        .filter((b): b is BookSummary => Boolean(b))
        .map((b) => convertBookSummary(b, chineseVariant)),
    [openTabBookIds, allBooks, chineseVariant]
  )

  const otherTabBooks = useMemo(
    () => openTabBooks.filter((b) => b.id !== activeBookId),
    [openTabBooks, activeBookId]
  )

  return {
    openTabBooks,
    otherTabBooks,
    onSwitchBookTab,
    onCloseBookTab,
  }
}
