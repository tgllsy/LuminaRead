import React from 'react'
import { BookOpen, Crosshair, Tag } from 'lucide-react'
import { extractSemanticNodes } from '../helpers'

interface CopilotXRayLeftPaneProps {
  bookTitle: string
  bookAuthor?: string
  currentChapterTitle: string
  chapterExcerpt: string
  selectedText?: string
  onSelectSemanticNode?: (nodeLabel: string) => void
  isDark: boolean
}

export const CopilotXRayLeftPane: React.FC<CopilotXRayLeftPaneProps> = ({
  bookTitle,
  bookAuthor,
  currentChapterTitle,
  chapterExcerpt,
  selectedText,
  onSelectSemanticNode,
  isDark,
}) => {
  const focusText = selectedText?.trim() || chapterExcerpt.trim()
  const semanticNodes = extractSemanticNodes(focusText, currentChapterTitle)

  return (
    <div
      className={`p-6 sm:p-8 lg:p-10 overflow-y-auto space-y-6 font-serif select-text transition-colors ${
        isDark ? 'bg-[#18181b] border-r border-white/8 text-slate-200' : 'bg-[#faf6ed] border-r border-amber-900/10 text-slate-800'
      }`}
    >
      {/* 章节顶部元信息 */}
      <div
        className={`flex items-center justify-between text-xs font-sans pb-3 border-b ${
          isDark ? 'border-white/10 text-slate-400' : 'border-amber-900/10 text-slate-500'
        }`}
      >
        <span className="flex items-center gap-1.5 font-medium truncate max-w-[70%]">
          <BookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="truncate">{bookTitle} · {currentChapterTitle}</span>
        </span>
        {bookAuthor && (
          <span className={`font-mono text-[11px] shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>
            {bookAuthor}
          </span>
        )}
      </div>

      {/* 章节大标题 */}
      <h1 className={`text-xl sm:text-2xl font-bold font-serif leading-snug tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
        {currentChapterTitle}
      </h1>

      {/* 背景上下文摘要段落 */}
      {chapterExcerpt && chapterExcerpt !== focusText && (
        <p className="leading-[1.9] indent-8 text-[15px] text-justify opacity-85">
          {chapterExcerpt.slice(0, 260)}...
        </p>
      )}

      {/* 核心命题深度透视高光卡片 (X-Ray Focus Block) */}
      <div
        className={`relative p-5 rounded-2xl shadow-sm font-sans space-y-3 border transition-all ${
          isDark
            ? 'bg-amber-950/20 border-amber-500/30 text-slate-200'
            : 'bg-amber-100/70 border-amber-300 text-slate-900'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-amber-400' : 'text-amber-900'}`}>
            <Crosshair className="w-4 h-4 text-amber-500" />
            <span>正在深度透视的核心命题：</span>
          </span>
          <span className="text-[10px] text-amber-800 bg-amber-200/80 dark:bg-amber-900/60 dark:text-amber-300 px-2 py-0.5 rounded-full font-mono">
            X-Ray Target
          </span>
        </div>

        <p className="italic font-serif text-sm sm:text-[15px] leading-relaxed">
          “{focusText}”
        </p>

        {/* 语义节点徽章 (Semantic Nodes Badges) */}
        <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
            <Tag className="w-3 h-3" />
            <span>心智标签：</span>
          </span>
          {semanticNodes.map((node) => (
            <button
              key={node.id}
              type="button"
              onClick={() => onSelectSemanticNode?.(node.label.replace('🔗 ', ''))}
              className={`px-2.5 py-1 rounded-lg font-medium border flex items-center gap-1 transition-all cursor-pointer ${
                isDark
                  ? 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/10 hover:border-amber-400/50'
                  : 'bg-white/90 hover:bg-white text-slate-700 border-amber-200/80 hover:border-amber-400 shadow-2xs'
              }`}
              title="点击围绕此概念向 AI 发起推演"
            >
              <span>{node.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={`text-xs font-sans italic opacity-60 pt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
        💡 提示：在右侧辩难空间可就此段命题与苏格拉底思考官进行多轮抗辩或因果推演。
      </div>
    </div>
  )
}
