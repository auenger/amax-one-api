/**
 * RFC 7807 Problem Error
 * Standardized error format for HTTP API responses
 */
export class ProblemError extends Error {
  public readonly status: number
  public readonly type: string
  public readonly title: string
  public readonly detail?: string
  public readonly instance?: string

  constructor(status: number, type: string, title: string, detail?: string, instance?: string) {
    super(title)
    this.name = 'ProblemError'
    this.status = status
    this.type = type
    this.title = title
    this.detail = detail
    this.instance = instance
  }

  toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = {
      status: this.status,
      type: this.type,
      title: this.title,
    }
    if (this.detail !== undefined) {
      result.detail = this.detail
    }
    if (this.instance !== undefined) {
      result.instance = this.instance
    }
    return result
  }
}

/**
 * Create a ProblemError with sensible defaults
 */
export function createProblemError(
  status: number,
  title: string,
  detail?: string,
  type?: string,
): ProblemError {
  const errorType = type ?? `https://httpstatuses.com/${status}`
  return new ProblemError(status, errorType, title, detail)
}
