import { useEffect, useCallback, useRef } from 'react';
import type { AICopilotModalProps, CopilotChatMode, CognitiveMode } from '../types';
import type { useCopilotChat } from './useCopilotChat';
import type { useCopilotRecap } from './useCopilotRecap';

interface UseCopilotModalSyncParams {
  isOpen: boolean;
  onClose: () => void;
  book: AICopilotModalProps['book'];
  currentChapterIndex: number;
  currentChapterTitle: string;
  paragraphIndex: number;
  effectiveAnchorText: string;
  customQuestion: string;
  initialMode: NonNullable<AICopilotModalProps['initialMode']>;
  selectedText: string;
  sendQuery: ReturnType<typeof useCopilotChat>['sendQuery'];
  loadRecap: ReturnType<typeof useCopilotRecap>['loadRecap'];
  setCopilotMode: ReturnType<typeof useCopilotChat>['setCopilotMode'];
  setCognitiveMode: (mode: CognitiveMode) => void;
}

export function useCopilotModalSync(params: UseCopilotModalSyncParams) {
  const latestRef = useRef(params);
  latestRef.current = params;
  const lastTargetRef = useRef<{
    bookId: string;
    chapterIndex: number;
    selectedText: string;
    initialMode: string;
  } | null>(null);

  const executeCopilotQuery = useCallback(
    (mode: CopilotChatMode, text?: string, question?: string, skipLog = false) => {
      const cur = latestRef.current;
      cur.sendQuery({
        mode,
        book_id: cur.book.id,
        book_title: cur.book.title,
        chapter_index: cur.currentChapterIndex,
        chapter_title: cur.currentChapterTitle,
        paragraph_index: cur.paragraphIndex,
        selected_text: text ?? cur.effectiveAnchorText,
        question: question ?? cur.customQuestion,
        skip_log: skipLog,
      });
    },
    []
  );

  useEffect(() => {
    if (!params.isOpen) return;
    const cur = latestRef.current;

    const targetKey = {
      bookId: params.book.id,
      chapterIndex: params.currentChapterIndex,
      selectedText: (params.selectedText || '').trim(),
      initialMode: params.initialMode,
    };

    // 智能防重：如果目标指纹未发生变化，复用现有会话记忆，避免重复网络请求
    const prev = lastTargetRef.current;
    const isSameTarget =
      prev &&
      prev.bookId === targetKey.bookId &&
      prev.chapterIndex === targetKey.chapterIndex &&
      prev.selectedText === targetKey.selectedText &&
      prev.initialMode === targetKey.initialMode;

    if (isSameTarget) {
      return;
    }
    lastTargetRef.current = targetKey;

    if (params.initialMode === 'spoiler_free_recap') {
      cur.setCognitiveMode('causal_graph');
    } else {
      cur.setCognitiveMode('socratic');
      cur.setCopilotMode(params.initialMode);
    }
    cur.loadRecap(cur.book.id, params.currentChapterIndex, cur.book.progress?.percentage || 0);
    executeCopilotQuery(
      params.initialMode === 'spoiler_free_recap' ? 'explain' : params.initialMode,
      cur.effectiveAnchorText,
      '',
      params.initialMode === 'spoiler_free_recap'
    );
  }, [
    params.isOpen,
    params.book.id,
    params.currentChapterIndex,
    params.initialMode,
    params.selectedText,
    executeCopilotQuery,
  ]);

  useEffect(() => {
    if (!params.isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') params.onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [params.isOpen, params.onClose]);

  return executeCopilotQuery;
}
