import { useState, useRef, useEffect, useCallback } from 'react'
import type { JumpTarget, ReturnAnchorState, ScrollTarget, UseReaderChapterSelectOptions } from '../types'
import { readerApi } from '../api'
import { setBookInMemoryCache, prefetchUpcomingChapters } from '../../../utils/bookCache'

function useChapterJumpAndRestoreTarget({
  contentData, chapterIndex, jumpTarget, isHidden,
  pendingScrollTargetRef, setScrollRequestNonce,
  setFlashedParaIndex, setHighlightKeyword,
}: Pick<
  UseReaderChapterSelectOptions,
  'contentData' | 'chapterIndex' | 'jumpTarget' | 'isHidden' | 'setFlashedParaIndex' | 'setHighlightKeyword'
> & {
  pendingScrollTargetRef: React.MutableRefObject<ScrollTarget>
  setScrollRequestNonce: React.Dispatch<React.SetStateAction<number>>
}) {
  const lastConsumedJumpRef = useRef<JumpTarget | null>(null)
  const restoredBookIdRef = useRef<string | null>(null)
  const prevIsHiddenRef = useRef(isHidden)

  useEffect(() => {
    if (prevIsHiddenRef.current && !isHidden) {
      // Book was re-opened from bookshelf; allow progress restoration if jumpTarget has no explicit paragraph
      restoredBookIdRef.current = null
    }
    prevIsHiddenRef.current = isHidden
  }, [isHidden])

  // 1. Explicit jump target (TOC, notes, bookmarks, search results, bookshelf open)
  useEffect(() => {
    if (isHidden || !contentData || !jumpTarget || jumpTarget.bookId !== contentData.book.id) return
    const maxCh = Math.max(0, contentData.chapters.length - 1)
    const targetCh = jumpTarget.chapterIndex !== undefined
      ? Math.max(0, Math.min(jumpTarget.chapterIndex, maxCh))
      : chapterIndex
    if (chapterIndex !== targetCh) return
    if (lastConsumedJumpRef.current === jumpTarget) return
    lastConsumedJumpRef.current = jumpTarget
    if (jumpTarget.highlightKeyword !== undefined) setHighlightKeyword(jumpTarget.highlightKeyword)
    const fallbackSavedPara =
      contentData.progress?.chapter_index === targetCh
        ? Math.round(contentData.progress?.scroll_offset ?? 0)
        : 0
    const targetPara = jumpTarget.paragraphIndex ?? (fallbackSavedPara > 0 ? fallbackSavedPara : undefined)
    if (targetPara !== undefined) {
      restoredBookIdRef.current = contentData.book.id
      pendingScrollTargetRef.current = { type: 'para', index: targetPara }
      setFlashedParaIndex(targetPara)
      setScrollRequestNonce((n) => n + 1)
    } else if (jumpTarget.scrollOffset !== undefined && jumpTarget.scrollOffset > 0) {
      restoredBookIdRef.current = contentData.book.id
      pendingScrollTargetRef.current = { type: 'offset', top: jumpTarget.scrollOffset }
      setScrollRequestNonce((n) => n + 1)
    }
  }, [isHidden, contentData, chapterIndex, jumpTarget, pendingScrollTargetRef, setFlashedParaIndex, setHighlightKeyword, setScrollRequestNonce])

  // 2. Restore saved paragraph from backend reading progress on initial book open
  useEffect(() => {
    if (isHidden || !contentData) return
    const bookId = contentData.book.id
    if (restoredBookIdRef.current === bookId) return

    if (
      jumpTarget?.bookId === bookId &&
      (jumpTarget.paragraphIndex !== undefined || (jumpTarget.scrollOffset !== undefined && jumpTarget.scrollOffset > 0))
    ) {
      restoredBookIdRef.current = bookId
      return
    }

    const savedCh = contentData.progress?.chapter_index ?? 0
    const savedPara = Math.round(contentData.progress?.scroll_offset ?? 0)
    if (chapterIndex === savedCh && savedPara > 0) {
      restoredBookIdRef.current = bookId
      pendingScrollTargetRef.current = { type: 'para', index: savedPara }
      setFlashedParaIndex(savedPara)
      setScrollRequestNonce((n) => n + 1)
    } else if (contentData.chapters?.[chapterIndex]?.content) {
      restoredBookIdRef.current = bookId
    }
  }, [isHidden, contentData, chapterIndex, jumpTarget, pendingScrollTargetRef, setFlashedParaIndex, setScrollRequestNonce])
}

