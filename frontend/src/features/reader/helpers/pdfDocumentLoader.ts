import * as pdfjsLib from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configure worker locally using Vite's URL resolution
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker
}

const docCache = new Map<string, Promise<pdfjsLib.PDFDocumentProxy>>()

export function getPdfDocument(bookId: string): Promise<pdfjsLib.PDFDocumentProxy> {
  let cached = docCache.get(bookId)
  if (!cached) {
    const url = `/api/books/${encodeURIComponent(bookId)}/file`
    const loadingTask = pdfjsLib.getDocument({
      url,
      cMapUrl: '/cmaps/',
      cMapPacked: true,
      enableXfa: false,
    })
    cached = loadingTask.promise
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
