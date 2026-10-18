import React, { useRef, useEffect } from 'react';
import { Loader2, Sparkles, MessageSquarePlus, CheckCircle2 } from 'lucide-react';
import type { CopilotResponse, ChatMessage } from '../types';
import { renderFormattedMarkdown } from '../helpers';
import { useTokenStream } from '../hooks/useTokenStream';

interface CopilotMessageStreamProps {
  question?: string;
  response: CopilotResponse | null;
  messages?: ChatMessage[];
  loading: boolean;
  savedNotice: boolean;
  onSaveAsNote: () => void;
  onJumpToCitation?: (chapterIndex: number, paragraphIndex: number) => void;
  isDark: boolean;
}

export const CopilotMessageStream: React.FC<CopilotMessageStreamProps> = ({
  question,
  response,
  messages = [],
  loading,
  savedNotice,
  onSaveAsNote,
  onJumpToCitation,
  isDark,
}) => {
  const streamBottomRef = useRef<HTMLDivElement | null>(null);

  // 挂载 Token 吐字动画（仅针对最新响应）
  const { displayedText, isTyping } = useTokenStream(
    response?.content || '',
    Boolean(response?.content)
  );

  // 吐字过程中平滑自动滚动到底部
  useEffect(() => {
    if (isTyping || loading) {
      streamBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayedText, isTyping, loading, messages.length]);

  const hasHistory = messages.length > 0;

  return (
    <div className="space-y-4">
      {/* 多轮会话历史渲染 */}
      {hasHistory ? (
        messages.map((m, idx) => {
          if (m.role === 'user') {
            return (
              <div key={m.id || idx} className="flex justify-end">
                <div
                  className={`max-w-[85%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-xs sm:text-sm shadow-xs ${
                    isDark ? 'bg-brand-600 text-white' : 'bg-slate-900 text-white'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            );
          }

          const isLastAssistant = idx === messages.length - 1;
          const textToShow = isLastAssistant && isTyping ? displayedText : m.content;

          return (
            <div
              key={m.id || idx}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isDark
                  ? 'bg-[#1e1e20] border-white/10 text-slate-200 shadow-sm'
                  : 'bg-white border-slate-200/90 text-slate-800 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-current/8 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <h3 className="text-xs sm:text-sm font-bold truncate">
                    {m.title || 'AI 伴读推演'}
                  </h3>
                </div>
                {isLastAssistant && (
                  <button
                    type="button"
                    onClick={onSaveAsNote}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 shrink-0 transition-colors cursor-pointer ${
                      savedNotice
                        ? 'bg-emerald-500 text-white'
                        : isDark
                        ? 'bg-white/8 text-slate-300 hover:bg-white/15'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {savedNotice ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>已保存</span>
                      </>
                    ) : (
                      <>
                        <MessageSquarePlus className="w-3.5 h-3.5" />
                        <span>存为想法</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="text-xs sm:text-sm leading-relaxed select-text space-y-2">
                {renderFormattedMarkdown(textToShow, isDark)}
                {isLastAssistant && isTyping && (
                  <span className="inline-block w-1.5 h-4 bg-brand-500 dark:bg-brand-400 animate-pulse ml-0.5 align-middle" />
                )}
              </div>

              {m.citations && m.citations.length > 0 && !(isLastAssistant && isTyping) && (
                <div className="mt-4 pt-3 border-t border-current/8 space-y-2 text-xs">
                  <div className="text-[11px] font-semibold text-slate-400">
                    📚 依据出处（点击直达原文）：
                  </div>
                  <div className="space-y-1.5">
                    {m.citations.map((c, cIdx) => (
                      <div
                        key={cIdx}
                        onClick={() => onJumpToCitation?.(c.chapter_index, c.paragraph_index)}
                        className={`p-2 rounded-xl border text-[11px] transition-all cursor-pointer ${
                          isDark
                            ? 'bg-black/30 border-white/5 hover:border-brand-500/50'
                            : 'bg-slate-50 border-slate-200/60 hover:border-brand-500/60'
                        }`}
                      >
                        <span className="font-semibold text-brand-600 dark:text-brand-400">
                          第 {c.chapter_index + 1} 章 · {c.chapter_title}
                        </span>
                        <p className="text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                          {c.snippet}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })
      ) : (
        <>
          {question && question.trim() && (
            <div className="flex justify-end">
              <div
                className={`max-w-[85%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-xs sm:text-sm shadow-xs ${
                  isDark ? 'bg-brand-600 text-white' : 'bg-slate-900 text-white'
                }`}
              >
                <p className="leading-relaxed whitespace-pre-wrap">{question}</p>
              </div>
            </div>
          )}

          {response && !loading && (
            <div
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                isDark
                  ? 'bg-[#1e1e20] border-white/10 text-slate-200 shadow-sm'
                  : 'bg-white border-slate-200/90 text-slate-800 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-current/8 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <h3 className="text-xs sm:text-sm font-bold truncate">
                    {response.title || 'AI 伴读推演'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={onSaveAsNote}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 shrink-0 transition-colors cursor-pointer ${
                    savedNotice
                      ? 'bg-emerald-500 text-white'
                      : isDark
                      ? 'bg-white/8 text-slate-300 hover:bg-white/15'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {savedNotice ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>已保存</span>
                    </>
                  ) : (
                    <>
                      <MessageSquarePlus className="w-3.5 h-3.5" />
                      <span>存为想法</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-xs sm:text-sm leading-relaxed select-text space-y-2">
                {renderFormattedMarkdown(displayedText, isDark)}
                {isTyping && (
                  <span className="inline-block w-1.5 h-4 bg-brand-500 dark:bg-brand-400 animate-pulse ml-0.5 align-middle" />
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* 加载等待动画 */}
      {loading && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs ${
            isDark ? 'bg-white/5 border-white/8 text-slate-300' : 'bg-slate-50 border-slate-200/80 text-slate-600'
          }`}
        >
          <Loader2 className="w-4 h-4 text-brand-500 animate-spin shrink-0" />
          <span>正在结合会话记忆与全书上下文推演分析...</span>
        </div>
      )}

      <div ref={streamBottomRef} />
    </div>
  );
};