function useChapterScrollExecutor({
  chapterIndex, isHidden, isCurrentChapterPartial,
  pendingScrollTargetRef, scrollRequestNonce, paragraphRefs,
}: {
  chapterIndex: number
  isHidden?: boolean
  isCurrentChapterPartial: boolean
  pendingScrollTargetRef: React.MutableRefObject<ScrollTarget>
  scrollRequestNonce: number
  paragraphRefs: UseReaderChapterSelectOptions['paragraphRefs']
}) {
  useEffect(() => {
    if (isHidden || isCurrentChapterPartial) return
    const target = pendingScrollTargetRef.current
    if (target.type === 'none') return

    if (target.type === 'para') {
      pendingScrollTargetRef.current = { type: 'none' }
      let cancelled = false
      const targetIdx = target.index
      const tryScroll = (attemptsLeft: number, delayMs: number) => {
        if (cancelled) return
        setTimeout(() => {
          if (cancelled) return
          const chapterEl = document.querySelector(`[data-chapter-stream-index="${chapterIndex}"]`)
          const el =
            paragraphRefs.current[targetIdx] ||
            (chapterEl ? (chapterEl.querySelector(`[data-para-index="${targetIdx}"]`) as HTMLElement | null) : null) ||
            (document.querySelector(`[data-para-index="${targetIdx}"]`) as HTMLElement | null)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          } else if (attemptsLeft > 0) {
            tryScroll(attemptsLeft - 1, delayMs * 1.5)
          }
        }, delayMs)
      }
      tryScroll(5, 40)
      return () => { cancelled = true }
    }
    if (target.type === 'offset') {
      const top = target.top
      pendingScrollTargetRef.current = { type: 'none' }
      window.scrollTo({ top, behavior: 'smooth' })
      return
    }
    if (target.type === 'top') {
      pendingScrollTargetRef.current = { type: 'none' }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }
  }, [chapterIndex, scrollRequestNonce, isHidden, isCurrentChapterPartial, paragraphRefs, pendingScrollTargetRef])
}

function extractPdfCanvasPage(chapter?: { content?: string; pageStart?: number }, targetParaIdx?: number): number | null {
  if (!chapter) return null
  if (targetParaIdx !== undefined) {
    const chParas = String(chapter.content || '').split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean)
    for (let i = 0; i <= targetParaIdx && i < chParas.length; i++) {
      const m = chParas[i].match(/^\[\[PDF_PAGE:(\d+)\]\]$/i)
      if (m) return Number(m[1])
    }
  }
  return chapter.pageStart ?? null
}

function scheduleProgressSync(
  latestRef: React.MutableRefObject<UseReaderChapterSelectOptions>,
  progressTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>,
  bookId: string,
  nextIdx: number,
  targetParaIdx?: number
) {
  if (progressTimerRef.current) clearTimeout(progressTimerRef.current)
  const totalLen = Math.max(1, latestRef.current.contentData?.chapters.length ?? 1)
  progressTimerRef.current = setTimeout(async () => {
    progressTimerRef.current = null
    const latest = latestRef.current
    if (!latest.contentData || latest.contentData.book.id !== bookId) return
    const pct = Math.round(((nextIdx + 1) / totalLen) * 100)
    const progress = await latest.reportProgress(nextIdx, targetParaIdx || 0, pct, 45)
    if (progress) {
      latest.setContentData((prev) => {
        if (!prev || prev.book.id !== bookId) return prev
        const updated = { ...prev, progress }
        setBookInMemoryCache(bookId, updated, false)
        return updated
      })
    }
  }, 240)
}

