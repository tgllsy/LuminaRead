import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker
  } catch {
    // If worker URL assignment fails, PDF.js falls back to main thread
  }
}

const docCache = new Map<string, Promise<pdfjsLib.PDFDocumentProxy>>()

export function getPdfDocument(bookId: string): Promise<pdfjsLib.PDFDocumentProxy> {
  let cached = docCache.get(bookId)
  if (!cached) {
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
      // Remove corrupt or failed promise from cache so future attempts can retry
      docCache.delete(bookId)
      throw err
    })
    docCache.set(bookId, cached)
  }
  return cached
}

export function clearPdfDocumentCache(bookId?: string) {
  if (bookId) {
    docCache.delete(bookId)
  } else {
    docCache.clear()
  }
}
