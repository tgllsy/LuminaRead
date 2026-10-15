import { useMemo, useCallback } from 'react'
import { COPILOT_PRESETS } from '../constants'
import type { CopilotChatMode } from '../types'

export function useCopilotPresets() {
  const presets = useMemo(() => COPILOT_PRESETS, [])

  const isSaveActionQuery = useCallback((query: string) => {
    return query.includes('保存') || query.includes('批注')
  }, [])

  const resolveNextMode = useCallback((modeId: string): CopilotChatMode => {
    return modeId as CopilotChatMode
  }, [])

  return {
    presets,
    isSaveActionQuery,
    resolveNextMode,
  }
}
