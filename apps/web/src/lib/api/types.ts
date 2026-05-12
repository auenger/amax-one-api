/**
 * API response type definitions — aligned with backend schemas
 */

// ============================================================
// Provider types
// ============================================================

export interface Provider {
  id: string
  name: string
  type: 'openai' | 'anthropic'
  endpoint: string
  status: 'active' | 'degraded' | 'disabled'
  rate_limits?: Record<string, unknown>
  new_api_channel_id?: string | null
  created_at: string
  updated_at: string
}

export interface ProviderDetail extends Provider {
  keys: ProviderKey[]
  models: ProviderModel[]
}

export interface ProviderKey {
  id: string
  key_prefix: string
  weight: number
  status: 'active' | 'disabled'
  last_used_at: string | null
  created_at?: string
}

export interface ProviderModel {
  id: string
  name: string
  display_name: string | null
  status: string
}

export interface SyncStatus {
  provider_id: string
  new_api_channel_id: string | null
  last_sync: {
    action: string
    status: string
    at: string
  } | null
  last_failure: {
    action: string
    error: string
    at: string
  } | null
  recent_syncs: Array<{
    action: string
    status: string
    error: string | null
    at: string
  }>
}

export interface CreateProviderInput {
  name: string
  type: 'openai' | 'anthropic'
  endpoint: string
  status?: 'active' | 'degraded' | 'disabled'
  keys?: Array<{ key: string; weight?: number }>
}

export interface UpdateProviderInput {
  name?: string
  endpoint?: string
  status?: 'active' | 'degraded' | 'disabled'
}

export interface CreateProviderKeyInput {
  key: string
  weight?: number
}

// ============================================================
// Model types
// ============================================================

export interface Model {
  id: string
  name: string
  display_name: string | null
  capabilities: string[]
  context_window: number | null
  pricing: {
    input_per_1k: number
    output_per_1k: number
  } | null
  status: 'active' | 'deprecated' | 'hidden'
  provider_id: string
  provider_name: string
  provider_type: string
  created_at: string
  updated_at: string
}

export interface CreateModelInput {
  provider_id: string
  name: string
  display_name?: string
  capabilities?: string[]
  context_window?: number
  pricing?: { input_per_1k: number; output_per_1k: number }
  status?: 'active' | 'deprecated' | 'hidden'
}

// ============================================================
// Alias types
// ============================================================

export interface ModelAlias {
  id: string
  alias: string
  model_id: string
  model_name: string
  created_at: string
}

export interface CreateAliasInput {
  alias: string
  model_id: string
}

// ============================================================
// Shared types
// ============================================================

export interface PaginatedResponse<T> {
  data: T[]
  next_cursor: string | null
  has_more: boolean
}

// ============================================================
// Dashboard stats types
// ============================================================

export interface DashboardStats {
  model_count: number
  active_model_count: number
  provider_count: number
  key_count: number
  today_requests: number
  today_tokens: number
}

// ============================================================
// Virtual Key types
// ============================================================

export type VirtualKeyStatus = 'active' | 'revoked'

export interface VirtualKey {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  rate_limits: { rpm?: number; tpm?: number } | null
  budget: { token_limit: number; reset_at: string } | null
  status: VirtualKeyStatus
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface VirtualKeyCreated extends VirtualKey {
  key: string // plaintext key, only returned on create
}

export interface CreateVirtualKeyInput {
  name: string
  scopes: string[]
  rate_limits?: { rpm?: number; tpm?: number }
  budget?: { token_limit: number; reset_at: string }
  expires_at?: string
}

export interface UpdateVirtualKeyInput {
  scopes?: string[]
  rate_limits?: { rpm?: number; tpm?: number } | null
  budget?: { token_limit: number; reset_at: string } | null
  expires_at?: string | null
}

// ============================================================
// Usage types
// ============================================================

export interface UsageLog {
  id: string
  virtual_key_id: string
  provider_id: string | null
  model_id: string | null
  model_name: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  request_id: string
  request_type: string
  status: string
  error_code: string | null
  latency_ms: number
  created_at: string
}

export interface UsageGroupSummary {
  group_key: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  request_count: number
}

export type UsageGroupBy = 'virtual_key' | 'provider' | 'model'
