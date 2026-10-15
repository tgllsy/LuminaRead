import React from 'react'
import type { CharacterNode } from '../types'

interface CopilotNodeDetailCardProps {
  selectedChar: CharacterNode | null
  isDark: boolean
}

export const CopilotNodeDetailCard: React.FC<CopilotNodeDetailCardProps> = ({
  selectedChar,
  isDark,
}) => {
  return (
    <div
      className={`lg:col-span-2 rounded-2xl p-4 border flex flex-col justify-between ${
        isDark
          ? 'bg-[#1c1c1e] border-white/8'
          : 'bg-white border-slate-200/80 shadow-2xs'
      }`}
    >
      {selectedChar ? (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#1b88ee]/12 text-[#1b88ee] font-semibold">
                第 {selectedChar.firstSeenChapter + 1} 章解锁
              </span>
              <span
                className={`text-[11px] ${
                  isDark ? 'text-slate-400' : 'text-slate-400'
                }`}
              >
                {selectedChar.role}
              </span>
            </div>
            <h4 className="text-base font-bold mt-2">{selectedChar.name}</h4>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(Array.isArray(selectedChar.traits) ? selectedChar.traits : []).map((t) => (
              <span
                key={t}
                className={`px-2.5 py-0.5 rounded-full text-[11px] ${
                  isDark
                    ? 'bg-[#2c2c2e] text-slate-300'
                    : 'bg-[#f2f3f5] text-slate-600'
                }`}
              >
                {t}
              </span>
            ))}
          </div>

          <div
            className={`p-3 rounded-xl space-y-1 ${
              isDark ? 'bg-[#25262b]' : 'bg-[#f7f8fa]'
            }`}
          >
            <div
              className={`text-[11px] font-bold ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              当前已读进度轨迹：
            </div>
            <p
              className={`text-xs leading-relaxed ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              {selectedChar.statusUpToNow || '已在当前阅读进度内出场并推动叙事发展。'}
            </p>
          </div>

          <div className="space-y-1.5">
            <div
              className={`text-[11px] font-bold ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              前文关键记录：
            </div>
            <ul
              className={`space-y-1 text-xs leading-relaxed ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              {(Array.isArray(selectedChar.keyEvents) ? selectedChar.keyEvents : []).map((ev) => (
                <li key={ev} className="flex items-start gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1b88ee] mt-1.5 shrink-0" />
                  <span className="line-clamp-2">{ev}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="text-xs text-slate-400 py-8 text-center">
          点击上方图谱节点查看详情
        </div>
      )}
    </div>
  )
}
