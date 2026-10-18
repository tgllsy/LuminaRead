import React, { useMemo } from 'react';
import type { CopilotResponse, CognitiveMode, AICopilotModalProps, CharacterNode, ChatMessage } from '../types';
import { CopilotMessageStream } from './CopilotMessageStream';
import { CopilotRecapTab } from './CopilotRecapTab';
import { CopilotCockpitInput } from './CopilotCockpitInput';
import { DEFAULT_HEURISTIC_CHIPS } from '../constants';

interface CopilotStudioRightPaneProps {
  cognitiveMode: CognitiveMode;
  book: AICopilotModalProps['book'];
  currentChapterTitle: string;
  effectiveAnchorText: string;
  loading: boolean;
  response: CopilotResponse | null;
  messages?: ChatMessage[];
  onClearSession?: () => void;
  savedNotice: boolean;
  onSaveAsNote: () => void;
  onJumpToCitation?: (chapterIndex: number, paragraphIndex: number) => void;
  recapData: any;
  recapLoading: boolean;
  recapError: string | null;
  selectedChar: CharacterNode | null;
  onSelectChar: (char: CharacterNode | null) => void;
  onRetryRecap: () => void;
  questionInput: string;
  onQuestionInputChange: (val: string) => void;
  onSubmitQuestion: (prompt?: string) => void;
  lastUserQuestion?: string;
  isDark: boolean;
}

export const CopilotStudioRightPane: React.FC<CopilotStudioRightPaneProps> = ({
  cognitiveMode,
  book,
  currentChapterTitle,
  effectiveAnchorText,
  loading,
  response,
  messages,
  onClearSession,
  savedNotice,
  onSaveAsNote,
  onJumpToCitation,
  recapData,
  recapLoading,
  recapError,
  selectedChar,
  onSelectChar,
  onRetryRecap,
  questionInput,
  onQuestionInputChange,
  onSubmitQuestion,
  lastUserQuestion,
  isDark,
}) => {
  // 启发式追问胶囊：优先使用 AI 回复自带的延伸追问，其次使用预置的精简芯片
  const heuristicChips = useMemo(() => {
    if (response?.follow_ups && response.follow_ups.length > 0) {
      return response.follow_ups.map((q: string) => (q.startsWith('⚡') ? q : `⚡ ${q}`));
    }
    return DEFAULT_HEURISTIC_CHIPS;
  }, [response?.follow_ups]);

  const cleanContextPreview = effectiveAnchorText.trim().slice(0, 120);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#18181b] select-text">
      {/* 滚动消息主体 */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 no-scrollbar">
        {cognitiveMode === 'causal_graph' ? (
          <CopilotRecapTab
            recapData={recapData}
            recapLoading={recapLoading}
            recapError={recapError}
            onRetry={onRetryRecap}
            selectedChar={selectedChar}
            onSelectChar={onSelectChar}
            isDark={isDark}
          />
        ) : (
          <>
            {/* 顶部的当前选段上下文引用小条与新对话按钮 */}
            {cleanContextPreview && (
              <div
                className={`flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl border text-xs leading-relaxed transition-colors ${
                  isDark
                    ? 'bg-white/5 border-white/8 text-slate-400'
                    : 'bg-slate-50 border-slate-200/80 text-slate-600'
                }`}
              >
                <div className="min-w-0 flex-1 truncate">
                  <span className="font-semibold text-slate-500 dark:text-slate-400 mr-1.5">
                    📖 当前聚焦：
                  </span>
                  <span>{cleanContextPreview}...</span>
                </div>
                {onClearSession && messages && messages.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearSession}
                    className="shrink-0 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-500 hover:text-brand-500 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                    title="开启新话题探讨（清空当前多轮会话记录）"
                  >
                    <span>新话题</span>
                  </button>
                )}
              </div>
            )}

            {/* 核心对话流与流式 Token 吐字输出 */}
            <CopilotMessageStream
              question={lastUserQuestion}
              response={response}
              messages={messages}
              loading={loading}
              savedNotice={savedNotice}
              onSaveAsNote={onSaveAsNote}
              onJumpToCitation={onJumpToCitation}
              isDark={isDark}
            />
          </>
        )}
      </div>

      {/* 底部现代化自适应输入框 */}
      <CopilotCockpitInput
        input={questionInput}
        setInput={onQuestionInputChange}
        onSend={(prompt) => onSubmitQuestion(prompt)}
        loading={loading}
        cognitiveMode={cognitiveMode}
        chips={heuristicChips}
        isDark={isDark}
      />
    </div>
  );
};
