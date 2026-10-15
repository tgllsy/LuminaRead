import React from 'react'
import { SourceListItem } from './SourceListItem'
import type { BookSourceConfig } from '../types'

interface SourceListProps {
  sources: BookSourceConfig[]
  activeId?: string
  loading: boolean
  onSelect: (id: string) => void
}

export const SourceList: React.FC<SourceListProps> = ({
  sources,
  activeId,
  loading,
  onSelect,
}) => {
  return (
    <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/70 p-3 space-y-2 md:overflow-y-auto">
      {loading && (
        <div className="text-xs text-slate-500 p-4">正在加载书源配置...</div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2">
        {sources.map((src) => (
          <SourceListItem
            key={src.id}
            source={src}
            isActive={src.id === activeId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}
