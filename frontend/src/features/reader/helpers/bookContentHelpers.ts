import type { BookSummary, JumpTarget, BookFullContent } from '../types'

export function resolveTargetChapterIndex(
  activeBookId: string,
  allBooks: BookSummary[],
  jumpTarget: JumpTarget | null,
  remoteProgressCh?: number
): number {
  if (jumpTarget?.bookId === activeBookId && jumpTarget.chapterIndex !== undefined) {
    return jumpTarget.chapterIndex
  }
  if (remoteProgressCh !== undefined && remoteProgressCh >= 0) {
    return remoteProgressCh
  }
  const hint = allBooks.find((b) => b.id === activeBookId)
  return hint?.progress?.chapter_index ?? 0
}

export function mergeRawChapters(
  prevRaw: BookFullContent,
  nextVal: BookFullContent
): BookFullContent {
  const mergedChapters = nextVal.chapters.map((ch, idx) => {
    const prevCh = prevRaw.chapters[idx]
    if (prevCh && !prevCh._partial && prevCh.content) {
      return prevCh
    }
    return ch
  })
  return {
    ...nextVal,
    book: prevRaw.book,
    chapters: mergedChapters,
  }
}
