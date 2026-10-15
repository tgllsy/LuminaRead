import React from 'react'
import type { SelectionNoteEditorProps } from '../types'

export const SelectionNoteEditor: React.FC<SelectionNoteEditorProps> = ({
  note,
  setNote,
  isDark,
  pillBtnClass,
  onClose,
  onSave,
}) => {
  return (
    <div
      className={`pt-2.5 space-y-2 border-t ${
        isDark ? 'border-white/8' : 'border-slate-100'
      }`}
    >
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="记录此刻的想法、批注或读书笔记..."
        rows={2}
        className={`w-full rounded-2xl border p-3 text-xs focus:border-[#1b88ee] focus:outline-none ${
          isDark
            ? 'bg-[#2c2c2e] border-white/10 text-slate-100 placeholder-slate-500'
            : 'bg-[#f7f8fa] border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white'
        }`}
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium ${pillBtnClass}`}
        >
          收起
        </button>
        <button
          type="button"
          onClick={onSave}
          className="px-4 py-1.5 rounded-full bg-[#1b88ee] hover:bg-[#1477d6] text-white text-xs font-semibold shadow-2xs"
        >
          保存想法
        </button>
      </div>
    </div>
  )
}
