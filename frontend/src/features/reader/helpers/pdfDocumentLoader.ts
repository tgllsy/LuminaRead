import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker
  } catch {
    // If worker URL assignment fails, PDF.js falls back to main thread
  }
}

const MAX_CACHED_DOCS = 2
const docCache = new Map<string, Promise<pdfjsLib.PDFDocumentProxy>>()

function destroyDocPromise(promise: Promise<pdfjsLib.PDFDocumentProxy>) {
  promise.then((doc) => {
    try {
      doc.destroy()
    } catch {}
  }).catch(() => {})
}

export function getPdfDocument(bookId: string): Promise<pdfjsLib.PDFDocumentProxy> {
  let cached = docCache.get(bookId)
  if (cached) {
    // Refresh LRU order: delete and re-insert
    docCache.delete(bookId)
    docCache.set(bookId, cached)
    return cached
  }

  // Evict oldest documents beyond capacity
  while (docCache.size >= MAX_CACHED_DOCS) {
    const oldestKey = docCache.keys().next().value
    if (!oldestKey) break
    const oldestPromise = docCache.get(oldestKey)
    docCache.delete(oldestKey)
    if (oldestPromise) {
      destroyDocPromise(oldestPromise)
    }
  }

  const fileUrl = typeof window !== 'undefined'
    ? new URL(`/api/books/${encodeURIComponent(bookId)}/file`, window.location.origin).href
    : `/api/books/${encodeURIComponent(bookId)}/file`

  const cMapUrl = typeof window !== 'undefined'
    ? new URL('/cmaps/', window.location.origin).href
    : '/cmaps/'

  const loadingTask = pdfjsLib.getDocument({
    url: fileUrl,
    cMapUrl,
    cMapPacked: true,
    enableXfa: false,
    isEvalSupported: false,
    disableAutoFetch: true,
    disableStream: false,
    disableRange: false,
  })

  cached = loadingTask.promise.catch((err) => {
    docCache.delete(bookId)
    throw err
  })
  docCache.set(bookId, cached)
  return cached
}

export function clearPdfDocumentCache(bookId?: string) {
  if (bookId) {
    const p = docCache.get(bookId)
    docCache.delete(bookId)
    if (p) destroyDocPromise(p)
  } else {
    for (const p of docCache.values()) {
      destroyDocPromise(p)
    }
    docCache.clear()
  }
}
