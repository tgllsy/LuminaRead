import React, { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: React.ReactNode
  subtitle?: React.ReactNode
  children: React.ReactNode
  maxWidthClass?: string
  isDark?: boolean
  zIndexClass?: string
}

function useBottomSheetGesture(isOpen: boolean, onClose: () => void) {
  const [dragOffsetY, setDragOffsetY] = useState(0)
  const touchStartYRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setDragOffsetY(0)
      return
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) touchStartYRef.current = e.touches[0].clientY
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null || e.touches.length !== 1) return
    const deltaY = e.touches[0].clientY - touchStartYRef.current
    if (deltaY > 0) setDragOffsetY(deltaY)
  }

  const handleTouchEnd = () => {
    const shouldDismiss = dragOffsetY > 88
    setDragOffsetY(0)
    touchStartYRef.current = null
    if (shouldDismiss) onClose()
  }

  return { dragOffsetY, handleTouchStart, handleTouchMove, handleTouchEnd }
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = 'md:max-w-md',
  isDark = false,
  zIndexClass = 'z-[60]',
}) => {
  const { dragOffsetY, handleTouchStart, handleTouchMove, handleTouchEnd } =
    useBottomSheetGesture(isOpen, onClose)

  if (!isOpen) return null

  const surfaceCls = isDark
    ? 'bg-[#1c1c1e]/95 text-[#f2f2f7] border-white/[0.12] shadow-[0_-12px_40px_rgba(0,0,0,0.55)]'
    : 'bg-white/95 text-slate-900 border-slate-200/80 shadow-[0_-10px_36px_rgba(15,23,42,0.12)]'

  return (
    <div
      data-no-hud-toggle="true"
      onClick={onClose}
      className={`fixed inset-0 ${zIndexClass} flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-950/45 backdrop-blur-xs select-none animate-in fade-in duration-150`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={dragOffsetY > 0 ? { transform: `translateY(${dragOffsetY}px)`, transition: 'none' } : undefined}
        className={`w-full ${maxWidthClass} rounded-t-3xl md:rounded-3xl border-t-[0.5px] md:border-[0.5px] backdrop-blur-2xl overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] max-h-[90dvh] flex flex-col ${surfaceCls}`}
      >
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="md:hidden pt-2.5 pb-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none shrink-0"
        >
          <div className={`w-10 h-1 rounded-full ${isDark ? 'bg-white/25' : 'bg-slate-300/90'}`} />
        </div>

        {(title || subtitle) && (
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`flex items-center justify-between px-5 py-3.5 border-b-[0.5px] shrink-0 ${
              isDark ? 'border-white/[0.08]' : 'border-slate-200/70'
            }`}
          >
            <div className="min-w-0 pr-2">
              {title && <div className="text-sm font-bold truncate leading-snug">{title}</div>}
              {subtitle && (
                <p className={`text-[11px] truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] cursor-pointer shrink-0 ${
                isDark ? 'text-slate-400 hover:text-white bg-white/[0.06] hover:bg-white/[0.12]' : 'text-slate-400 hover:text-slate-700 bg-slate-100/80 hover:bg-slate-200/70'
              }`}
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] md:pb-0">
          {children}
        </div>
      </div>
    </div>
  )
}
