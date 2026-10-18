import React, { useRef, useEffect } from 'react';
import { ArrowUp, Loader2, Sparkles } from 'lucide-react';
import { DEFAULT_HEURISTIC_CHIPS } from '../constants';
import type { CognitiveMode } from '../types';

interface CopilotCockpitInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: (customPrompt?: string) => void;
  loading: boolean;
  cognitiveMode?: CognitiveMode;
  chips?: string[];
  placeholder?: string;
  isDark?: boolean;
}

export const CopilotCockpitInput: React.FC<CopilotCockpitInputProps> = ({
  input,
  setInput,
  onSend,
  loading,
  cognitiveMode = 'socratic',
  chips = DEFAULT_HEURISTIC_CHIPS,
  placeholder,
  isDark = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const defaultPlaceholder =
    cognitiveMode === 'socratic'
      ? '向 AI 追问、质疑或要求深入推演...'
      : cognitiveMode === 'intertextual'
      ? '输入问题，发掘跨书思想交锋与互文论据...'
      : '输入问题，探索全书前因后果与人物脉络...';

  // 自动调整输入框高度 (根据内容增长)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && input.trim()) {
        onSend();
      }
    }
  };

  return (
    <div
      className={`p-3 sm:p-4 border-t space-y-2.5 shrink-0 transition-colors ${
        isDark ? 'bg-[#18181b] border-white/8' : 'bg-white border-slate-200/80 shadow-xs'
      }`}
    >
      {/* 启发式追问推荐小胶囊 */}
      {chips.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
          <Sparkles className="w-3 h-3 text-amber-500 shrink-0 ml-0.5" />
          {chips.slice(0, 4).map((chip, idx) => (
            <button
              key={idx}
              type="button"
              disabled={loading}
              onClick={() => onSend(chip.replace(/^⚡\s*/, ''))}
              className={`px-2.5 py-1 rounded-full border text-[11px] shrink-0 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap ${
                isDark
                  ? 'bg-white/5 border-white/10 hover:border-brand-500 text-slate-300 hover:text-white'
                  : 'bg-slate-50 border-slate-200/80 hover:border-brand-500 text-slate-700 hover:text-brand-600'
              }`}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* 弹性自适应多行输入框 */}
      <div
        className={`flex items-end gap-2 rounded-2xl border p-1.5 sm:p-2 transition-all ${
          isDark
            ? 'bg-[#27272a] border-white/10 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500/20'
            : 'bg-slate-50 border-slate-200 focus-within:border-brand-500 focus-within:bg-white focus-within:ring-1 focus-within:ring-brand-500/20'
        }`}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || defaultPlaceholder}
          disabled={loading}
          rows={1}
          className={`flex-1 text-xs sm:text-sm bg-transparent outline-none px-2 py-1 resize-none leading-relaxed min-h-[32px] max-h-[120px] ${
            isDark
              ? 'text-slate-100 placeholder:text-slate-500'
              : 'text-slate-800 placeholder:text-slate-400'
          }`}
        />
        <button
          type="button"
          disabled={loading || !input.trim()}
          onClick={() => onSend()}
          className={`p-2 rounded-xl text-white font-medium text-xs flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:opacity-30 disabled:pointer-events-none shadow-xs ${
            isDark ? 'bg-brand-600 hover:bg-brand-500' : 'bg-slate-900 hover:bg-slate-800'
          }`}
          title="发送推演 (Enter)"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <ArrowUp className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
