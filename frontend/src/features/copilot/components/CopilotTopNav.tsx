import React from 'react';
import {
  ArrowLeft,
  Sparkles,
  Flame,
  GitBranch,
  Shuffle,
  X,
} from 'lucide-react';
import type { CognitiveMode } from '../types';
import { COGNITIVE_MODES } from '../constants';

interface CopilotTopNavProps {
  activeMode: CognitiveMode;
  onSelectMode: (mode: CognitiveMode) => void;
  onClose: () => void;
  isDark: boolean;
}

export const CopilotTopNav: React.FC<CopilotTopNavProps> = ({
  activeMode,
  onSelectMode,
  onClose,
  isDark,
}) => {
  const getModeIcon = (iconName: string) => {
    switch (iconName) {
      case 'flame':
        return <Flame className="w-3.5 h-3.5 text-amber-500" />;
      case 'git-branch':
        return <GitBranch className="w-3.5 h-3.5 text-[#1b88ee]" />;
      case 'shuffle':
        return <Shuffle className="w-3.5 h-3.5 text-purple-500" />;
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      className={`h-14 px-3 sm:px-4 border-b flex items-center justify-between shrink-0 select-none z-20 transition-colors ${
        isDark ? 'bg-[#18181b] border-white/8 text-slate-100' : 'bg-white border-slate-200/80 text-slate-900'
      }`}
    >
      {/* 左侧：返回书页按钮 */}
      <button
        type="button"
        onClick={onClose}
        className={`px-2 py-1.5 -ml-1 rounded-xl transition-colors flex items-center gap-1 text-xs font-semibold shrink-0 cursor-pointer active:scale-95 ${
          isDark ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
        }`}
        title="返回阅读"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>返回</span>
      </button>

      {/* 中部：三大核心认知模式 Switcher */}
      <div
        className={`flex items-center gap-0.5 sm:gap-1 p-1 rounded-xl text-xs shrink-0 ${
          isDark ? 'bg-[#27272a]' : 'bg-slate-100'
        }`}
      >
        {COGNITIVE_MODES.map((mode) => {
          const isActive = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onSelectMode(mode.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                isActive
                  ? isDark
                    ? 'bg-[#18181b] text-white shadow-2xs font-bold'
                    : 'bg-white text-slate-900 shadow-2xs font-bold'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title={mode.desc}
            >
              {getModeIcon(mode.iconName)}
              <span className="text-[11px] sm:text-xs">{mode.label.slice(0, 4)}</span>
            </button>
          );
        })}
      </div>

      {/* 右侧：心智绿灯与关闭按钮（移动端仅保留状态灯，避免与左侧返回重复） */}
      <div className="flex items-center gap-1.5 shrink-0 pr-1 sm:pr-0">
        <span
          className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
          title="心智模型实时挂载"
        />
        <button
          type="button"
          onClick={onClose}
          className={`hidden sm:inline-flex p-1.5 rounded-full transition-colors cursor-pointer ${
            isDark
              ? 'text-slate-400 hover:text-white hover:bg-white/10'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
          aria-label="关闭伴读"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
