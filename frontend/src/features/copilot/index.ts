export { AICopilotModal } from './index.tsx'
export type {
  AICopilotModalProps,
  CopilotMode,
  CopilotChatMode,
  CharacterNode,
  CharacterEdge,
  RecapPoint,
  SpoilerFreeRecapData,
  CopilotResponse,
  CopilotPromptPreset,
} from './types'
export { copilotApi } from './api'
export {
  useCopilotRecap,
  useCopilotChat,
  useCopilotPresets,
} from './hooks'
export {
  renderInlineFormatting,
  renderFormattedMarkdown,
  cleanNoteContent,
  formatCharacterShortName,
  buildEffectiveAnchorText,
} from './helpers'
