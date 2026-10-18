import React from 'react'
import { Plus, MoreHorizontal, Trash2 } from 'lucide-react'
import type { ReadingLibrary } from '../types'

interface LibraryTabBarProps {
  libraries: ReadingLibrary[]
  activeLibraryId: string
  totalBooksCount: number
  onSelectLibrary: (libId: string) => void
  onOpenCreateModal: () => void
  onOpenEditModal: (e: React.MouseEvent, lib: ReadingLibrary) => void
  onDeleteLibrary: (e: React.MouseEvent, lib: ReadingLibrary) => void
}

export const LibraryTabBar: React.FC<LibraryTabBarProps> = ({
  libraries,
  activeLibraryId,
  totalBooksCount,
  onSelectLibrary,
  onOpenCreateModal,
  onOpenEditModal,
  onDeleteLibrary,
}) => {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none py-0.5 [-webkit-overflow-scrolling:touch] min-w-0 flex-1">
      {/* All Libraries Pill */}
      <button
        type="button"
        onClick={() => onSelectLibrary('all')}
        className={`px-3 py-1 sm:px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-[0.97] ${
          activeLibraryId === 'all'
            ? 'bg-slate-900 text-white shadow-xs'
            : 'bg-white border border-slate-200/90 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
        }`}
      >
        <span>全部书库</span>
        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeLibraryId === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
          {totalBooksCount}
        </span>
      </button>


      {/* Individual Custom Libraries */}
      {libraries.map((lib) => {
        const isActive = activeLibraryId === lib.id
        return (
          <div
            key={lib.id}
            onClick={() => onSelectLibrary(lib.id)}
            className={`group relative flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border shrink-0 active:scale-[0.97] ${
              isActive
                ? 'bg-white border-slate-400 text-slate-900 shadow-xs'
                : 'bg-white/80 border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <span>{lib.icon || '📚'}</span>
            <span>{lib.name}</span>
            {typeof lib.book_count === 'number' && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-slate-100 text-slate-800' : 'bg-slate-100 text-slate-500'}`}>
                {lib.book_count}
              </span>
            )}

            {/* Quick Action Trigger for custom libraries */}
            {!lib.is_default && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenEditModal(e, lib)
                }}
                title="编辑书库"
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-[#1b88ee] transition-opacity ml-0.5"
              >
                <MoreHorizontal className="w-3 h-3" />
              </button>
            )}
          </div>
        )
      })}

      {/* Create Library Action */}
      <button
        type="button"
        onClick={onOpenCreateModal}
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-slate-300 text-slate-500 hover:text-slate-800 hover:border-slate-400 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap bg-white/40 shrink-0 active:scale-[0.97]"
      >
        <Plus className="w-3 h-3" />
        <span>新建书库</span>
      </button>
    </div>

  )
}
