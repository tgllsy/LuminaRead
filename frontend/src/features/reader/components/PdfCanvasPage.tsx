import React, { useEffect, useRef, useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { getPdfDocument } from '../helpers/pdfDocumentLoader'

interface PdfCanvasPageProps {
  bookId: string
  pageNum: number
  pdfZoom: number
  fitMode: 'page' | 'width'
  isDouble?: boolean
  pdfFilterStyle?: React.CSSProperties
  onRenderSuccess?: (dataUrl: string) => void
}

export const PdfCanvasPage: React.FC<PdfCanvasPageProps> = ({
  bookId,
  pageNum,
  pdfZoom,
  fitMode,
  isDouble = false,
  pdfFilterStyle,
  onRenderSuccess,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let currentRenderTask: any = null

    setLoading(true)
    setErrorMsg(null)

    async function renderPage() {
      try {
        const pdfDoc = await getPdfDocument(bookId)
        if (cancelled) return

        const page = await pdfDoc.getPage(pageNum)
        if (cancelled) return

        const unscaledViewport = page.getViewport({ scale: 1.0 })
        const containerWidth = containerRef.current?.parentElement?.clientWidth || window.innerWidth

        // Calculate responsive scale based on fit mode and zoom
        let targetScale = 1.0
        if (fitMode === 'page') {
          const availableHeight = Math.max(480, window.innerHeight - 220)
          const availableWidth = isDouble ? (containerWidth / 2) - 32 : Math.min(containerWidth - 32, 900)
          const scaleHeight = availableHeight / unscaledViewport.height
          const scaleWidth = availableWidth / unscaledViewport.width
          targetScale = Math.min(scaleHeight, scaleWidth) * (pdfZoom / 100)
        } else {
          // fit width
          const availableWidth = isDouble ? (containerWidth / 2) - 32 : containerWidth - 48
          targetScale = (availableWidth / unscaledViewport.width) * (pdfZoom / 100)
        }

        // Clamp scale to readable boundaries
        targetScale = Math.max(0.4, Math.min(targetScale, 3.0))

        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const viewport = page.getViewport({ scale: targetScale })
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d', { alpha: false })
        if (!ctx) return

        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        const renderContext = {
          canvasContext: ctx,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
        }

        currentRenderTask = page.render(renderContext)
        await currentRenderTask.promise

        if (!cancelled) {
          setLoading(false)
          if (onRenderSuccess) {
            try {
              onRenderSuccess(canvas.toDataURL('image/jpeg', 0.85))
            } catch {
              // Ignore canvas export security errors if any
            }
          }
        }
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException' || cancelled) {
          return
        }
        console.error(`Failed to render PDF page ${pageNum}:`, err)
        if (!cancelled) {
          setErrorMsg(err?.message || '页面渲染失败')
          setLoading(false)
        }
      }
    }

    renderPage()

    return () => {
      cancelled = true
      if (currentRenderTask) {
        try {
          currentRenderTask.cancel()
        } catch {}
      }
    }
  }, [bookId, pageNum, pdfZoom, fitMode, isDouble])

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center select-none overflow-hidden rounded-xl transition-all"
      style={{
        ...pdfFilterStyle,
        minHeight: '260px',
      }}
    >
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-current/[0.04] backdrop-blur-[1px] rounded-xl z-10 transition-opacity">
          <Loader2 className="w-7 h-7 animate-spin text-blue-500 mb-2 opacity-80" />
          <span className="text-xs font-mono opacity-60">高保真排版渲染中... P.{pageNum}</span>
        </div>
      )}

      {errorMsg ? (
        <div className="p-8 text-center flex flex-col items-center justify-center space-y-2">
          <AlertCircle className="w-8 h-8 text-amber-500 opacity-80" />
          <p className="text-xs text-red-500 font-medium">第 {pageNum} 页排版解析失败</p>
          <span className="text-[11px] opacity-60 font-mono">{errorMsg}</span>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          className={`shadow-md rounded-lg max-w-full transition-opacity duration-300 ${
            loading ? 'opacity-20' : 'opacity-100'
          }`}
        />
      )}
    </div>
  )
}
