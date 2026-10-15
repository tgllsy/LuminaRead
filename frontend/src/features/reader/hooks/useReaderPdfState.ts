import { useState, useEffect, useCallback } from 'react'
import type { PdfMode, PdfSpreadMode, PdfBookMeta } from '../types'
import { readerApi } from '../api'

const PDF_MODE_STORAGE_KEY = 'luminaread_pdf_mode'

export function useReaderPdfState(activeBookId: string, isPdf: boolean) {
  const [pdfMode, setPdfModeState] = useState<PdfMode>(() => {
    try {
      const saved = localStorage.getItem(PDF_MODE_STORAGE_KEY)
      if (saved === 'hybrid' || saved === 'page_canvas' || saved === 'text_only') {
        return saved
      }
    } catch {
      // ignore
    }
    return 'hybrid'
  })

  const setPdfMode = useCallback((updater: PdfMode | ((prev: PdfMode) => PdfMode)) => {
    setPdfModeState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      try {
        localStorage.setItem(PDF_MODE_STORAGE_KEY, next)
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  const [pdfMeta, setPdfMeta] = useState<PdfBookMeta | null>(null)
  const [pdfCanvasPage, setPdfCanvasPage] = useState(1)
  const [pdfSpreadMode, setPdfSpreadMode] = useState<PdfSpreadMode>('single')
  const [pdfZoom, setPdfZoom] = useState(100)
  const [pdfEyeCareFilter, setPdfEyeCareFilter] = useState(false)

  useEffect(() => {
    if (!isPdf) return
    let cancelled = false
    readerApi.getPdfMeta(activeBookId).then((meta) => {
      if (!cancelled && meta) setPdfMeta(meta)
    })
    return () => {
      cancelled = true
    }
  }, [isPdf, activeBookId])

  return {
    pdfMode,
    setPdfMode,
    pdfMeta,
    pdfCanvasPage,
    setPdfCanvasPage,
    pdfSpreadMode,
    setPdfSpreadMode,
    pdfZoom,
    setPdfZoom,
    pdfEyeCareFilter,
    setPdfEyeCareFilter,
  }
}
