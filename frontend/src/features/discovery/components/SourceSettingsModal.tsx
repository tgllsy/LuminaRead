import React, { useEffect } from 'react'
import { Globe, X } from 'lucide-react'
import { useSourceSettings } from '../hooks/useSourceSettings'
import { SourceList } from './SourceList'
import { SourceConfigForm } from './SourceConfigForm'
import type { SourceSettingsModalProps } from '../types'

export const SourceSettingsModal: React.FC<SourceSettingsModalProps> = ({
  isOpen,
  onClose,
  asPage = false,
}) => {
  const isEnabled = isOpen || asPage

  const {
    sources,
    selectedId,
    setSelectedId,
    activeSource,
    loading,
    testingId,
    testFeedback,
    saveMessage,
    updateActiveField,
    updateAuthField,
    handleSave,
    handleTestConnectivity,
  } = useSourceSettings(isEnabled)

  useEffect(() => {
    if (!isEnabled) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEnabled, onClose])

  if (!isEnabled) return null

  const innerContent = (
    <div
      onClick={(e) => e.stopPropagation()}
      className={
        asPage
          ? 'max-w-6xl w-full mx-auto px-4 sm:px-8 py-5 sm:py-8 pb-24 sm:pb-12 space-y-5'
          : 'bg-white sm:rounded-3xl sm:shadow-2xl sm:border border-slate-200/80 w-full max-w-4xl h-dvh sm:h-auto sm:max-h-[88dvh] flex flex-col overflow-hidden'
      }
    >
      <div
        className={
          asPage
            ? 'p-5 sm:p-7 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3'
            : 'px-5 py-4 sm:px-6 bg-white border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0'
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
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-full border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
          >
            <span>返回找书</span>
          </button>
        ) : (
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div
        className={
          asPage
            ? 'bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row overflow-hidden'
            : 'flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden'
        }
      >
        <SourceList
          sources={sources}
          activeId={activeSource?.id || selectedId}
          loading={loading}
          onSelect={setSelectedId}
        />

        {activeSource && (
          <SourceConfigForm
            activeSource={activeSource}
            testingId={testingId}
            testFeedback={testFeedback}
            saveMessage={saveMessage}
            asPage={asPage}
            onUpdateField={updateActiveField}
            onUpdateAuthField={updateAuthField}
            onTestConnectivity={handleTestConnectivity}
            onSave={handleSave}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )

  if (asPage) return innerContent

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-white sm:bg-slate-950/60 sm:backdrop-blur-sm p-0 sm:p-4"
    >
      {innerContent}
    </div>
  )
}
