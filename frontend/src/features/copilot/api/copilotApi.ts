import { apiClient } from '../../../shared/api'
import type {
  SpoilerFreeRecapData,
  CopilotRecapPayload,
  CopilotQueryPayload,
  CopilotResponse,
} from '../types'

export const copilotApi = {
  fetchRecap: (payload: CopilotRecapPayload, signal?: AbortSignal): Promise<SpoilerFreeRecapData> => {
    return apiClient.post<SpoilerFreeRecapData>('/api/ai/copilot', payload, { signal })
  },

  queryCopilot: (payload: CopilotQueryPayload, signal?: AbortSignal): Promise<CopilotResponse> => {
    return apiClient.post<CopilotResponse>('/api/ai/copilot', payload, { signal })
  },
}
