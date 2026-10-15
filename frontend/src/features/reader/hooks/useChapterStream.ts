import { useState, useEffect, useRef, useCallback } from 'react'
import type { BookFullContent } from '../types'
import { readerApi } from '../api'
import { setBookInMemoryCache } from '../../../utils/bookCache'

interface UseChapterStreamOptions {
  activeBookId: string
  chapterIndex: number
  isContinuousSingleScroll: boolean
  contentData: BookFullContent | null
  setContentData: React.Dispatch<React.SetStateAction<BookFullContent | null>>
  bottomSentinelRef?: React.RefObject<HTMLDivElement | null>
  chapterStreamRefs?: React.MutableRefObject<Record<number, HTMLDivElement | null>>
  onScrollSyncChapter?: (nextChIdx: number) => void
  isHidden?: boolean
}

function useHydrateStreamChapters({
  activeBookId,
  chapterIndex,
  isContinuousSingleScroll,
  connectedChapterIndices,
  contentData,
  setContentData,
}: UseChapterStreamOptions & { connectedChapterIndices: number[] }) {
  const inFlightFetchesRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!contentData || contentData.book.id !== activeBookId) return
    const indices = new Set<number>([chapterIndex, ...connectedChapterIndices])
    if (isContinuousSingleScroll && connectedChapterIndices.length > 0) {
      const last = connectedChapterIndices[connectedChapterIndices.length - 1]
      if (last + 1 < contentData.chapters.length) indices.add(last + 1)
    }

    indices.forEach((chIdx) => {
      const ch = contentData.chapters[chIdx]
      if (ch?._partial && !ch.content) {
        const reqKey = `${activeBookId}:${chIdx}`
        if (inFlightFetchesRef.current.has(reqKey)) return
        inFlightFetchesRef.current.add(reqKey)

        readerApi
          .getChapterContent(activeBookId, chIdx)
          .then((d) => {
            if (d?.chapter) {
              setContentData((prev) => {
                if (!prev || prev.book.id !== activeBookId) return prev
                const nextChapters = [...prev.chapters]
                nextChapters[chIdx] = {
                  ...nextChapters[chIdx],
                  content: d.chapter?.content || '',
                  _partial: false,
                }
                const updated = { ...prev, chapters: nextChapters }
                setBookInMemoryCache(activeBookId, updated, false)
                return updated
              })
            }
          })
          .catch(() => {})
          .finally(() => {
            inFlightFetchesRef.current.delete(reqKey)
          })
      }
    })
  }, [contentData, activeBookId, chapterIndex, connectedChapterIndices, isContinuousSingleScroll, setContentData])
}

function useContinuousScrollEffect(
  opts: UseChapterStreamOptions & {
    connectedChapterIndices: number[]
    setConnectedChapterIndices: React.Dispatch<React.SetStateAction<number[]>>
  }
) {
  const { isContinuousSingleScroll, contentData, connectedChapterIndices, setConnectedChapterIndices, bottomSentinelRef, isHidden } = opts
  const appendLockRef = useRef(false)
  const latestRef = useRef(opts)
  latestRef.current = opts

  useEffect(() => {
    if (isHidden || !isContinuousSingleScroll || !contentData || contentData.chapters.length <= 1) return
    const totalChCount = contentData.chapters.length
    const tryAppendNext = () => {
      if (appendLockRef.current) return
      const cur = latestRef.current
      const prev = cur.connectedChapterIndices
      const lastCh = prev[prev.length - 1] ?? cur.chapterIndex
      if (lastCh >= totalChCount - 1) return
      const lastChObj = contentData.chapters[lastCh]
      if (lastChObj?._partial && !lastChObj.content) return
      appendLockRef.current = true
      window.setTimeout(() => { appendLockRef.current = false }, 260)
      setConnectedChapterIndices((old) => {
        const tail = old[old.length - 1] ?? cur.chapterIndex
        if (tail >= totalChCount - 1 || old.includes(tail + 1)) return old
        return [...old, tail + 1]
      })
    }

    const io = typeof IntersectionObserver !== 'undefined' && bottomSentinelRef?.current
      ? new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) tryAppendNext() }, { rootMargin: '0px 0px 720px 0px' })
      : null
    if (io && bottomSentinelRef?.current) io.observe(bottomSentinelRef.current)

    const onScroll = () => {
      if (document.documentElement.scrollHeight - (window.innerHeight + window.scrollY) <= 680) tryAppendNext()
      const cur = latestRef.current
      if (cur.connectedChapterIndices.length > 1 && cur.chapterStreamRefs) {
        const probeY = Math.min(240, Math.round(window.innerHeight * 0.32))
        let activeStreamCh = cur.connectedChapterIndices[0]
        for (const chIdx of cur.connectedChapterIndices) {
          const el = cur.chapterStreamRefs.current[chIdx]
          if (el && el.getBoundingClientRect().top <= probeY) activeStreamCh = chIdx
        }
        if (activeStreamCh !== cur.chapterIndex) cur.onScrollSyncChapter?.(activeStreamCh)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { io?.disconnect(); window.removeEventListener('scroll', onScroll) }
  }, [isHidden, isContinuousSingleScroll, contentData, connectedChapterIndices, bottomSentinelRef, setConnectedChapterIndices])
}

export function useChapterStream(opts: UseChapterStreamOptions) {
  const { activeBookId, chapterIndex, isContinuousSingleScroll } = opts
  const [connectedChapterIndices, setConnectedChapterIndices] = useState<number[]>([chapterIndex])
  const latestRef = useRef({ ...opts, connectedChapterIndices })
  latestRef.current = { ...opts, connectedChapterIndices }

  useEffect(() => {
    setConnectedChapterIndices((prev) => {
      if (!isContinuousSingleScroll) return prev.length === 1 && prev[0] === chapterIndex ? prev : [chapterIndex]
      return prev.includes(chapterIndex) ? prev : [chapterIndex]
    })
  }, [chapterIndex, isContinuousSingleScroll, activeBookId])

  useHydrateStreamChapters({ ...opts, connectedChapterIndices })
  useContinuousScrollEffect({ ...opts, connectedChapterIndices, setConnectedChapterIndices })

  const appendNextContinuousChapter = useCallback((scrollIntoView = false) => {
    const cur = latestRef.current
    if (!cur.contentData || cur.contentData.chapters.length <= 1) return
    const total = cur.contentData.chapters.length
    setConnectedChapterIndices((prev) => {
      const lastCh = prev[prev.length - 1] ?? cur.chapterIndex
      if (lastCh >= total - 1) return prev
      const nextCh = lastCh + 1
      if (prev.includes(nextCh)) return prev
      if (scrollIntoView) {
        window.setTimeout(() => {
          const el = cur.chapterStreamRefs?.current[nextCh] || (document.querySelector(`[data-chapter-stream-index="${nextCh}"]`) as HTMLElement | null)
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 60)
      }
      return [...prev, nextCh]
    })
  }, [])

  return { connectedChapterIndices, setConnectedChapterIndices, appendNextContinuousChapter }
}
