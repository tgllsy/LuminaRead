import React from 'react'
import { BookOpen, Upload, Compass } from 'lucide-react'

interface BookshelfEmptyProps {
  onTriggerUpload: () => void
  onOpenDiscovery: () => void
}

export const BookshelfEmpty: React.FC<BookshelfEmptyProps> = ({
  onTriggerUpload,
  onOpenDiscovery,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4 shadow-2xs">
        <BookOpen className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 mb-1">书架当前没有匹配的书籍</h3>
      <p className="text-xs text-slate-400 max-w-sm mb-6">
        你可以直接拖拽本地 EPUB/PDF 文件到当前页面，或者使用全网搜书一键下载藏书。
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onTriggerUpload}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1b88ee] hover:bg-[#1677d2] text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>上传本地电子书</span>
        </button>
        <button
          type="button"
          onClick={onOpenDiscovery}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5 text-emerald-600" />
          <span>全网搜书</span>
        </button>
      </div>
    </div>
  )
}
