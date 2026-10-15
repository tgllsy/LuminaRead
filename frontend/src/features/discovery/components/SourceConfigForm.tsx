import React from 'react'
import { Server, RefreshCw, CheckCircle2, ShieldCheck, Zap } from 'lucide-react'
import { SourceZLibAuth } from './SourceZLibAuth'
import type { BookSourceConfig } from '../types'

interface SourceConfigFormProps {
  activeSource: BookSourceConfig
  testingId: string | null
  testFeedback: Record<string, string>
  saveMessage: string
  asPage?: boolean
  onUpdateField: (patch: Partial<BookSourceConfig>) => void
  onUpdateAuthField: (key: string, val: string) => void
  onTestConnectivity: (src: BookSourceConfig) => void
  onSave: () => void
  onClose: () => void
}

export const SourceConfigForm: React.FC<SourceConfigFormProps> = ({
  activeSource,
  testingId,
  testFeedback,
  saveMessage,
  asPage,
  onUpdateField,
  onUpdateAuthField,
  onTestConnectivity,
  onSave,
  onClose,
}) => {
  return (
    <div className="flex-1 p-4 sm:p-6 md:overflow-y-auto space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              {activeSource.name}
            </h3>
            <span className="px-2 py-0.5 text-[11px] rounded bg-blue-50 text-blue-700 font-mono shrink-0">
              {activeSource.source_type}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {activeSource.description}
          </p>
        </div>

        <label className="inline-flex items-center gap-2 cursor-pointer select-none shrink-0">
          <input
            type="checkbox"
            checked={activeSource.enabled}
            onChange={(e) => onUpdateField({ enabled: e.target.checked })}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
          />
          <span className="text-xs font-medium text-slate-700">启用该书源</span>
        </label>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>主镜像站地址 (Base Mirror URL)</span>
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={activeSource.base_url}
            onChange={(e) => onUpdateField({ base_url: e.target.value })}
            placeholder="https://singlelogin.re"
            className="flex-1 min-w-0 px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-blue-500 focus:outline-none font-mono"
          />
          <button
            onClick={() => onTestConnectivity(activeSource)}
            disabled={testingId === activeSource.id}
            className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 shrink-0 ${
                testingId === activeSource.id ? 'animate-spin text-blue-600' : ''
              }`}
            />
            <span>一键连通性测速</span>
          </button>
        </div>

        {activeSource.mirror_urls.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400">备选镜像：</span>
            {activeSource.mirror_urls.map((mUrl) => (
              <button
                key={mUrl}
                type="button"
                onClick={() => onUpdateField({ base_url: mUrl })}
                className={`text-[11px] px-2 py-0.5 rounded border font-mono cursor-pointer ${
                  activeSource.base_url === mUrl
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {mUrl}
              </button>
            ))}
          </div>
        )}

        {testFeedback[activeSource.id] && (
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{testFeedback[activeSource.id]}</span>
          </div>
        )}
      </div>

      {activeSource.source_type === 'zlibrary' && (
        <SourceZLibAuth
          authConfig={activeSource.auth_config}
          onAuthChange={onUpdateAuthField}
        />
      )}

      {activeSource.source_type === 'annas_archive' && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
          <label className="block text-xs font-semibold text-slate-800">
            Anna&apos;s Archive 会员快速下载密钥 (可选 API Key)
          </label>
          <input
            type="text"
            value={activeSource.auth_config.api_key || ''}
            onChange={(e) => onUpdateAuthField('api_key', e.target.value)}
            placeholder="留空则默认使用免账号 LibGen / 公开直链通道"
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>本地网络代理 (HTTP / SOCKS5 Proxy，可选)</span>
        </label>
        <input
          type="text"
          value={activeSource.proxy_url || ''}
          onChange={(e) => onUpdateField({ proxy_url: e.target.value })}
          placeholder="例如 http://127.0.0.1:7890 或 socks5://127.0.0.1:1080（留空则直连）"
          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
        />
      </div>

      <div className="pt-3 flex items-center justify-between border-t border-slate-100">
        <span className="text-xs text-emerald-600 font-medium">
          {saveMessage}
        </span>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            {asPage ? '返回找书' : '关闭'}
          </button>
          <button
            onClick={onSave}
            className="px-5 py-2 rounded-lg bg-[#1b88ee] hover:bg-[#1677d2] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>保存当前书源配置</span>
          </button>
        </div>
      </div>
    </div>
  )
}
