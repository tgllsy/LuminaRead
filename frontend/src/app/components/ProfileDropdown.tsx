import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, BarChart3, SlidersHorizontal, BookMarked } from 'lucide-react'

interface ProfileDropdownProps {
  onOpenStats: () => void
  onOpenSources: () => void
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  onOpenStats,
  onOpenSources,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 cursor-pointer text-slate-700 transition-all group select-none"
        title="个人中心与偏好设置 (低频收纳)"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-[10px] shadow-2xs">
          <BookMarked className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-bold text-slate-800 group-hover:text-[#1b88ee] transition-colors shrink-0 whitespace-nowrap">
          我的
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-1.5 z-50 animate-in fade-in-0 zoom-in-95">
          <div className="px-3.5 py-2 border-b border-slate-100">
            <p className="text-[11px] font-bold text-slate-800">阅境 · 个人工作台</p>
            <p className="text-[10px] text-slate-400">管理统计报告与书源偏好</p>
          </div>

          <div className="p-1 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                onOpenStats()
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-[#1b88ee] hover:bg-blue-50/60 rounded-xl transition-colors cursor-pointer text-left"
            >
              <BarChart3 className="w-4 h-4 text-brand-500 text-[#1b88ee]" />
              <span>阅读记录与热力图</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                onOpenSources()
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-[#1b88ee] hover:bg-blue-50/60 rounded-xl transition-colors cursor-pointer text-left"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-500" />
              <span>书源镜像与代理配置</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
