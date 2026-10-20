import React, { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
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
  const [useFallbackImg, setUseFallbackImg] = useState(false)

  const fallbackImgUrl = `/api/books/${encodeURIComponent(bookId)}/pdf-page/${pageNum}`

  useEffect(() => {
    let cancelled = false
    let currentRenderTask: any = null

    setLoading(true)
    setUseFallbackImg(false)

    async function renderPage() {
      try {
        const pdfDoc = await getPdfDocument(bookId)
        if (cancelled) return

        const page = await pdfDoc.getPage(pageNum)
        if (cancelled) return

        const unscaledViewport = page.getViewport({ scale: 1.0 })
        const containerWidth = containerRef.current?.parentElement?.clientWidth || window.innerWidth

        let targetScale = 1.0
        if (fitMode === 'page') {
          const availableHeight = Math.max(400, window.innerHeight - 160)
          const availableWidth = isDouble ? (containerWidth / 2) - 16 : Math.min(containerWidth, 900)
          const scaleHeight = availableHeight / unscaledViewport.height
          const scaleWidth = availableWidth / unscaledViewport.width
          targetScale = Math.min(scaleHeight, scaleWidth) * (pdfZoom / 100)
        } else {
          // fit width - fill container horizontally
          const availableWidth = isDouble ? (containerWidth / 2) - 16 : containerWidth
          targetScale = (availableWidth / unscaledViewport.width) * (pdfZoom / 100)
        }

        targetScale = Math.max(0.35, Math.min(targetScale, 3.0))

        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const viewport = page.getViewport({ scale: targetScale * dpr })
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d', { alpha: false })
        if (!ctx) return

        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`

        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        const renderContext = {
          canvasContext: ctx,
          viewport,
        }

        currentRenderTask = page.render(renderContext)
        await currentRenderTask.promise

        if (!cancelled) {
          setLoading(false)
          if (onRenderSuccess) {
            try {
              onRenderSuccess(canvas.toDataURL('image/jpeg', 0.85))
            } catch {}
          }
        }
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException' || cancelled) {
          return
        }
        // Fallback seamlessly to backend rendered image without scaring the user
        console.warn(`PDF.js page ${pageNum} fallback to backend image:`, err?.message || err)
        if (!cancelled) {
          setUseFallbackImg(true)
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
      className="relative flex items-center justify-center select-none overflow-hidden transition-all w-full"
      style={{
        ...pdfFilterStyle,
        minHeight: '220px',
      }}
    >
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-current/[0.03] backdrop-blur-[1px] z-10 transition-opacity">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500 mb-2 opacity-80" />
          <span className="text-[11px] font-mono opacity-60">高保真排版加载中... P.{pageNum}</span>
        </div>
      )}

      {useFallbackImg ? (
        <img
          src={fallbackImgUrl}
          alt={`第 ${pageNum} 页`}
          loading="eager"
          className="w-full h-auto object-contain select-none max-w-full"
          onLoad={() => setLoading(false)}
        />
      ) : (
        <canvas
          ref={canvasRef}
          className={`max-w-full transition-opacity duration-200 ${
            loading ? 'opacity-20' : 'opacity-100'
          }`}
        />
      )}
    </div>
  )
}
