import React from 'react'
import { Flame, Check, ShieldQuestion, MessageSquarePlus, CheckCircle2 } from 'lucide-react'
import { parseSocraticContent } from '../helpers'

interface CopilotSocraticCardProps {
  content: string
  onDeepDeduce: (prompt: string) => void
  onFindCounterArg: (prompt: string) => void
  onSaveAsNote: () => void
  savedNotice: boolean
  isDark: boolean
}

export const CopilotSocraticCard: React.FC<CopilotSocraticCardProps> = ({
  content,
  onDeepDeduce,
  onFindCounterArg,
  onSaveAsNote,
  savedNotice,
  isDark,
}) => {
  const parsed = parseSocraticContent(content)

  return (
    <div
      className={`p-5 rounded-2xl border shadow-sm space-y-4 transition-all ${
        isDark
          ? 'bg-gradient-to-br from-amber-950/30 via-[#1c1c1e] to-[#1c1c1e] border-amber-500/30 text-slate-200'
          : 'bg-gradient-to-br from-amber-50/70 via-orange-50/40 to-white border-amber-200/80 text-slate-800'
      }`}
    >
      {/* 头部标题与徽章 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            <Flame className="w-4 h-4 fill-current" />
          </div>
          <div>
            <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              苏格拉底式反思质疑
            </span>
            <span className="text-[10px] text-slate-400 ml-2 hidden sm:inline">The Devil's Advocate</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-amber-700 bg-amber-100 dark:bg-amber-900/60 dark:text-amber-300 px-2.5 py-0.5 rounded-full font-bold">
            辩难模式
          </span>
          <button
            type="button"
            onClick={onSaveAsNote}
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
              savedNotice
                ? 'bg-emerald-500 text-white'
                : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
            title="存入想法笔记"
          >
            {savedNotice ? <CheckCircle2 className="w-3.5 h-3.5" /> : <MessageSquarePlus className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 核心反思假设前提 */}
      <p className="leading-relaxed text-xs sm:text-[13px]">
        {parsed.hypothesis}
      </p>

      {/* 逻辑压力测试审问点 */}
      <div
        className={`space-y-2.5 p-3.5 rounded-xl border ${
          isDark ? 'bg-black/25 border-white/8' : 'bg-white/85 border-amber-100/80'
        }`}
      >
        {parsed.inquiryPoints.map((point, idx) => (
          <div key={idx} className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
              {idx + 1}
            </span>
            <p className={`text-[12px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {point}
            </p>
          </div>
        ))}
      </div>

      {/* 底部辩难交互动作 */}
      <div className="pt-1 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onDeepDeduce(`我认同苏格拉底对这一命题的质疑。请进一步深入推演：${parsed.inquiryPoints[0] || '其中的系统性外部性与演化瓶颈'}`)}
          className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <Check className="w-3.5 h-3.5" />
          <span>认同并深入推演</span>
        </button>

        <button
          type="button"
          onClick={() => onFindCounterArg(`针对上述质疑，作者或原书中有哪些核心论据可以进行有力抗辩？请结合全书逻辑展开反驳`)}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border flex items-center gap-1.5 cursor-pointer active:scale-95 ${
            isDark
              ? 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/10'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
          }`}
        >
          <ShieldQuestion className="w-3.5 h-3.5 text-amber-500" />
          <span>寻找原书的抗辩论据</span>
        </button>
      </div>
    </div>
  )
}
