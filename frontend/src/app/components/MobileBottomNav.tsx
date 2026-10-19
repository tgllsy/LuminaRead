import React, { useState } from 'react'
import {
  BookOpen,
  Compass,
  Headphones,
  Highlighter,
  User,
  BarChart3,
  SlidersHorizontal,
  Search,
  Upload,
} from 'lucide-react'
import type { NavPage } from './DesktopHeader'
import { useTtsStore } from '../../stores/ttsStore'
import { BottomSheet } from '../../shared/ui'

interface MobileBottomNavProps {
  activePage: NavPage
  onSelectPage: (page: NavPage) => void
  onOpenSearch?: () => void
  onTriggerUpload?: () => void
}

const MobileQuickHubSheet: React.FC<{
  isOpen: boolean
  onClose: () => void
  onSelectPage: (page: NavPage) => void
  onOpenSearch?: () => void
  onTriggerUpload?: () => void
}> = ({ isOpen, onClose, onSelectPage, onOpenSearch, onTriggerUpload }) => {
  const actions = [
    {
      title: '阅读统计',
      desc: '时长与热力图',
      icon: <BarChart3 className="w-4.5 h-4.5" />,
      badgeCls: 'bg-blue-500/10 text-[#1b88ee]',
      onClick: () => { onClose(); onSelectPage('stats') },
    },
    {
      title: '书源中心',
      desc: '镜像与代理配置',
      icon: <SlidersHorizontal className="w-4.5 h-4.5" />,
      badgeCls: 'bg-amber-500/10 text-amber-600',
      onClick: () => { onClose(); onSelectPage('sources') },
    },
    {
      title: '全文秒搜',
      desc: '跨书段落级检索',
      icon: <Search className="w-4.5 h-4.5" />,
      badgeCls: 'bg-purple-500/10 text-purple-600',
      onClick: () => { onClose(); onOpenSearch?.() },
    },
    {
      title: '本地导入',
      desc: 'EPUB/PDF/MOBI/TXT',
      icon: <Upload className="w-4.5 h-4.5" />,
      badgeCls: 'bg-emerald-500/10 text-emerald-600',
      onClick: () => { onClose(); onTriggerUpload?.() },
    },
  ]

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="阅境 · 单手快捷与个人中心"
      subtitle="符合大拇指热区的全功能控制中心"
    >
      <div className="p-4 grid grid-cols-2 gap-2.5">
        {actions.map((act) => (
          <button
            key={act.title}
            type="button"
            onClick={act.onClick}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/70 border-[0.5px] border-slate-200/80 text-left transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] cursor-pointer"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${act.badgeCls}`}>
              {act.icon}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900">{act.title}</div>
              <div className="text-[10px] text-slate-500 truncate">{act.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activePage,
  onSelectPage,
  onOpenSearch,
  onTriggerUpload,
}) => {
  const [hubOpen, setHubOpen] = useState(false)
  const isTtsPlaying = useTtsStore((s) => s.audioStatus.playing)
  const isTtsActive = useTtsStore((s) => s.audioStatus.active)

  const navItems = [
    { key: 'shelf', label: '书架', icon: <BookOpen className="w-5 h-5" />, isActive: activePage === 'shelf', onClick: () => onSelectPage('shelf') },
    { key: 'discovery', label: '找书', icon: <Compass className="w-5 h-5" />, isActive: activePage === 'discovery', onClick: () => onSelectPage('discovery') },
    {
      key: 'tts',
      label: '听书',
      icon: (
        <div className="relative">
          <Headphones className={`w-5 h-5 ${isTtsPlaying ? 'animate-pulse text-amber-500' : ''}`} />
          {isTtsActive && <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />}
        </div>
      ),
      isActive: activePage === 'tts',
      onClick: () => onSelectPage('tts'),
    },
    { key: 'notes', label: '笔记', icon: <Highlighter className="w-5 h-5" />, isActive: activePage === 'notes', onClick: () => onSelectPage('notes') },
    { key: 'hub', label: '我的', icon: <User className="w-5 h-5" />, isActive: activePage === 'stats' || activePage === 'sources' || hubOpen, onClick: () => setHubOpen(true) },
  ]

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 liquid-glass border-t-[0.5px] border-slate-200/80 px-3 pt-1.5 pb-[max(0.55rem,env(safe-area-inset-bottom,0px))] flex items-center justify-around text-xs select-none">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={item.onClick}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1 rounded-xl transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97] cursor-pointer ${
              item.isActive ? 'text-[#1b88ee] font-bold' : 'text-slate-400 hover:text-slate-800'
            }`}
          >
            {item.icon}
            <span className="text-[10px] leading-tight">{item.label}</span>
          </button>
        ))}
      </nav>

      <MobileQuickHubSheet
        isOpen={hubOpen}
        onClose={() => setHubOpen(false)}
        onSelectPage={onSelectPage}
        onOpenSearch={onOpenSearch}
        onTriggerUpload={onTriggerUpload}
      />
    </>
  )
}
