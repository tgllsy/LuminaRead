import type { BookSummary, BookChapter, BookFullContent, FullTextSearchResponse } from '../types'
import { T2S_SRC, T2S_DST, S2T_SRC, S2T_DST, T2S_PHRASES, S2T_PHRASES } from './chineseConversionDict'

export type ChineseVariant = 'original' | 'simplified' | 'traditional'

let t2sTable: Uint16Array | null = null
let s2tTable: Uint16Array | null = null

function getT2sTable(): Uint16Array {
  if (!t2sTable) {
    t2sTable = new Uint16Array(65536)
    for (let i = 0; i < T2S_SRC.length; i++) {
      t2sTable[T2S_SRC.charCodeAt(i)] = T2S_DST.charCodeAt(i)
    }
  }
  return t2sTable
}

function getS2tTable(): Uint16Array {
  if (!s2tTable) {
    s2tTable = new Uint16Array(65536)
    for (let i = 0; i < S2T_SRC.length; i++) {
      s2tTable[S2T_SRC.charCodeAt(i)] = S2T_DST.charCodeAt(i)
    }
  }
  return s2tTable
}

function mapCharsWithTable(text: string, table: Uint16Array): string {
  const len = text.length
  let firstDiff = -1
  for (let i = 0; i < len; i++) {
    if (table[text.charCodeAt(i)] !== 0) {
      firstDiff = i
      break
    }
  }
  if (firstDiff === -1) return text

  const codes = new Uint16Array(len)
  for (let i = 0; i < firstDiff; i++) {
    codes[i] = text.charCodeAt(i)
  }
  for (let i = firstDiff; i < len; i++) {
    const code = text.charCodeAt(i)
    const mapped = table[code]
    codes[i] = mapped !== 0 ? mapped : code
  }

  const CHUNK = 8192
  if (len <= CHUNK) {
    return String.fromCharCode(...codes)
  }
  let out = ''
  for (let i = 0; i < len; i += CHUNK) {
    out += String.fromCharCode(...codes.subarray(i, Math.min(i + CHUNK, len)))
  }
  return out
}

function applyPhrases(text: string, phrases: ReadonlyArray<readonly [string, string]>): string {
  let out = text
  for (let i = 0; i < phrases.length; i++) {
    const [from, to] = phrases[i]
    if (out.includes(from)) {
      out = out.replaceAll(from, to)
    }
  }
  return out
}

export function toSimplified(text: string): string {
  if (!text) return text
  return applyPhrases(mapCharsWithTable(text, getT2sTable()), T2S_PHRASES)
}

export function toTraditional(text: string): string {
  if (!text) return text
  return applyPhrases(mapCharsWithTable(text, getS2tTable()), S2T_PHRASES)
}

export function convertChineseText(text: string, variant?: ChineseVariant): string {
  if (!text || !variant || variant === 'original') return text
  return variant === 'simplified' ? toSimplified(text) : toTraditional(text)
}

export function hasTraditionalChinese(text: string): boolean {
  if (!text) return false
  const limit = Math.min(text.length, 4000)
  const table = getT2sTable()
  for (let i = 0; i < limit; i++) {
    if (table[text.charCodeAt(i)] !== 0) return true
  }
  return false
}

export function resolveNextChineseVariant(
  current: ChineseVariant | undefined,
  sampleText?: string
): ChineseVariant {
  if (current === 'simplified') return 'traditional'
  if (current === 'traditional') return 'original'
  if (sampleText && hasTraditionalChinese(sampleText)) {
    return 'simplified'
  }
  return 'traditional'
}

export function convertBookSummary<T extends BookSummary>(book: T, variant?: ChineseVariant): T {
  if (!variant || variant === 'original') return book
  return {
    ...book,
    title: convertChineseText(book.title, variant),
    author: convertChineseText(book.author, variant),
    category: book.category ? convertChineseText(book.category, variant) : book.category,
    description: book.description ? convertChineseText(book.description, variant) : book.description,
    tags: Array.isArray(book.tags) ? book.tags.map((t) => convertChineseText(t, variant)) : book.tags,
  }
}

