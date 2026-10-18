import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import type { IntertextualBookComparison } from '../types';

interface CopilotIntertextualCardProps {
  comparison: IntertextualBookComparison;
  onExploreTopic?: (prompt: string) => void;
  isDark?: boolean;
}

export const CopilotIntertextualCard: React.FC<CopilotIntertextualCardProps> = ({
  comparison,
  onExploreTopic,
  isDark = false,
}) => {
  const [showTable, setShowTable] = useState(false);

  return (
    <div
      className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
        isDark
          ? 'bg-indigo-950/25 border-indigo-800/50 text-slate-200'
          : 'bg-indigo-50/50 border-indigo-200/60 text-slate-800'
      }`}
    >
      <div className="flex items-center justify-between font-bold text-xs">
        <span className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
          <Layers className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          跨书互文关联论述：
        </span>
        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono bg-indigo-100/60 dark:bg-indigo-900/40 px-2 py-0.5 rounded-md">
          {comparison.relatedAuthor} · 《{comparison.relatedBookTitle}》
        </span>
      </div>

      <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
        {comparison.quote}
      </p>

      {/* 对比分析表展开折叠 */}
      <div>
        <button
          type="button"
          onClick={() => setShowTable((prev) => !prev)}
          className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold cursor-pointer hover:underline flex items-center gap-1 pt-0.5"
        >
          <span>{showTable ? '收起两书论点对比分析表' : '查看两书论点对比分析表 →'}</span>
          {showTable ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showTable && (
          <div className="mt-2.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 overflow-hidden bg-white/90 dark:bg-slate-900/90 text-[10px]">
            <div className="grid grid-cols-3 bg-indigo-100/50 dark:bg-indigo-950/50 p-2 font-bold text-slate-700 dark:text-slate-300 border-b border-indigo-200/60 dark:border-indigo-800/40">
              <span>核心维度</span>
              <span>本书论述</span>
              <span>关联书对抗论点</span>
            </div>
            <div className="grid grid-cols-3 p-2 gap-2 text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-indigo-800 dark:text-indigo-300">{comparison.dimension}</span>
              <span>{comparison.currentBookView || comparison.currentBookPerspective}</span>
              <span className="text-amber-700 dark:text-amber-400">{comparison.relatedBookView || comparison.relatedBookPerspective}</span>
            </div>
          </div>
        )}
      </div>

      {/* 底部探讨按钮 */}
      {onExploreTopic && (
        <div className="pt-1 flex items-center justify-end">
          <button
            type="button"
            onClick={() =>
              onExploreTopic(
                `对比《${comparison.relatedBookTitle}》关于“${comparison.dimension}”与本书的核心分歧`
              )
            }
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-[10px] flex items-center gap-1 transition-colors shadow-2xs"
          >
            <Sparkles className="w-3 h-3" />
            发掘深度互文分歧
          </button>
        </div>
      )}
    </div>
  );
};
