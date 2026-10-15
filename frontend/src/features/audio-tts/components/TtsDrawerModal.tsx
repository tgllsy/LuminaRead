import React from 'react'
import { X } from 'lucide-react'

interface TtsDrawerModalProps {
  isOpen: boolean
  title: React.ReactNode
  onClose: () => void
  surfaceCls: string
  pillIdleCls: string
  children: React.ReactNode
}

export const TtsDrawerModal: React.FC<TtsDrawerModalProps> = ({
  isOpen,
  title,
  onClose,
  surfaceCls,
  pillIdleCls,
  children,
}) => {
  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      className="absolute inset-0 z-30 bg-black/30 backdrop-blur-[1px] flex flex-col justify-end animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full rounded-t-3xl border-t p-5 pb-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))] space-y-4 max-h-[72%] flex flex-col overflow-hidden ${surfaceCls}`}
      >
        <div className="flex items-center justify-between shrink-0">
          <h3 className="text-sm font-bold flex items-center gap-1.5">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-full ${pillIdleCls}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
