'use client'

import { useState } from 'react'
import {
  Plus,
  Search,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Ban,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import useSWR from 'swr'
import { keysApi } from '@/lib/api/keys'
import { modelsApi } from '@/lib/api/models'
import { providersApi } from '@/lib/api/providers'
import type { VirtualKey, CreateVirtualKeyInput } from '@/lib/api/types'

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  active: { label: '活跃', color: 'text-emerald-500', icon: CheckCircle2 },
  revoked: { label: '已撤销', color: 'text-red-500', icon: XCircle },
  expired: { label: '已过期', color: 'text-yellow-500', icon: Clock },
}

const scopeLabels: Record<string, string> = {
  chat: '对话',
  embeddings: '嵌入',
}

function formatBudget(budget: { token_limit: number; reset_at: string } | null): string {
  if (!budget) return '无限制'
  const limit = budget.token_limit
  if (limit >= 1000000) return `${(limit / 1000000).toFixed(0)}M tokens`
  if (limit >= 1000) return `${(limit / 1000).toFixed(0)}K tokens`
  return `${limit} tokens`
}

export default function KeysPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Create dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formName, setFormName] = useState('')
  const [formScopes, setFormScopes] = useState<string[]>(['chat'])
  const [formBudgetLimit, setFormBudgetLimit] = useState('')
  const [formExpiresAt, setFormExpiresAt] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Key reveal dialog
  const [revealDialogOpen, setRevealDialogOpen] = useState(false)
  const [revealedKey, setRevealedKey] = useState('')
  const [revealedKeyName, setRevealedKeyName] = useState('')
  const [keyVisible, setKeyVisible] = useState(false)

  // Detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [detailKey, setDetailKey] = useState<VirtualKey | null>(null)

  // Fetch keys
  const {
    data: keysData,
    mutate: mutateKeys,
    isLoading,
  } = useSWR(typeof window !== 'undefined' ? `keys-${statusFilter}` : null, () => {
    const params: { status?: string; limit: number } = { limit: 100 }
    if (statusFilter !== 'all') params.status = statusFilter
    return keysApi.list(params)
  })

  // Fetch models and providers for the create form
  const { data: modelsData } = useSWR(
    typeof window !== 'undefined' && dialogOpen ? 'models-for-keys' : null,
    () => modelsApi.list({ limit: 100 }),
  )

  const { data: providersData } = useSWR(
    typeof window !== 'undefined' && dialogOpen ? 'providers-for-keys' : null,
    () => providersApi.list({ limit: 100 }),
  )

  const keys = keysData?.data ?? []
  const filtered = keys.filter((key) => key.name.toLowerCase().includes(search.toLowerCase()))

  const handleCreateKey = async () => {
    if (!formName.trim()) {
      toast.error('请输入密钥名称')
      return
    }
    if (formScopes.length === 0) {
      toast.error('请选择至少一个权限范围')
      return
    }

    setSubmitting(true)
    try {
      const input: CreateVirtualKeyInput = {
        name: formName.trim(),
        scopes: formScopes,
      }

      if (formBudgetLimit && Number(formBudgetLimit) > 0) {
        const resetDate = new Date()
        resetDate.setMonth(resetDate.getMonth() + 1)
        input.budget = {
          token_limit: Number(formBudgetLimit),
          reset_at: resetDate.toISOString(),
        }
      }

      if (formExpiresAt) {
        input.expires_at = new Date(formExpiresAt).toISOString()
      }

      const result = await keysApi.create(input)
      toast.success(`Virtual Key "${result.name}" 创建成功`)

      // Show the key one-time reveal dialog
      setRevealedKey(result.key)
      setRevealedKeyName(result.name)
      setKeyVisible(false)
      setRevealDialogOpen(true)

      // Reset form
      setFormName('')
      setFormScopes(['chat'])
      setFormBudgetLimit('')
      setFormExpiresAt('')
      setDialogOpen(false)

      mutateKeys()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async (id: string, name: string) => {
    try {
      await keysApi.revoke(id)
      toast.success(`Key "${name}" 已撤销`)
      mutateKeys()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '撤销失败')
    }
  }

  const handleReactivate = async (key: VirtualKey) => {
    try {
      await keysApi.update(key.id, {
        scopes: key.scopes,
      })
      toast.success(`Key "${key.name}" 已重新启用`)
      mutateKeys()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '启用失败')
    }
  }

  const copyKey = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('已复制到剪贴板')
  }

  const showDetail = (key: VirtualKey) => {
    setDetailKey(key)
    setDetailDialogOpen(true)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <Skeleton className="h-10 w-72" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="mb-2 h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Virtual Key 管理</h1>
          <p className="text-muted-foreground">创建和管理 API 访问密钥</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          创建 Key
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索 Key 名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 max-w-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">活跃</SelectItem>
            <SelectItem value="revoked">已撤销</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            密钥列表
            <Badge variant="secondary" className="ml-2">
              {filtered.length}
            </Badge>
          </CardTitle>
          <CardDescription>管理所有 Virtual Key 的状态和权限</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>Key 前缀</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>权限</TableHead>
                <TableHead>预算</TableHead>
                <TableHead>过期时间</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    没有匹配的密钥
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((key) => {
                  const statusKey =
                    key.expires_at && new Date(key.expires_at) < new Date() ? 'expired' : key.status
                  const status = statusConfig[statusKey] || statusConfig[key.status]
                  const StatusIcon = status.icon
                  return (
                    <TableRow
                      key={key.id}
                      className="cursor-pointer"
                      onClick={() => showDetail(key)}
                    >
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                          {key.key_prefix}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1.5 text-sm ${status.color}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {key.scopes.map((scope) => (
                            <Badge key={scope} variant="outline">
                              {scopeLabels[scope] || scope}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{formatBudget(key.budget)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {key.expires_at
                          ? new Date(key.expires_at).toLocaleDateString('zh-CN')
                          : '永不过期'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(key.created_at).toLocaleDateString('zh-CN')}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => copyKey(key.key_prefix)}>
                              <Copy className="mr-2 h-4 w-4" />
                              复制前缀
                            </DropdownMenuItem>
                            {key.status === 'active' && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRevoke(key.id, key.name)
                                }}
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                撤销
                              </DropdownMenuItem>
                            )}
                            {key.status === 'revoked' && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleReactivate(key)
                                }}
                              >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                重新启用
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>创建 Virtual Key</DialogTitle>
            <DialogDescription>创建新的 API 密钥用于访问 AIHub 平台</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="key-name">密钥名称 *</Label>
              <Input
                id="key-name"
                placeholder="例如：Production API"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>权限范围 *</Label>
              <div className="flex gap-2">
                {['chat', 'embeddings'].map((scope) => (
                  <Button
                    key={scope}
                    type="button"
                    variant={formScopes.includes(scope) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setFormScopes((prev) =>
                        prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
                      )
                    }}
                  >
                    {scopeLabels[scope] || scope}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="budget-limit">Token 预算上限（可选）</Label>
              <Input
                id="budget-limit"
                type="number"
                placeholder="例如：1000000 (留空则无限制)"
                value={formBudgetLimit}
                onChange={(e) => setFormBudgetLimit(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                设置后，密钥使用超过此 Token 数将被自动限制
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expires-at">过期时间（可选）</Label>
              <Input
                id="expires-at"
                type="datetime-local"
                value={formExpiresAt}
                onChange={(e) => setFormExpiresAt(e.target.value)}
              />
            </div>

            {/* Available models info */}
            {modelsData?.data && modelsData.data.length > 0 && (
              <div className="grid gap-2">
                <Label>可用模型 ({modelsData.data.length})</Label>
                <p className="text-xs text-muted-foreground">
                  密钥创建后默认可访问所有活跃模型。如需限制，可在创建后编辑路由规则。
                </p>
              </div>
            )}

            {/* Available providers info */}
            {providersData?.data && providersData.data.length > 0 && (
              <div className="grid gap-2">
                <Label>可用供应商 ({providersData.data.length})</Label>
                <p className="text-xs text-muted-foreground">
                  密钥创建后默认可访问所有活跃供应商。
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateKey} disabled={submitting || !formName.trim()}>
              {submitting ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Key Reveal Dialog (one-time display) */}
      <Dialog open={revealDialogOpen} onOpenChange={setRevealDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>密钥创建成功</DialogTitle>
            <DialogDescription>请立即保存以下密钥，关闭后将无法再次查看完整密钥</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>密钥名称</Label>
              <p className="font-medium">{revealedKeyName}</p>
            </div>
            <div className="grid gap-2">
              <Label>完整密钥</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 text-xs font-mono break-all">
                  {keyVisible ? revealedKey : '••••••••••••••••••••••••••••••••'}
                </code>
                <Button variant="outline" size="icon" onClick={() => setKeyVisible(!keyVisible)}>
                  {keyVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => copyKey(revealedKey)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setRevealDialogOpen(false)}>我已保存密钥</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Key Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Key 详情</DialogTitle>
            <DialogDescription>{detailKey?.name}</DialogDescription>
          </DialogHeader>
          {detailKey && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Key 前缀</Label>
                  <code className="mt-1 block rounded bg-muted px-2 py-1 text-xs font-mono">
                    {detailKey.key_prefix}
                  </code>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">状态</Label>
                  <div className="mt-1">
                    <Badge variant={detailKey.status === 'active' ? 'default' : 'secondary'}>
                      {statusConfig[detailKey.status]?.label || detailKey.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs">权限范围</Label>
                <div className="mt-1 flex gap-1">
                  {detailKey.scopes.map((scope) => (
                    <Badge key={scope} variant="outline">
                      {scopeLabels[scope] || scope}
                    </Badge>
                  ))}
                  {detailKey.scopes.length === 0 && (
                    <span className="text-sm text-muted-foreground">未设置</span>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground text-xs">预算</Label>
                <div className="mt-1">
                  {detailKey.budget ? (
                    <div className="space-y-1">
                      <p className="text-sm">限制: {formatBudget(detailKey.budget)}</p>
                      <p className="text-xs text-muted-foreground">
                        重置时间: {new Date(detailKey.budget.reset_at).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  ) : (
                    <span className="text-sm">无限制</span>
                  )}
                </div>
              </div>

              {detailKey.rate_limits && (
                <div>
                  <Label className="text-muted-foreground text-xs">速率限制</Label>
                  <div className="mt-1 flex gap-2">
                    {detailKey.rate_limits.rpm && (
                      <Badge variant="outline">{detailKey.rate_limits.rpm} RPM</Badge>
                    )}
                    {detailKey.rate_limits.tpm && (
                      <Badge variant="outline">{detailKey.rate_limits.tpm} TPM</Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">创建时间</Label>
                  <p className="mt-1 text-sm">
                    {new Date(detailKey.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">过期时间</Label>
                  <p className="mt-1 text-sm">
                    {detailKey.expires_at
                      ? new Date(detailKey.expires_at).toLocaleString('zh-CN')
                      : '永不过期'}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {detailKey?.status === 'active' && (
              <Button
                variant="destructive"
                onClick={() => {
                  if (detailKey) {
                    handleRevoke(detailKey.id, detailKey.name)
                    setDetailDialogOpen(false)
                  }
                }}
              >
                <Ban className="mr-2 h-4 w-4" />
                撤销 Key
              </Button>
            )}
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
