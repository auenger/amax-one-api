'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Server,
  KeyRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import useSWR from 'swr'
import { providersApi } from '@/lib/api/providers'
import type { ProviderDetail, ProviderKey, SyncStatus } from '@/lib/api/types'

const statusConfig = {
  active: { label: '正常', color: 'text-emerald-500', badge: 'default' as const },
  degraded: { label: '降级', color: 'text-yellow-500', badge: 'secondary' as const },
  disabled: { label: '停用', color: 'text-red-500', badge: 'destructive' as const },
}

export default function ProviderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const providerId = params.id as string

  const [addKeyOpen, setAddKeyOpen] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newKeyWeight, setNewKeyWeight] = useState('100')
  const [submitting, setSubmitting] = useState(false)

  // Fetch provider detail (skip SSR)
  const {
    data: provider,
    mutate,
    isLoading,
  } = useSWR<ProviderDetail>(typeof window !== 'undefined' ? `provider-${providerId}` : null, () =>
    providersApi.get(providerId),
  )

  // Fetch sync status (skip SSR)
  const { data: syncStatus } = useSWR<SyncStatus>(
    typeof window !== 'undefined' ? `sync-${providerId}` : null,
    () => providersApi.getSyncStatus(providerId),
  )

  async function handleAddKey() {
    if (!newKey) {
      toast.error('请输入 API Key')
      return
    }
    setSubmitting(true)
    try {
      await providersApi.addKey(providerId, {
        key: newKey,
        weight: Number(newKeyWeight) || 100,
      })
      toast.success('API Key 添加成功')
      setAddKeyOpen(false)
      setNewKey('')
      setNewKeyWeight('100')
      mutate()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '添加失败')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteKey(keyId: string) {
    if (!confirm('确认删除此 API Key？')) return
    try {
      await providersApi.deleteKey(providerId, keyId)
      toast.success('API Key 已删除')
      mutate()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="space-y-4 text-center py-12">
        <p className="text-muted-foreground">供应商不存在</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/providers')}>
          返回列表
        </Button>
      </div>
    )
  }

  const status = statusConfig[provider.status as keyof typeof statusConfig]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/providers')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{provider.name}</h1>
          <p className="text-muted-foreground">
            <Badge variant="outline" className="uppercase text-xs mr-2">
              {provider.type}
            </Badge>
            {provider.endpoint}
          </p>
        </div>
        <span className={`flex items-center gap-1.5 text-sm ${status?.color ?? ''}`}>
          {provider.status === 'active' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : provider.status === 'degraded' ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {status?.label ?? provider.status}
        </span>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{provider.keys.length}</div>
            <p className="text-xs text-muted-foreground">个密钥</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">关联模型</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{provider.models.length}</div>
            <p className="text-xs text-muted-foreground">个模型</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Channel ID</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono truncate">
              {provider.new_api_channel_id || '未同步'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Keys Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription>管理供应商的 API 密钥</CardDescription>
          </div>

          <Dialog open={addKeyOpen} onOpenChange={setAddKeyOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                添加 Key
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>添加 API Key</DialogTitle>
                <DialogDescription>为供应商添加新的 API 密钥</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="key">API Key *</Label>
                  <Input
                    id="key"
                    type="password"
                    placeholder="sk-..."
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">权重 (1-1000)</Label>
                  <Input
                    id="weight"
                    type="number"
                    min={1}
                    max={1000}
                    value={newKeyWeight}
                    onChange={(e) => setNewKeyWeight(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddKeyOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleAddKey} disabled={submitting}>
                  {submitting ? '添加中...' : '添加'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key 前缀</TableHead>
                <TableHead>权重</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>最后使用</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {provider.keys.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    暂无 API Key
                  </TableCell>
                </TableRow>
              ) : (
                provider.keys.map((key: ProviderKey) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-mono text-sm">{key.key_prefix}</TableCell>
                    <TableCell>{key.weight}</TableCell>
                    <TableCell>
                      {key.status === 'active' ? (
                        <Badge variant="default" className="bg-emerald-500/10 text-emerald-500">
                          正常
                        </Badge>
                      ) : (
                        <Badge variant="secondary">停用</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.last_used_at
                        ? new Date(key.last_used_at).toLocaleString('zh-CN')
                        : '未使用'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteKey(key.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sync Status */}
      {syncStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              同步状态
            </CardTitle>
            <CardDescription>与 new-api Channel 的同步情况</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {syncStatus.last_sync && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">上次成功同步</span>
                  <span className="flex items-center gap-1.5 text-emerald-500">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {syncStatus.last_sync.action} —{' '}
                    {new Date(syncStatus.last_sync.at).toLocaleString('zh-CN')}
                  </span>
                </div>
              )}
              {syncStatus.last_failure && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">上次失败</span>
                  <span className="flex items-center gap-1.5 text-red-500">
                    <XCircle className="h-3.5 w-3.5" />
                    {syncStatus.last_failure.error} —{' '}
                    {new Date(syncStatus.last_failure.at).toLocaleString('zh-CN')}
                  </span>
                </div>
              )}
              {syncStatus.recent_syncs.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">最近同步记录</p>
                  <div className="space-y-2">
                    {syncStatus.recent_syncs.map((sync, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {sync.status === 'success' ? (
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span className="text-muted-foreground">
                          {new Date(sync.at).toLocaleString('zh-CN')}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {sync.action}
                        </Badge>
                        {sync.error && <span className="text-red-500">{sync.error}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Associated Models */}
      {provider.models.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              关联模型
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {provider.models.map((model) => (
                <Badge key={model.id} variant="secondary">
                  {model.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
