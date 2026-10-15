import React from 'react'
import { KeyRound } from 'lucide-react'
import type { BookSourceConfig } from '../types'

interface SourceZLibAuthProps {
  authConfig: BookSourceConfig['auth_config']
  onAuthChange: (key: string, val: string) => void
}

export const SourceZLibAuth: React.FC<SourceZLibAuthProps> = ({
  authConfig,
  onAuthChange,
}) => {
  return (
    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
          Z-Library 账号凭证 / Cookie 注入（可选，增强私有高配额下载）
        </span>
        <span className="text-[11px] text-slate-500">
          未配置时自动使用内置高可用混合索引
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] text-slate-600 mb-1">
            Z-Lib 登录邮箱 (Email)
          </label>
          <input
            type="text"
            value={authConfig.email || ''}
            onChange={(e) => onAuthChange('email', e.target.value)}
            placeholder="user@example.com"
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-600 mb-1">
            Z-Lib 登录密码 (Password)
          </label>
          <input
            type="password"
            value={authConfig.password || ''}
            onChange={(e) => onAuthChange('password', e.target.value)}
            placeholder="••••••••"
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-600 mb-1">
            Cookie: remix_userid
          </label>
          <input
            type="text"
            value={authConfig.remix_userid || ''}
            onChange={(e) => onAuthChange('remix_userid', e.target.value)}
            placeholder="例如: 12849201"
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-600 mb-1">
            Cookie: remix_userkey
          </label>
          <input
            type="text"
            value={authConfig.remix_userkey || ''}
            onChange={(e) => onAuthChange('remix_userkey', e.target.value)}
            placeholder="32位哈希密钥"
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white font-mono"
          />
        </div>
      </div>
    </div>
  )
}
