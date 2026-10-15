import { useState, useMemo } from 'react'
import type { TocItem } from '../types'
import { filterToc } from '../helpers'

export interface UseTocNavigationReturn {
  tocFilter: string
  setTocFilter: (val: string) => void
  filteredToc: TocItem[]
}

export function useTocNavigation(toc: TocItem[]): UseTocNavigationReturn {
  const [tocFilter, setTocFilter] = useState('')

  const safeToc = useMemo(() => (Array.isArray(toc) ? toc : []), [toc])

  const filteredToc = useMemo(
    () => filterToc(safeToc, tocFilter),
    [safeToc, tocFilter]
  )

  return {
    tocFilter,
    setTocFilter,
    filteredToc,
  }
}
