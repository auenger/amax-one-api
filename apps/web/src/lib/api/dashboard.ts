/**
 * Dashboard API call functions
 */

import { apiClient } from '../api-client'

export interface DashboardStats {
  model_count: number
  active_model_count: number
  provider_count: number
  key_count: number
  today_requests: number
  today_tokens: number
}

export const dashboardApi = {
  /** Get dashboard statistics */
  getStats() {
    return apiClient.get<DashboardStats>('/admin/dashboard/stats')
  },
}
