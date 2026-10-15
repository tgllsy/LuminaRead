import { useState, useEffect } from 'react'
import { readerApi } from '../api'

export function useReaderBilingual(
  activeBookId: string,
  chapterIndex: number,
  bilingualMode: boolean | undefined
) {
  const [bilingualMap, setBilingualMap] = useState<Record<number, string>>({})
  const [bilingualLoading, setBilingualLoading] = useState(false)

  useEffect(() => {
    setBilingualMap({})
  }, [activeBookId])

  useEffect(() => {
    if (!bilingualMode || !activeBookId) return
    let cancelled = false
    setBilingualLoading(true)
    readerApi
      .getChapterBilingual(activeBookId, chapterIndex)
      .then((d) => {
        if (cancelled) return
        if (Array.isArray(d.chapter?.bilingual)) {
          const map: Record<number, string> = {}
          d.chapter.bilingual.forEach((item) => {
            if (item && typeof item.paragraph_index === 'number' && item.translation) {
              map[item.paragraph_index] = item.translation
            }
          })
          setBilingualMap(map)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setBilingualLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [bilingualMode, activeBookId, chapterIndex])

  return { bilingualMap, bilingualLoading }
}