export function useReaderChapterSelect(opts: UseReaderChapterSelectOptions) {
  const pendingScrollTargetRef = useRef<ScrollTarget>({ type: 'none' })
  const [scrollRequestNonce, setScrollRequestNonce] = useState(0)
  const latestRef = useRef(opts)
  latestRef.current = opts
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearTimeout(progressTimerRef.current)
    }
  }, [])

  const handleSelectChapter = useCallback((
    nextIdx: number, targetParaIdx?: number, kw?: string, saveReturnFrom?: ReturnAnchorState
  ) => {
    const cur = latestRef.current
    if (!cur.contentData || nextIdx < 0 || nextIdx >= cur.contentData.chapters.length) return
    if (
      document.activeElement instanceof HTMLElement &&
      !(document.activeElement instanceof HTMLInputElement)
    ) {
      document.activeElement.blur()
    }
    if (saveReturnFrom) cur.setReturnAnchor(saveReturnFrom)
    if (nextIdx !== cur.chapterIndex) cur.paragraphRefs.current = {}

    if (targetParaIdx !== undefined) {
      pendingScrollTargetRef.current = { type: 'para', index: targetParaIdx }
      cur.setFlashedParaIndex(targetParaIdx)
    } else {
      pendingScrollTargetRef.current = { type: 'top' }
      cur.setFlashedParaIndex(null)
      if (!cur.isHidden) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
        document.documentElement.scrollTop = 0; document.body.scrollTop = 0
      }
    }
    cur.setChapterIndex(nextIdx)
    cur.setConnectedChapterIndices(() => [nextIdx])
    setScrollRequestNonce((n) => n + 1)

    const bookId = cur.contentData.book.id
    const nextCh = cur.contentData.chapters[nextIdx]
    if (cur.contentData.book.format === 'pdf') {
      const page = extractPdfCanvasPage(nextCh, targetParaIdx)
      if (page) cur.setPdfCanvasPage(page)
    } else if (nextCh?.pageStart) {
      cur.setPdfCanvasPage(nextCh.pageStart)
    }
    cur.setSelectionState(null); cur.setFootnoteModal(null)
    if (kw !== undefined) cur.setHighlightKeyword(kw)

    if (nextCh?._partial && !nextCh.content) {
      readerApi.getChapterContent(bookId, nextIdx).then((d) => {
        if (d?.chapter) {
          cur.setContentData((prev) => {
            if (!prev || prev.book.id !== bookId) return prev
            const nCh = [...prev.chapters]
            nCh[nextIdx] = { ...nCh[nextIdx], content: d.chapter?.content || '', _partial: false }
            const updated = { ...prev, chapters: nCh }
            setBookInMemoryCache(bookId, updated, false)
            return updated
          })
          setScrollRequestNonce((n) => n + 1)
        }
      }).catch(() => {})
    }
    prefetchUpcomingChapters(bookId, nextIdx + 1, 4)
    scheduleProgressSync(latestRef, progressTimerRef, bookId, nextIdx, targetParaIdx)
  }, [])

  const isCurrentChapterPartial = Boolean(
    opts.contentData?.chapters?.[opts.chapterIndex]?._partial && !opts.contentData?.chapters?.[opts.chapterIndex]?.content
  )

  useChapterJumpAndRestoreTarget({
    contentData: opts.contentData,
    chapterIndex: opts.chapterIndex,
    jumpTarget: opts.jumpTarget,
    isHidden: opts.isHidden,
    pendingScrollTargetRef,
    setScrollRequestNonce,
    setFlashedParaIndex: opts.setFlashedParaIndex,
    setHighlightKeyword: opts.setHighlightKeyword,
  })

  useChapterScrollExecutor({
    chapterIndex: opts.chapterIndex,
    isHidden: opts.isHidden,
    isCurrentChapterPartial,
    pendingScrollTargetRef,
    scrollRequestNonce,
    paragraphRefs: opts.paragraphRefs,
  })

  return { handleSelectChapter, pendingScrollTargetRef }
}

