/**
 * Virtual Key API call functions
 */

import { apiClient } from '../api-client'
import type {
  VirtualKey,
  VirtualKeyCreated,
  CreateVirtualKeyInput,
  UpdateVirtualKeyInput,
  PaginatedResponse,
} from './types'

export const keysApi = {
  /** List virtual keys with optional filters */
  list(params?: { status?: string; limit?: number; cursor?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.cursor) searchParams.set('cursor', params.cursor)
    const qs = searchParams.toString()
    return apiClient.get<PaginatedResponse<VirtualKey>>(`/v1/keys${qs ? `?${qs}` : ''}`)
  },

  /** Get virtual key detail */
  get(id: string) {
    return apiClient.get<VirtualKey>(`/v1/keys/${id}`)
  },

  /** Create a new virtual key */
  create(input: CreateVirtualKeyInput) {
    return apiClient.post<VirtualKeyCreated>('/v1/keys', input)
  },

  /** Update virtual key */
  update(id: string, input: UpdateVirtualKeyInput) {
    return apiClient.put<VirtualKey>(`/v1/keys/${id}`, input)
  },

  /** Revoke virtual key */
  revoke(id: string) {
    return apiClient.delete<void>(`/v1/keys/${id}`)
  },
}
