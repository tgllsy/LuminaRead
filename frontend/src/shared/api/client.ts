import { AppError } from './errors'
import type { RequestOptions, HttpMethod } from '../types/api'

const DEFAULT_TIMEOUT_MS = 15000

function buildUrl(endpoint: string, params?: RequestOptions['params']): string {
  if (!params) return endpoint
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value))
    }
  }
  const query = searchParams.toString()
  if (!query) return endpoint
  return endpoint.includes('?') ? `${endpoint}&${query}` : `${endpoint}?${query}`
}

async function parseResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') || ''
  const rawText = await res.text()

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}`
    if (rawText) {
      try {
        if (contentType.includes('application/json') || rawText.trimStart().startsWith('{')) {
          const body = JSON.parse(rawText)
          errorMsg = body.error || body.message || errorMsg
        } else {
          errorMsg = rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || errorMsg
        }
      } catch {
        errorMsg = rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100) || errorMsg
      }
    }
    throw AppError.fromHttp(res.status, errorMsg)
  }

  if (res.status === 204 || !rawText.trim()) {
    return { ok: true } as unknown as T
  }

  if (contentType.includes('application/json') || rawText.trimStart().startsWith('{') || rawText.trimStart().startsWith('[')) {
    try {
      return JSON.parse(rawText) as T
    } catch (parseErr) {
      throw AppError.parse(parseErr)
    }
  }
  return rawText as unknown as T
}

interface LuminaRuntimeConfig {
  apiPrefix?: string
  apiBaseUrl?: string
}

function resolveRuntimeEndpoint(baseUrl: string, endpoint: string): string {
  const winCfg =
    typeof window !== 'undefined'
      ? (window as unknown as { __LUMINAREAD_CONFIG__?: LuminaRuntimeConfig }).__LUMINAREAD_CONFIG__
      : undefined
  const effectiveBase = (winCfg?.apiBaseUrl ?? baseUrl).replace(/\/+$/, '')
  const rawPrefix = winCfg?.apiPrefix ? winCfg.apiPrefix.trim().replace(/\/+$/, '') : '/api'
  const prefix = rawPrefix.startsWith('/') ? rawPrefix : `/${rawPrefix}`
  const rewritten =
    prefix !== '/api' && (endpoint === '/api' || endpoint.startsWith('/api/'))
      ? `${prefix}${endpoint.slice(4)}`
      : endpoint
  return `${effectiveBase}${rewritten}`
}

export class HttpClient {
  private readonly baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, body, timeoutMs = DEFAULT_TIMEOUT_MS, headers, signal, ...restInit } = options
    const url = buildUrl(resolveRuntimeEndpoint(this.baseUrl, endpoint), params)

    const controller = new AbortController()
    if (signal) {
      if (signal.aborted) {
        controller.abort(signal.reason)
      } else {
        signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
      }
    }
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const requestHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...((headers as Record<string, string>) || {}),
    }

    let payload: BodyInit | undefined = undefined
    if (body !== undefined) {
      if (body instanceof FormData || body instanceof Blob || typeof body === 'string') {
        payload = body
      } else {
        payload = JSON.stringify(body)
        requestHeaders['Content-Type'] = 'application/json'
      }
    }

    try {
      const res = await fetch(url, {
        ...restInit,
        headers: requestHeaders,
        body: payload,
        signal: controller.signal,
      })
      if (options.rawResponse) {
        if (!res.ok) {
          throw AppError.fromHttp(res.status, `HTTP ${res.status}`)
        }
        return res as unknown as T
      }
      return await parseResponse<T>(res)
    } catch (err: unknown) {
      if (AppError.isAppError(err)) {
        throw err
      }
      if (err instanceof DOMException && err.name === 'AbortError') {
        if (signal?.aborted) {
          throw err
        }
        throw AppError.timeout(timeoutMs)
      }
      throw AppError.network(err)
    } finally {
      clearTimeout(timer)
    }
  }

  get<T>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  post<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body })
  }

  put<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body })
  }

  delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

export const apiClient = new HttpClient('')
