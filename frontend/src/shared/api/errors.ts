export type ErrorCategory =
  | 'NETWORK'
  | 'TIMEOUT'
  | 'SERVER'
  | 'UNAUTHORIZED'
  | 'NOT_FOUND'
  | 'PARSE'
  | 'UNKNOWN'

export class AppError extends Error {
  public readonly category: ErrorCategory
  public readonly status?: number
  public readonly rawError?: unknown

  constructor(
    message: string,
    category: ErrorCategory = 'UNKNOWN',
    status?: number,
    rawError?: unknown
  ) {
    super(message)
    this.name = 'AppError'
    this.category = category
    this.status = status
    this.rawError = rawError
    Object.setPrototypeOf(this, AppError.prototype)
  }

  static isAppError(error: unknown): error is AppError {
    return error instanceof AppError
  }

  static fromHttp(status: number, message?: string, raw?: unknown): AppError {
    let category: ErrorCategory = 'SERVER'
    if (status === 401 || status === 403) category = 'UNAUTHORIZED'
    else if (status === 404) category = 'NOT_FOUND'
    else if (status >= 500) category = 'SERVER'

    const msg = message || `HTTP 请求错误 (${status})`
    return new AppError(msg, category, status, raw)
  }

  static timeout(ms: number): AppError {
    return new AppError(`网络请求超时 (${ms}ms)`, 'TIMEOUT')
  }

  static network(err?: unknown): AppError {
    return new AppError('网络连接异常，请检查网络配置', 'NETWORK', undefined, err)
  }

  static parse(err?: unknown): AppError {
    return new AppError('响应数据解析失败', 'PARSE', undefined, err)
  }
}
