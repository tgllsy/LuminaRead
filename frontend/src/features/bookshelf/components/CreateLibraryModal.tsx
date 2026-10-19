import React, { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { ReadingLibrary, LibraryFormData } from '../types'
import { LIBRARY_PRESET_ICONS, LIBRARY_PRESET_COLORS } from '../constants'
import { BottomSheet } from '../../../shared/ui'

interface CreateLibraryModalProps {
  library?: ReadingLibrary | null
  onClose: () => void
  onSave: (data: LibraryFormData) => Promise<unknown>
  onDelete?: (e: React.MouseEvent, lib: ReadingLibrary) => void
}

const LibraryAppearancePicker: React.FC<{
  icon: string
  color: string
  onSelectIcon: (icon: string) => void
  onSelectColor: (color: string) => void
}> = ({ icon, color, onSelectIcon, onSelectColor }) => (
  <>
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">挑选图标</label>
      <div className="flex flex-wrap gap-2">
        {LIBRARY_PRESET_ICONS.map((i) => (
          <button
            key={i} type="button" onClick={() => onSelectIcon(i)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer active:scale-[0.97] ${
              icon === i ? 'bg-[#1b88ee]/15 ring-2 ring-[#1b88ee]' : 'bg-slate-100 hover:bg-slate-200'
            }`}
          >
            {i}
          </button>
        ))}
      </div>
    </div>

    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">主题色</label>
      <div className="flex items-center gap-2.5">
        {LIBRARY_PRESET_COLORS.map((c) => (
          <button
            key={c} type="button" onClick={() => onSelectColor(c)}
            className={`w-6 h-6 rounded-full transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer active:scale-[0.97] ${
              color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-400' : 'hover:scale-110'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  </>
)

export const CreateLibraryModal: React.FC<CreateLibraryModalProps> = ({
  library, onClose, onSave, onDelete,
}) => {
  const [name, setName] = useState(library?.name || '')
  const [description, setDescription] = useState(library?.description || '')
  const [icon, setIcon] = useState(library?.icon || '📚')
  const [color, setColor] = useState(library?.color || '#1b88ee')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || submitting) return
    setSubmitting(true)
    try {
      await onSave({ id: library?.id, name: name.trim(), description: description.trim(), icon, color })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <BottomSheet isOpen={true} onClose={onClose} title={library ? '编辑阅读书库' : '新建阅读书库'} maxWidthClass="md:max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 pb-2 select-none">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">书库名称</label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="例如: 技术架构、历史档案..." required
            className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1b88ee]/20 focus:border-[#1b88ee]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">书库描述 (可选)</label>
          <input
            type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="简要描述此分类用途..."
            className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1b88ee]/20 focus:border-[#1b88ee]"
          />
        </div>

        <LibraryAppearancePicker icon={icon} color={color} onSelectIcon={setIcon} onSelectColor={setColor} />

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          {library && !library.is_default && onDelete ? (
            <button
              type="button" onClick={(e) => { onDelete(e, library); onClose() }}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 font-semibold cursor-pointer transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.97]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>删除</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button" onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer active:scale-[0.97]"
            >
              取消
            </button>
            <button
              type="submit" disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#1b88ee] hover:bg-[#1677d2] rounded-xl shadow-xs transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] cursor-pointer active:scale-[0.97]"
            >
              {submitting ? '保存中...' : '确认'}
            </button>
          </div>
        </div>
      </form>
    </BottomSheet>
  )
}
