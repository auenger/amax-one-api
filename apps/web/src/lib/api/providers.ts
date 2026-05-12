/**
 * Provider API call functions
 */

import { apiClient } from '../api-client'
import type {
  Provider,
  ProviderDetail,
  ProviderKey,
  SyncStatus,
  CreateProviderInput,
  UpdateProviderInput,
  CreateProviderKeyInput,
  PaginatedResponse,
} from './types'

export const providersApi = {
  /** List providers with optional filters */
  list(params?: { status?: string; limit?: number; cursor?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.set('status', params.status)
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.cursor) searchParams.set('cursor', params.cursor)
    const qs = searchParams.toString()
    return apiClient.get<PaginatedResponse<Provider>>(`/admin/providers${qs ? `?${qs}` : ''}`)
  },

  /** Get provider detail with keys and models */
  get(id: string) {
    return apiClient.get<ProviderDetail>(`/v1/providers/${id}`)
  },

  /** Create a new provider */
  create(input: CreateProviderInput) {
    return apiClient.post<Provider>('/admin/providers', input)
  },

  /** Update provider */
  update(id: string, input: UpdateProviderInput) {
    return apiClient.put<Provider>(`/v1/providers/${id}`, input)
  },

  /** Delete provider */
  delete(id: string) {
    return apiClient.delete<void>(`/v1/providers/${id}`)
  },

  /** List provider keys */
  listKeys(providerId: string) {
    return apiClient.get<{ data: ProviderKey[] }>(`/v1/providers/${providerId}/keys`)
  },

  /** Add provider key */
  addKey(providerId: string, input: CreateProviderKeyInput) {
    return apiClient.post<ProviderKey>(`/v1/providers/${providerId}/keys`, input)
  },

  /** Delete provider key */
  deleteKey(providerId: string, keyId: string) {
    return apiClient.delete<void>(`/v1/providers/${providerId}/keys/${keyId}`)
  },

  /** Get sync status */
  getSyncStatus(providerId: string) {
    return apiClient.get<SyncStatus>(`/v1/providers/${providerId}/sync-status`)
  },
}
