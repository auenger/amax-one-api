import { createLogger } from '@aihub/shared'
import { prisma } from '@aihub/database'
import type { SyncAction } from '@prisma/client'

const logger = createLogger('new-api-sync')

/**
 * Configuration for new-api connection
 */
interface NewApiConfig {
  baseUrl: string
  token: string
}

function getNewApiConfig(): NewApiConfig {
  return {
    baseUrl: process.env['NEW_API_BASE_URL'] ?? 'http://localhost:3001',
    token: process.env['NEW_API_INTERNAL_TOKEN'] ?? '',
  }
}

/**
 * Channel creation request payload for new-api
 */
interface CreateChannelPayload {
  type: number
  key: string
  name: string
  base_url: string
  models: string
  group?: string
}

/**
 * Channel update request payload for new-api
 */
interface UpdateChannelPayload {
  type?: number
  key?: string
  name?: string
  base_url?: string
  models?: string
  status?: number
  group?: string
}

/**
 * Map provider type to new-api channel type number
 */
function providerTypeToChannelType(providerType: string): number {
  switch (providerType) {
    case 'openai':
      return 1
    case 'anthropic':
      return 14
    default:
      return 1
  }
}

/**
 * Log a sync operation result
 */
async function logSync(params: {
  providerId: string
  action: SyncAction
  newApiChannelId?: string | null
  status: 'success' | 'failed'
  error?: string
}): Promise<void> {
  await prisma.channelSyncLog.create({
    data: {
      providerId: params.providerId,
      action: params.action,
      newApiChannelId: params.newApiChannelId,
      status: params.status,
      error: params.error,
    },
  })
}

/**
 * Sync provider to new-api: create or update channel
 */
export async function syncProviderToChannel(params: {
  providerId: string
  providerName: string
  providerType: string
  endpoint: string
  keys: Array<{ encryptedKey: string; decryptedKey: string }>
  modelNames: string[]
  action: 'create' | 'update'
}): Promise<{ channelId: string | null; success: boolean }> {
  const config = getNewApiConfig()
  const { providerId, providerName, providerType, endpoint, keys, modelNames, action } = params

  const channelType = providerTypeToChannelType(providerType)
  const keyString = keys.map((k) => k.decryptedKey).join('\n')
  const modelsStr = modelNames.length > 0 ? modelNames.join(',') : ''

  try {
    if (action === 'create') {
      // Create new channel
      const payload: CreateChannelPayload = {
        type: channelType,
        key: keyString,
        name: providerName,
        base_url: endpoint,
        models: modelsStr,
      }

      const response = await fetch(`${config.baseUrl}/api/channel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`new-api create channel failed: ${response.status} ${body}`)
      }

      const result = (await response.json()) as { success: boolean; data?: { id: number } }
      const channelId = result.data?.id?.toString() ?? null

      await logSync({
        providerId,
        action: 'create_channel',
        newApiChannelId: channelId,
        status: 'success',
      })

      logger.info({ providerId, channelId }, 'Created new-api channel')
      return { channelId, success: true }
    } else {
      // Update existing channel
      const provider = await prisma.provider.findUnique({ where: { id: providerId } })
      const existingChannelId = provider?.newApiChannelId

      if (!existingChannelId) {
        // No channel exists, create one instead
        return syncProviderToChannel({ ...params, action: 'create' })
      }

      const payload: UpdateChannelPayload = {
        type: channelType,
        key: keyString,
        name: providerName,
        base_url: endpoint,
        models: modelsStr,
      }

      const response = await fetch(`${config.baseUrl}/api/channel/${existingChannelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = await response.text()
        throw new Error(`new-api update channel failed: ${response.status} ${body}`)
      }

      await logSync({
        providerId,
        action: 'update_channel',
        newApiChannelId: existingChannelId,
        status: 'success',
      })

      logger.info({ providerId, channelId: existingChannelId }, 'Updated new-api channel')
      return { channelId: existingChannelId, success: true }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    logger.warn({ providerId, action, error: errorMsg }, 'new-api sync failed')

    await logSync({
      providerId,
      action: action === 'create' ? 'create_channel' : 'update_channel',
      newApiChannelId: null,
      status: 'failed',
      error: errorMsg,
    })

    return { channelId: null, success: false }
  }
}

/**
 * Delete channel from new-api
 */
export async function deleteChannel(params: {
  providerId: string
  channelId: string
}): Promise<{ success: boolean }> {
  const config = getNewApiConfig()
  const { providerId, channelId } = params

  try {
    const response = await fetch(`${config.baseUrl}/api/channel/${channelId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`new-api delete channel failed: ${response.status} ${body}`)
    }

    await logSync({
      providerId,
      action: 'delete_channel',
      newApiChannelId: channelId,
      status: 'success',
    })

    logger.info({ providerId, channelId }, 'Deleted new-api channel')
    return { success: true }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    logger.warn({ providerId, channelId, error: errorMsg }, 'new-api delete channel failed')

    await logSync({
      providerId,
      action: 'delete_channel',
      newApiChannelId: channelId,
      status: 'failed',
      error: errorMsg,
    })

    return { success: false }
  }
}

/**
 * Retry failed sync operations
 * Called by the sync compensation scheduled task
 */
export async function retryFailedSyncs(): Promise<{ retried: number; succeeded: number }> {
  const failedLogs = await prisma.channelSyncLog.findMany({
    where: { status: 'failed' },
    orderBy: { createdAt: 'desc' },
    distinct: ['providerId'],
    take: 50,
    include: {
      provider: {
        include: {
          keys: true,
          models: { where: { status: 'active' } },
        },
      },
    },
  })

  let succeeded = 0
  const { decrypt } = await import('../utils/crypto.js')

  for (const log of failedLogs) {
    if (!log.provider) continue

    const keys = log.provider.keys
      .filter((k) => k.status === 'active')
      .map((k) => ({
        encryptedKey: k.encryptedKey,
        decryptedKey: decrypt(k.encryptedKey),
      }))

    const modelNames = log.provider.models.map((m) => m.name)

    if (log.action === 'create_channel' || log.action === 'update_channel') {
      const action = log.action === 'create_channel' ? 'create' : 'update'
      const result = await syncProviderToChannel({
        providerId: log.providerId,
        providerName: log.provider.name,
        providerType: log.provider.type,
        endpoint: log.provider.endpoint,
        keys,
        modelNames,
        action,
      })

      if (result.success && result.channelId && log.action === 'create_channel') {
        await prisma.provider.update({
          where: { id: log.providerId },
          data: { newApiChannelId: result.channelId },
        })
      }

      if (result.success) succeeded++
    } else if (log.action === 'delete_channel') {
      if (log.newApiChannelId) {
        const result = await deleteChannel({
          providerId: log.providerId,
          channelId: log.newApiChannelId,
        })
        if (result.success) succeeded++
      }
    }
  }

  logger.info({ retried: failedLogs.length, succeeded }, 'Retry sync completed')
  return { retried: failedLogs.length, succeeded }
}
