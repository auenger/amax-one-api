import { prisma } from '@aihub/database'

/**
 * Result of resolving a model name or alias
 */
export interface ResolvedModel {
  model: {
    id: string
    name: string
    display_name: string | null
    capabilities: string[]
    context_window: number | null
    status: string
  }
  provider: {
    id: string
    name: string
    type: string
    endpoint: string
    status: string
  }
}

/**
 * Resolve a model name or alias to the full model + provider info.
 * Used by openai-proxy to determine routing.
 *
 * Resolution order:
 * 1. Check if input is a model name (exact match)
 * 2. Check if input is an alias
 */
export async function resolveModel(nameOrAlias: string): Promise<ResolvedModel | null> {
  // Try direct model name first
  const directModel = await prisma.model.findUnique({
    where: { name: nameOrAlias },
    include: {
      provider: {
        select: {
          id: true,
          name: true,
          type: true,
          endpoint: true,
          status: true,
        },
      },
    },
  })

  if (directModel && directModel.provider) {
    return {
      model: {
        id: directModel.id,
        name: directModel.name,
        display_name: directModel.displayName,
        capabilities: directModel.capabilities,
        context_window: directModel.contextWindow,
        status: directModel.status,
      },
      provider: {
        id: directModel.provider.id,
        name: directModel.provider.name,
        type: directModel.provider.type,
        endpoint: directModel.provider.endpoint,
        status: directModel.provider.status,
      },
    }
  }

  // Try alias lookup
  const alias = await prisma.modelAlias.findUnique({
    where: { alias: nameOrAlias },
    include: {
      model: {
        include: {
          provider: {
            select: {
              id: true,
              name: true,
              type: true,
              endpoint: true,
              status: true,
            },
          },
        },
      },
    },
  })

  if (alias?.model?.provider) {
    return {
      model: {
        id: alias.model.id,
        name: alias.model.name,
        display_name: alias.model.displayName,
        capabilities: alias.model.capabilities,
        context_window: alias.model.contextWindow,
        status: alias.model.status,
      },
      provider: {
        id: alias.model.provider.id,
        name: alias.model.provider.name,
        type: alias.model.provider.type,
        endpoint: alias.model.provider.endpoint,
        status: alias.model.provider.status,
      },
    }
  }

  return null
}

/**
 * Get provider status for monitoring
 */
export async function getProviderStatus(providerId: string): Promise<{
  status: string
  lastCheck: string | null
} | null> {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { status: true },
  })

  if (!provider) return null

  // Get last sync log as "last check"
  const lastSync = await prisma.channelSyncLog.findFirst({
    where: { providerId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })

  return {
    status: provider.status,
    lastCheck: lastSync?.createdAt.toISOString() ?? null,
  }
}
