import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import {
  parseBilingualHeading,
  renderBilingualToHtml,
} from '../helpers/bilingualMarkdownHelper'

interface BilingualMarkdownRendererProps {
  bilingualText: string
}

/**
 * 出版物级双语对照翻译 Markdown 渲染组件
 * 支持标题智能降维为副标题、上标脚注、粗体、斜体、列表与行内代码的高质量排版
 */
export const BilingualMarkdownRenderer: React.FC<BilingualMarkdownRendererProps> = ({
  bilingualText,
}) => {
  const [copied, setCopied] = useState(false)
  const headingInfo = parseBilingualHeading(bilingualText)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(headingInfo.isHeading ? headingInfo.headingText : bilingualText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // 1. 若为标题段落翻译（如 ## Section 1... / #### The story...）
  // 优雅渲染为中文标题下方的英文副标题，去除突兀的左边框与多余缩进
  if (headingInfo.isHeading) {
    const isMajorHeading = headingInfo.level <= 2
    return (
      <div
        data-no-hud-toggle="true"
        className={`group/bilingual-head flex items-center gap-2 select-text ${
          isMajorHeading
            ? 'mt-1 mb-3 text-sm sm:text-base font-serif font-bold tracking-tight text-blue-600/90 dark:text-blue-400/90'
            : 'mt-0.5 mb-2 text-xs sm:text-sm font-serif font-semibold text-blue-600/80 dark:text-blue-400/80'
        }`}
      >
        <span className="leading-tight">{headingInfo.headingText}</span>
        <button
          type="button"
          onClick={handleCopy}
          title={copied ? '已复制' : '复制英文标题'}
          className="opacity-0 group-hover/bilingual-head:opacity-70 hover:opacity-100 transition-opacity p-0.5 rounded text-xs"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
    )
  }

  // 2. 普通正文段落翻译：保留对照边框，内部执行完整 Markdown 解析与出版级排版
  const htmlContent = renderBilingualToHtml(bilingualText)

  return (
    <div
      data-no-hud-toggle="true"
      className="group/bilingual-para mt-2 ml-4 sm:ml-8 pl-3 border-l-2 border-blue-500/40 hover:border-blue-500/80 transition-colors relative select-text"
    >
      <div className="flex items-start justify-between gap-2">
        <div
          dangerouslySetInnerHTML={{ __html: htmlContent }}
          className="reader-bilingual-markdown flex-1 text-xs sm:text-[13.5px] leading-relaxed opacity-75 font-serif"
        />
        <button
          type="button"
          onClick={handleCopy}
          title={copied ? '已复制译文' : '复制此段译文'}
          className="opacity-0 group-hover/bilingual-para:opacity-60 hover:opacity-100 transition-opacity p-1 rounded text-current/60 shrink-0 mt-0.5"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
    </div>
  )
}
