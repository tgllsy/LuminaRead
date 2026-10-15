import React from 'react'
import { getSourceStatusText } from '../helpers'
import type { BookSourceConfig } from '../types'

interface SourceListItemProps {
  source: BookSourceConfig
  isActive: boolean
  onSelect: (id: string) => void
}

export const SourceListItem: React.FC<SourceListItemProps> = ({
  source,
  isActive,
  onSelect,
}) => {
  return (
    <button
      onClick={() => onSelect(source.id)}
      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
        isActive
          ? 'bg-white border-blue-500 shadow-sm ring-1 ring-blue-500/30'
          : 'bg-white/60 border-slate-200/80 hover:bg-white'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-900 line-clamp-1">
          {source.name.split(' ')[0]}
        </span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${
            source.enabled
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              source.enabled ? 'bg-emerald-500' : 'bg-slate-400'
            }`}
          />
          {getSourceStatusText(source)}
        </span>
      </div>
      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
        {source.base_url}
      </p>
    </button>
  )
}
