import React, { useState } from 'react';
import type { CopilotResponse, CognitiveMode, AICopilotModalProps, CharacterNode } from '../types';
import { CopilotXRayLeftPane } from './CopilotXRayLeftPane';
import { CopilotStudioRightPane } from './CopilotStudioRightPane';
import { BookOpen, Sparkles } from 'lucide-react';

interface CopilotStudioViewProps {
  cognitiveMode: CognitiveMode;
  book: AICopilotModalProps['book'];
  currentChapterTitle: string;
  currentChapterIndex: number;
  chapterText?: string;
  effectiveAnchorText: string;
  loading: boolean;
  response: CopilotResponse | null;
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
  isDark: boolean;
}

export const CopilotStudioView: React.FC<CopilotStudioViewProps> = (props) => {
  const [mobileTab, setMobileTab] = useState<'xray' | 'studio'>('studio');

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
      {/* 移动端顶部二级切换 (仅在移动端小屏显示) */}
      <div className="md:hidden flex items-center justify-around bg-slate-100 dark:bg-slate-800 p-1 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setMobileTab('xray')}
          className={`flex items-center gap-1.5 py-1.5 px-4 rounded-xl transition-all ${
            mobileTab === 'xray'
              ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-2xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>原文透视 (X-Ray)</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('studio')}
          className={`flex items-center gap-1.5 py-1.5 px-4 rounded-xl transition-all ${
            mobileTab === 'studio'
              ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-2xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>深度认知辩难</span>
        </button>
      </div>

      {/* 左侧 52% 原文透视板 */}
      <div
        className={`w-full md:w-[52%] h-full overflow-hidden ${
          mobileTab === 'xray' ? 'block' : 'hidden md:block'
        }`}
      >
        <CopilotXRayLeftPane
          bookTitle={props.book.title}
          bookAuthor={props.book.author}
          currentChapterTitle={props.currentChapterTitle}
          chapterExcerpt={props.chapterText || props.effectiveAnchorText}
          selectedText={props.effectiveAnchorText}
          onSelectSemanticNode={(nodeLabel: string) =>
            props.onSubmitQuestion(`针对概念“${nodeLabel}”，在当前书中扮演的因果驱动逻辑是什么？`)
          }
          isDark={props.isDark}
        />
      </div>

      {/* 右侧 48% 认知工作台 */}
      <div
        className={`w-full md:w-[48%] h-full overflow-hidden ${
          mobileTab === 'studio' ? 'block' : 'hidden md:block'
        }`}
      >
        <CopilotStudioRightPane
          cognitiveMode={props.cognitiveMode}
          book={props.book}
          currentChapterTitle={props.currentChapterTitle}
          effectiveAnchorText={props.effectiveAnchorText}
          loading={props.loading}
          response={props.response}
          savedNotice={props.savedNotice}
          onSaveAsNote={props.onSaveAsNote}
          onJumpToCitation={props.onJumpToCitation}
          recapData={props.recapData}
          recapLoading={props.recapLoading}
          recapError={props.recapError}
          selectedChar={props.selectedChar}
          onSelectChar={props.onSelectChar}
          onRetryRecap={props.onRetryRecap}
          questionInput={props.questionInput}
          onQuestionInputChange={props.onQuestionInputChange}
          onSubmitQuestion={props.onSubmitQuestion}
          isDark={props.isDark}
        />
      </div>
    </div>
  );
};
