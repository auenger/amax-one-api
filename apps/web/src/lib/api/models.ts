/**
 * Model and Alias API call functions
 */

import { apiClient } from '../api-client'
import type {
  Model,
  CreateModelInput,
  ModelAlias,
  CreateAliasInput,
  PaginatedResponse,
} from './types'

export const modelsApi = {
  /** List models with optional filters */
  list(params?: {
    capability?: string
    status?: string
    provider_id?: string
    limit?: number
    cursor?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.capability) searchParams.set('capability', params.capability)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.provider_id) searchParams.set('provider_id', params.provider_id)
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.cursor) searchParams.set('cursor', params.cursor)
    const qs = searchParams.toString()
    return apiClient.get<PaginatedResponse<Model>>(`/admin/models${qs ? `?${qs}` : ''}`)
  },

  /** Get model detail */
  get(id: string) {
    return apiClient.get<Model>(`/admin/models/${id}`)
  },

  /** Create a new model */
  create(input: CreateModelInput) {
    return apiClient.post<Model>('/admin/models', input)
  },

  /** Delete model */
  delete(id: string) {
    return apiClient.delete<void>(`/admin/models/${id}`)
  },

  /** List aliases */
  listAliases(params?: { limit?: number; cursor?: string }) {
    const searchParams = new URLSearchParams()
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.cursor) searchParams.set('cursor', params.cursor)
    const qs = searchParams.toString()
    return apiClient.get<PaginatedResponse<ModelAlias>>(`/admin/aliases${qs ? `?${qs}` : ''}`)
  },

  /** Create alias */
  createAlias(input: CreateAliasInput) {
    return apiClient.post<ModelAlias>('/admin/aliases', input)
  },

  /** Delete alias */
  deleteAlias(alias: string) {
    return apiClient.delete<void>(`/admin/aliases/${encodeURIComponent(alias)}`)
  },
}
