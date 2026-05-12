/**
 * Usage API call functions
 */

import { apiClient } from '../api-client'
import type { UsageLog, UsageGroupSummary, UsageGroupBy, PaginatedResponse } from './types'

export const usageApi = {
  /** Query usage logs with filters */
  list(params?: {
    virtual_key_id?: string
    provider_id?: string
    model_id?: string
    start_date?: string
    end_date?: string
    limit?: number
    cursor?: string
  }) {
    const searchParams = new URLSearchParams()
    if (params?.virtual_key_id) searchParams.set('virtual_key_id', params.virtual_key_id)
    if (params?.provider_id) searchParams.set('provider_id', params.provider_id)
    if (params?.model_id) searchParams.set('model_id', params.model_id)
    if (params?.start_date) searchParams.set('start_date', params.start_date)
    if (params?.end_date) searchParams.set('end_date', params.end_date)
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.cursor) searchParams.set('cursor', params.cursor)
    const qs = searchParams.toString()
    return apiClient.get<PaginatedResponse<UsageLog>>(`/admin/usage${qs ? `?${qs}` : ''}`)
  },

  /** Get usage summary grouped by dimension */
  summary(params?: {
    virtual_key_id?: string
    provider_id?: string
    model_id?: string
    start_date?: string
    end_date?: string
    group_by?: UsageGroupBy
  }) {
    const searchParams = new URLSearchParams()
    if (params?.virtual_key_id) searchParams.set('virtual_key_id', params.virtual_key_id)
    if (params?.provider_id) searchParams.set('provider_id', params.provider_id)
    if (params?.model_id) searchParams.set('model_id', params.model_id)
    if (params?.start_date) searchParams.set('start_date', params.start_date)
    if (params?.end_date) searchParams.set('end_date', params.end_date)
    if (params?.group_by) searchParams.set('group_by', params.group_by)
    const qs = searchParams.toString()
    return apiClient.get<{ data: UsageGroupSummary[] }>(`/v1/usage/summary${qs ? `?${qs}` : ''}`)
  },
}
