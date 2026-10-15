import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CodeBlockFigureProps {
  codeText: string
  itemKey: string
  pIdx: number
  targetChIdx: number
}

export const CodeBlockFigure: React.FC<CodeBlockFigureProps> = ({
  codeText,
  itemKey,
  pIdx,
  targetChIdx,
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!navigator?.clipboard) return
    navigator.clipboard.writeText(codeText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      key={itemKey}
      data-para-index={pIdx}
      data-chapter-index={targetChIdx}
      className="reader-block-contain break-inside-avoid my-4 rounded-xl border border-current/15 bg-slate-900/5 dark:bg-slate-950/60 shadow-xs overflow-hidden select-text"
    >
      <div className="px-3.5 py-1.5 border-b border-current/10 bg-current/[0.025] flex items-center justify-between text-xs text-current/60 select-none">
        <span className="font-mono font-medium text-[11px] uppercase tracking-wider opacity-75">
          代码片段
        </span>
        <button
          type="button"
          data-no-hud-toggle="true"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-current/10 transition-colors text-[11px] font-sans font-medium cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-500">已复制</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>复制代码</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 font-mono text-[0.88em] leading-relaxed overflow-x-auto whitespace-pre-wrap break-words">
        <code>{codeText}</code>
      </pre>
    </div>
  )
}
