import React from 'react'
import { Globe, X } from 'lucide-react'
import { BottomSheet } from '../../../shared/ui/BottomSheet'
import { useSourceSettings } from '../hooks/useSourceSettings'
import { SourceList } from './SourceList'
import { SourceConfigForm } from './SourceConfigForm'
import type { SourceSettingsModalProps } from '../types'

const SourceSettingsHeader: React.FC<{
  asPage: boolean
  onClose: () => void
}> = ({ asPage, onClose }) => (
  <div
    className={
      asPage
        ? 'p-5 sm:p-7 bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl border-[0.5px] border-slate-200/80 shadow-2xs flex items-center justify-between gap-3'
        : 'px-5 py-3.5 sm:px-6 bg-white/90 border-b-[0.5px] border-slate-200/70 flex items-center justify-between gap-3 shrink-0'
    }
  >
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#1b88ee]/10 text-[#1b88ee] flex items-center justify-center shrink-0">
        <Globe className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
          外部书源与代理配置
        </h2>
        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
          配置镜像域名、访问凭证与网络代理
        </p>
      </div>
    </div>
    {asPage ? (
      <button
        type="button"
        onClick={onClose}
        className="px-3.5 py-1.5 rounded-full border-[0.5px] border-slate-200/90 hover:bg-slate-50 text-xs font-semibold text-slate-600 flex items-center gap-1.5 shrink-0 active:scale-[0.97] transition-all cursor-pointer"
      >
        <span>返回找书</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0 active:scale-[0.97] transition-all cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
)

export const SourceSettingsModal: React.FC<SourceSettingsModalProps> = ({
  isOpen,
  onClose,
  asPage = false,
}) => {
  const isEnabled = isOpen || asPage
  const s = useSourceSettings(isEnabled)

  if (!isEnabled) return null

  const innerContent = (
    <div
      className={
        asPage
          ? 'max-w-6xl w-full mx-auto px-4 sm:px-8 py-5 sm:py-8 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] md:pb-12 space-y-5'
          : 'w-full flex-1 min-h-0 flex flex-col overflow-hidden'
      }
    >
      <SourceSettingsHeader asPage={asPage} onClose={onClose} />

      <div
        className={
          asPage
            ? 'bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl border-[0.5px] border-slate-200/80 shadow-2xs flex flex-col md:flex-row overflow-hidden'
            : 'flex-1 min-h-0 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden'
        }
      >
        <SourceList
          sources={s.sources}
          activeId={s.activeSource?.id || s.selectedId}
          loading={s.loading}
          onSelect={s.setSelectedId}
        />

        {s.activeSource && (
          <SourceConfigForm
            activeSource={s.activeSource}
            testingId={s.testingId}
            testFeedback={s.testFeedback}
            saveMessage={s.saveMessage}
            asPage={asPage}
            onUpdateField={s.updateActiveField}
            onUpdateAuthField={s.updateAuthField}
            onTestConnectivity={s.handleTestConnectivity}
            onSave={s.handleSave}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )

  if (asPage) return innerContent

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} maxWidthClass="md:max-w-4xl">
      {innerContent}
    </BottomSheet>
  )
}
