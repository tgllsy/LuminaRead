import React from 'react'

/**
 * Render inline **bold** and *italic* segments cleanly without raw asterisks
 */
export function renderInlineFormatting(
  text: string,
  isDark: boolean
): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong
          key={idx}
          className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}
        >
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <span
          key={idx}
          className={`${isDark ? 'text-blue-300' : 'text-[#1b88ee]'} font-medium`}
        >
          {part.slice(1, -1)}
        </span>
      )
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>
  })
}

/**
 * Filter out legacy disclaimers or prompt suffixes from raw response
 */
export function cleanCopilotMarkdownLines(rawContent: string): string[] {
  return (rawContent || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false
      if (/^\*?\*?[（(]说明[:：]本次未实际附带选段正文.*[)）]\*?\*?$/.test(l)) {
        return false
      }
      if (/^需要的话，我可以.*存进知识库笔记/.test(l)) {
        return false
      }
      return true
    })
}

/**
 * Render a single line in WeChat Read structured cards & lists
 */
function renderListItem(body: string, idx: number, isDark: boolean): React.ReactNode {
  const kvMatch = body.match(/^\*\*([^*]+)\*\*\s*[:：]\s*(.+)$/)
  if (kvMatch) {
    return (
      <div
        key={idx}
        className={`p-3 rounded-xl border transition-colors ${
          isDark
            ? 'bg-[#25262b] border-white/8 text-slate-200'
            : 'bg-white border-slate-100 shadow-[0_1px_4px_rgba(15,23,42,0.03)] text-slate-700'
        }`}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1b88ee] shrink-0" />
          <span className={`text-xs font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {kvMatch[1]}
          </span>
        </div>
        <p className={`text-xs sm:text-[13px] leading-relaxed pl-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
          {renderInlineFormatting(kvMatch[2], isDark)}
        </p>
      </div>
    )
  }

  return (
    <div key={idx} className="flex items-start gap-2 text-xs sm:text-[13px] leading-relaxed">
      <span className="w-1.5 h-1.5 rounded-full bg-[#1b88ee] mt-2 shrink-0" />
      <div className="flex-1">{renderInlineFormatting(body, isDark)}</div>
    </div>
  )
}

