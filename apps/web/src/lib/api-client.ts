/**
 * API Client — Base fetch wrapper for AIHub Gateway
 *
 * Provides centralized error handling (RFC 7807), auth headers,
 * and typed response parsing for all frontend API calls.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'

/** RFC 7807 Problem Details shape */
export interface ProblemDetail {
  type: string
  title: string
  status: number
  detail: string
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly title: string,
    public readonly detail: string,
  ) {
    super(detail)
    this.name = 'ApiError'
  }
}

/** Paginated response wrapper */
export interface PaginatedResponse<T> {
  data: T[]
  next_cursor: string | null
  has_more: boolean
}

/**
 * Core fetch wrapper with error handling
 */
async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  }

  // Add admin API key if available
  const adminKey = process.env.NEXT_PUBLIC_ADMIN_API_KEY
  if (adminKey) {
    headers['Authorization'] = `Bearer ${adminKey}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Handle non-OK responses
  if (!response.ok) {
    if (response.status === 204) {
      return undefined as T
    }

    try {
      const problem: ProblemDetail = await response.json()
      throw new ApiError(problem.status || response.status, problem.title, problem.detail)
    } catch (e) {
      if (e instanceof ApiError) throw e
      throw new ApiError(response.status, 'Request Failed', response.statusText)
    }
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

/** Typed API methods */
export const apiClient = {
  get: <T>(path: string) => apiRequest<T>(path, { method: 'GET' }),

  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
}
