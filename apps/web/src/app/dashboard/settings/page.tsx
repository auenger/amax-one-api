'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import useSWR from 'swr'
import { providersApi } from '@/lib/api/providers'
import { keysApi } from '@/lib/api/keys'
import { modelsApi } from '@/lib/api/models'

export default function SettingsPage() {
  // Fetch system status from real APIs
  const { data: providersData, isLoading: loadingProviders } = useSWR(
    typeof window !== 'undefined' ? 'settings-providers' : null,
    () => providersApi.list({ limit: 100 }),
  )

  const { data: keysData, isLoading: loadingKeys } = useSWR(
    typeof window !== 'undefined' ? 'settings-keys' : null,
    () => keysApi.list({ limit: 100 }),
  )

  const { data: modelsData, isLoading: loadingModels } = useSWR(
    typeof window !== 'undefined' ? 'settings-models' : null,
    () => modelsApi.list({ limit: 100 }),
  )

  const providers = providersData?.data ?? []
  const keys = keysData?.data ?? []
  const models = modelsData?.data ?? []

  const activeProviders = providers.filter((p) => p.status === 'active').length
  const activeKeys = keys.filter((k) => k.status === 'active').length
  const activeModels = models.filter((m) => m.status === 'active').length

  const isLoading = loadingProviders || loadingKeys || loadingModels

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-muted-foreground text-sm mt-1">平台配置与环境信息</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">系统信息</CardTitle>
          <CardDescription>当前平台运行状态与版本信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">版本</span>
            <Badge variant="outline">v0.1.0</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">网关状态</span>
            <Badge variant="default">运行中</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">API 地址</span>
            <code className="text-xs bg-muted px-2 py-0.5 rounded">
              {process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}
            </code>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">数据库</span>
            <code className="text-xs bg-muted px-2 py-0.5 rounded">PostgreSQL 16</code>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">缓存</span>
            <code className="text-xs bg-muted px-2 py-0.5 rounded">Redis 7</code>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">资源统计</CardTitle>
          <CardDescription>当前系统资源配置概况</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  {i < 2 && <Separator className="mt-4" />}
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">供应商</span>
                <Badge variant="outline">
                  {activeProviders} 活跃 / {providers.length} 总计
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">活跃模型</span>
                <Badge variant="outline">
                  {activeModels} 活跃 / {models.length} 总计
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Virtual Key</span>
                <Badge variant="outline">
                  {activeKeys} 活跃 / {keys.length} 总计
                </Badge>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">供应商连接状态</CardTitle>
          <CardDescription>各供应商的当前连接状态</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
          ) : providers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">暂无供应商配置</p>
          ) : (
            providers.map((provider) => (
              <div
                key={provider.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm">{provider.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {provider.type}
                  </Badge>
                </div>
                <Badge
                  variant={
                    provider.status === 'active'
                      ? 'default'
                      : provider.status === 'degraded'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  {provider.status === 'active'
                    ? '正常'
                    : provider.status === 'degraded'
                      ? '降级'
                      : '禁用'}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