function renderMarkdownLine(line: string, idx: number, isDark: boolean): React.ReactNode {
  if (/^#{1,4}\s+/.test(line)) {
    const headingText = line.replace(/^#{1,4}\s+/, '').replace(/\*\*/g, '')
    return (
      <div key={idx} className={`text-xs sm:text-[13px] font-bold pt-1 ${isDark ? 'text-blue-300' : 'text-[#1b88ee]'}`}>
        {headingText}
      </div>
    )
  }

  if (line.startsWith('>')) {
    const quoteText = line.replace(/^>\s*/, '')
    if (!quoteText) return null
    return (
      <blockquote
        key={idx}
        className={`pl-3 py-1.5 border-l-2 border-[#1b88ee] rounded-r-xl text-xs leading-relaxed ${
          isDark ? 'bg-white/[0.03] text-slate-300' : 'bg-[#f7f9fc] text-slate-600'
        }`}
      >
        {renderInlineFormatting(quoteText, isDark)}
      </blockquote>
    )
  }

  const listMatch = line.match(/^(?:[-*•]|\d+\.)\s+(.+)$/)
  if (listMatch) {
    return renderListItem(listMatch[1], idx, isDark)
  }

  return (
    <p key={idx} className={`text-xs sm:text-[13px] leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
      {renderInlineFormatting(line, isDark)}
    </p>
  )
}

/**
 * Parse AI Copilot Markdown response into structured WeChat Read cards & lists
 */
export function renderFormattedMarkdown(
  rawContent: string,
  isDark: boolean
): React.ReactNode {
  const lines = cleanCopilotMarkdownLines(rawContent)
  return (
    <div className="space-y-2.5">
      {lines.map((line, idx) => renderMarkdownLine(line, idx, isDark))}
    </div>
  )
}

/**
 * Clean markdown for plain text saving to note
 */
export function cleanNoteContent(content: string): string {
  return content.replace(/#+/g, '').replace(/\*\*/g, '').trim()
}

/**
 * Calculate short display name for star map character nodes
 */
export function formatCharacterShortName(name: string): string {
  const baseParts = (name || '')
    .split(/[（(]/)[0]
    .trim()
    .split('·')
  const rawShort =
    baseParts[0].length <= 2 && baseParts[1]
      ? `${baseParts[0]}·${baseParts[1]}`
      : baseParts[0]
  return rawShort.length > 6 ? `${rawShort.slice(0, 5)}…` : rawShort
}

/**
 * Build effective anchor text fallback for reader context
 */
export function buildEffectiveAnchorText(
  selectedText?: string,
  chapterExcerpt?: string,
  bookTitle?: string,
  chapterTitle?: string
): string {
  return (
    selectedText?.trim() ||
    chapterExcerpt?.trim() ||
    `《${bookTitle || '未知书籍'}》· ${chapterTitle || '当前章节'}`
  )
}

/**
 * 智能提取当前命题的语义节点徽章 (Semantic Nodes Badges)
 */
export function extractSemanticNodes(text: string, _title?: string): Array<{ id: string; label: string }> {
  const sample = text.slice(0, 300)
  const candidateKeywords = [
    '晋升锦标赛', '土地财政', '激励机制', '约束条件', '路径依赖',
    '软预算约束', '宏观调控', '微观博弈', '资产负债表', '系统演化',
    '反事实推演', '复利效应', '因果链路', '外部性', '边际效用',
    '沉没成本', '认知模型', '涌现机制', '熵增定律', '第一性原理',
  ]

  const matched = candidateKeywords.filter((k) => sample.includes(k))
  if (matched.length >= 2) {
    return matched.slice(0, 4).map((label, idx) => ({ id: `node-${idx}`, label: `🔗 ${label}` }))
  }

  // 兜底提取短语
  const fallbackWords: string[] = []
  const quoted = sample.match(/[「“]([^」”]{2,8})[」”]/g)
  if (quoted) {
    quoted.forEach((q) => fallbackWords.push(q.replace(/[「“」”]/g, '')))
  }

  const defaultNodes = ['核心前提假设', '既有约束条件', '博弈激励机制']
  const combined = Array.from(new Set([...matched, ...fallbackWords, ...defaultNodes])).slice(0, 3)
  return combined.map((label, idx) => ({ id: `node-${idx}`, label: `🔗 ${label}` }))
}

export interface ParsedSocraticStructure {
  hypothesis: string
  inquiryPoints: string[]
  conclusion?: string
}

/**
 * 解析苏格拉底质疑返回的结构化压力测试点
 */
export function parseSocraticContent(content: string): ParsedSocraticStructure {
  if (!content) {
    return {
      hypothesis: '作者在此处基于特定约束条件给出了关键论述。',
      inquiryPoints: [
        '前提假设审视：核心结论依赖的第一前提是什么？它在极端边界下是否依然成立？',
        '反事实推演：若初始博弈规则反转，后续演化路径将发生怎样的质变？',
      ],
    }
  }

  const lines = content.split('\n').map((l) => l.trim()).filter(Boolean)
  let hypothesis = ''
  const inquiryPoints: string[] = []

  for (const line of lines) {
    if (line.includes('假设') || line.includes('前提') || line.includes('重读')) {
      if (!hypothesis) hypothesis = line.replace(/^[#>*\-\s]+/, '')
    } else if (/^\d+[\.、]/.test(line) || line.startsWith('- **') || line.startsWith('* **')) {
      inquiryPoints.push(line.replace(/^[#>*\-\d\.、\s]+/, ''))
    }
  }

  if (!hypothesis) {
    hypothesis = '核心逻辑压力测试：作者的核心论述是否存在未言明的环境约束？'
  }
  if (inquiryPoints.length === 0) {
    inquiryPoints.push('核心结论在跨周期或外部冲击下的脆弱性与反脆弱性审视')
    inquiryPoints.push('若将主导主体与受约束客体的激励机制调转，系统将如何演化')
  }

  return { hypothesis, inquiryPoints: inquiryPoints.slice(0, 3) }
}

/**
 * 跨书互文碰撞推荐映射
 */
export function getIntertextualRecommendation(bookTitle: string, _selectedText: string) {
  if (bookTitle.includes('置身事内') || bookTitle.includes('政府') || bookTitle.includes('经济')) {
    return {
      relatedBookTitle: '大国大城',
      relatedAuthor: '陆铭',
      chapterContext: '第 5 章 · 空间错配与产业园区演进',
      quote: '为了拉动本地 GDP，部分地区建设了过多与实际人口流动方向逆行的园区，造成资源配置分散与潜在外部性。',
      dimension: '空间集聚 vs 地方竞争',
      currentBookView: '肯定特定历史阶段地方主导型投资对基础设施与产业链的巨大推力',
      relatedBookView: '直言人口逆向流动与低效园区对全局资源效率的稀释，主张在集聚中走向平衡',
    }
  }

  return {
    relatedBookTitle: '反脆弱',
    relatedAuthor: '纳西姆·塔勒布',
    chapterContext: '第 2 章 · 复杂系统的脆弱性来源',
    quote: '任何试图通过人为压制局部波动以追求短期稳定的系统，终将在未预见的尾部风险下暴露出巨大的非线性脆弱性。',
    dimension: '确定性干预 vs 演化自适应',
    currentBookView: '在约束条件下通过制度设计与激励协同寻找全局最优解',
    relatedBookView: '警惕对随机性的过度压制，主张在试错与小规模波动中汲取韧性',
  }
}

