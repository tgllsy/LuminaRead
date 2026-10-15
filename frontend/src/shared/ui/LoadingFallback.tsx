import React from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingFallbackProps {
  message?: string
  fullScreen?: boolean
}

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  message = '正在加载模块...',
  fullScreen = false,
}) => {
  const containerClass = fullScreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs'
    : 'flex flex-col items-center justify-center py-16 px-4 w-full'

  return (
    <div className={containerClass}>
      <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-100/90 border border-slate-200/60 shadow-2xs">
        <Loader2 className="w-4 h-4 animate-spin text-[#1b88ee]" />
        <span className="text-xs font-medium text-slate-600">{message}</span>
      </div>
    </div>
  )
}