export function convertBooksList<T extends BookSummary>(books: T[], variant?: ChineseVariant): T[] {
  if (!variant || variant === 'original' || books.length === 0) return books
  return books.map((b) => convertBookSummary(b, variant))
}

const chapterCache = new WeakMap<BookChapter, Partial<Record<'simplified' | 'traditional', BookChapter>>>()

function convertChapterCached(ch: BookChapter, variant: 'simplified' | 'traditional'): BookChapter {
  let entry = chapterCache.get(ch)
  if (entry && entry[variant]) return entry[variant]!

  const converted: BookChapter = {
    ...ch,
    title: convertChineseText(ch.title, variant),
    content: ch.content ? convertChineseText(ch.content, variant) : ch.content,
  }
  if (!entry) {
    entry = {}
    chapterCache.set(ch, entry)
  }
  entry[variant] = converted
  return converted
}

export function convertBookFullContent(
  data: BookFullContent | null,
  variant?: ChineseVariant
): BookFullContent | null {
  if (!data || !variant || variant === 'original') return data
  return {
    ...data,
    book: convertBookSummary(data.book, variant),
    toc: Array.isArray(data.toc)
      ? data.toc.map((item) => ({ ...item, title: convertChineseText(item.title, variant) }))
      : data.toc,
    chapters: Array.isArray(data.chapters)
      ? data.chapters.map((ch) => convertChapterCached(ch, variant))
      : data.chapters,
    highlights: Array.isArray(data.highlights)
      ? data.highlights.map((hl) => ({
          ...hl,
          chapter_title: hl.chapter_title ? convertChineseText(hl.chapter_title, variant) : hl.chapter_title,
          selected_text: convertChineseText(hl.selected_text, variant),
          note: hl.note ? convertChineseText(hl.note, variant) : hl.note,
        }))
      : data.highlights,
    bookmarks: Array.isArray(data.bookmarks)
      ? data.bookmarks.map((bm) => ({
          ...bm,
          chapter_title: bm.chapter_title ? convertChineseText(bm.chapter_title, variant) : bm.chapter_title,
          snippet: bm.snippet ? convertChineseText(bm.snippet, variant) : bm.snippet,
        }))
      : data.bookmarks,
  }
}

export function getAlternateChineseQuery(query: string): string | null {
  const trad = toTraditional(query)
  if (trad !== query) return trad
  const simp = toSimplified(query)
  if (simp !== query) return simp
  return null
}

export function convertFullTextSearchResponse(
  data: FullTextSearchResponse | null,
  variant?: ChineseVariant
): FullTextSearchResponse | null {
  if (!data || !variant || variant === 'original') return data
  return {
    ...data,
    query: convertChineseText(data.query, variant),
    chapter_hits: Array.isArray(data.chapter_hits)
      ? data.chapter_hits.map((hit) => ({
          ...hit,
          book_title: convertChineseText(hit.book_title, variant),
          book_author: convertChineseText(hit.book_author, variant),
          chapter_title: convertChineseText(hit.chapter_title, variant),
          snippet_before: convertChineseText(hit.snippet_before, variant),
          match_text: convertChineseText(hit.match_text, variant),
          snippet_after: convertChineseText(hit.snippet_after, variant),
          full_paragraph: convertChineseText(hit.full_paragraph, variant),
        }))
      : data.chapter_hits,
    highlight_hits: Array.isArray(data.highlight_hits)
      ? data.highlight_hits.map((hl) => ({
          ...hl,
          book_title: hl.book_title ? convertChineseText(hl.book_title, variant) : hl.book_title,
          book_author: hl.book_author ? convertChineseText(hl.book_author, variant) : hl.book_author,
          chapter_title: convertChineseText(hl.chapter_title, variant),
          selected_text: convertChineseText(hl.selected_text, variant),
          note: hl.note ? convertChineseText(hl.note, variant) : hl.note,
        }))
      : data.highlight_hits,
  }
}
