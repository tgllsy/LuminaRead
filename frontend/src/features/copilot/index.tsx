import React, { useState, useMemo, useEffect } from 'react';
import type { AICopilotModalProps, CopilotChatMode, CognitiveMode } from './types';
import { buildEffectiveAnchorText } from './helpers';
import { useCopilotRecap, useCopilotChat, useCopilotPresets, useCopilotModalSync } from './hooks';
import { CopilotTopNav, CopilotStudioRightPane } from './components';

export const AICopilotModal: React.FC<AICopilotModalProps> = ({
  isOpen,
  onClose,
  book,
  currentChapterIndex,
  currentChapterTitle,
  chapterExcerpt = '',
  theme = 'light',
  initialMode = 'spoiler_free_recap',
  selectedText = '',
  paragraphIndex = 0,
  onSaveInsightAsNote,
  onJumpToCitation,
}) => {
  const isDark = theme === 'dark';
  const [hasRendered, setHasRendered] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setHasRendered(true);
    }
  }, [isOpen]);

  const [cognitiveMode, setCognitiveMode] = useState<CognitiveMode>(
    initialMode === 'spoiler_free_recap' ? 'causal_graph' : 'socratic'
  );

  const defaultChatMode: CopilotChatMode = initialMode === 'spoiler_free_recap' ? 'explain' : initialMode;
  const chat = useCopilotChat(defaultChatMode);
  const { recapData, recapLoading, recapError, selectedChar, setSelectedChar, loadRecap } = useCopilotRecap();
  const { isSaveActionQuery } = useCopilotPresets();

  const effectiveAnchorText = useMemo(
    () => buildEffectiveAnchorText(selectedText, chapterExcerpt, book.title, currentChapterTitle),
    [selectedText, chapterExcerpt, book.title, currentChapterTitle]
  );

  const executeCopilotQuery = useCopilotModalSync({
    isOpen,
    onClose,
    book,
    currentChapterIndex,
    currentChapterTitle,
    paragraphIndex,
    effectiveAnchorText,
    customQuestion: chat.customQuestion,
    initialMode,
    selectedText,
    sendQuery: chat.sendQuery,
    loadRecap,
    setCopilotMode: chat.setCopilotMode,
    setCognitiveMode,
  });

  const handleCognitiveModeChange = (mode: CognitiveMode) => {
    setCognitiveMode(mode);
    if (mode === 'socratic') {
      chat.setCopilotMode('socratic');
      executeCopilotQuery('socratic', effectiveAnchorText);
    } else if (mode === 'intertextual') {
      chat.setCopilotMode('intertextual');
      executeCopilotQuery('intertextual', effectiveAnchorText, `请给出与《${book.title}》相呼应或激烈争鸣的跨书互文著作论据与思想碰撞。`);
    } else if (mode === 'causal_graph') {
      loadRecap(book.id, currentChapterIndex, book.progress?.percentage || 0);
    }
  };

  const handleSubmitQuestion = (prompt?: string) => {
    const q = (prompt || chat.customQuestion).trim();
    if (!q) return;
    if (isSaveActionQuery(q)) {
      chat.saveInsightNote(effectiveAnchorText, onSaveInsightAsNote);
      return;
    }
    chat.setCustomQuestion('');
    chat.setCopilotMode('custom');
    executeCopilotQuery('custom', effectiveAnchorText, q);
  };

  if (!hasRendered && !isOpen) return null;

  return (
    <>
      {/* 移动端窄屏半透明遮罩，大屏自动挤压时不阻挡交互 */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 backdrop-blur-xs md:hidden transition-opacity duration-300 ease-out ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        data-no-hud-toggle="true"
        onClick={(e) => e.stopPropagation()}
        aria-hidden={!isOpen}
        className={`fixed top-0 bottom-0 right-0 z-50 h-screen w-full sm:w-[420px] md:w-[450px] lg:w-[480px] xl:w-[500px] flex flex-col overflow-hidden border-l transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) select-text ${
          isOpen
            ? 'translate-x-0 opacity-100 pointer-events-auto'
            : 'translate-x-full opacity-0 pointer-events-none'
        } ${
          isDark
            ? 'bg-[#18181b] text-slate-100 border-white/10 shadow-[-12px_0_36px_rgba(0,0,0,0.55)]'
            : 'bg-[#fafafa] text-slate-900 border-slate-200/90 shadow-[-12px_0_36px_rgba(15,23,42,0.12)]'
        }`}
      >
      {/* 侧边栏紧凑顶栏 */}
      <CopilotTopNav
        activeMode={cognitiveMode}
        onSelectMode={handleCognitiveModeChange}
        onClose={onClose}
        isDark={isDark}
      />

      {/* 认知伴读主体 (苏格拉底质疑 / 跨书互文 / 因果网络图谱) */}
      <CopilotStudioRightPane
        cognitiveMode={cognitiveMode}
        book={book}
        currentChapterTitle={currentChapterTitle}
        effectiveAnchorText={effectiveAnchorText}
        loading={chat.copilotLoading}
        response={chat.copilotResponse}
        messages={chat.messages}
        onClearSession={chat.clearChatSession}
        savedNotice={chat.savedNotice}
        onSaveAsNote={() => chat.saveInsightNote(effectiveAnchorText, onSaveInsightAsNote)}
        onJumpToCitation={onJumpToCitation}
        recapData={recapData}
        recapLoading={recapLoading}
        recapError={recapError}
        selectedChar={selectedChar}
        onSelectChar={setSelectedChar}
        onRetryRecap={() => loadRecap(book.id, currentChapterIndex, book.progress?.percentage || 0)}
        questionInput={chat.customQuestion}
        onQuestionInputChange={chat.setCustomQuestion}
        onSubmitQuestion={handleSubmitQuestion}
        lastUserQuestion={chat.lastUserQuestion}
        isDark={isDark}
      />
    </aside>
  </>
);
};

export type { AICopilotModalProps } from './types';
