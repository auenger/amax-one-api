'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Plus,
  Server,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { providersApi } from '@/lib/api/providers'
import type { Provider } from '@/lib/api/types'
import useSWR from 'swr'

const statusConfig = {
  active: { label: '正常', icon: CheckCircle2, color: 'text-emerald-500' },
  degraded: { label: '降级', icon: AlertTriangle, color: 'text-yellow-500' },
  disabled: { label: '停用', icon: XCircle, color: 'text-red-500' },
}

export default function ProvidersPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<'openai' | 'anthropic'>('openai')
  const [formEndpoint, setFormEndpoint] = useState('')
  const [formKey, setFormKey] = useState('')
  const [formKeyWeight, setFormKeyWeight] = useState('100')
  const [submitting, setSubmitting] = useState(false)

  // Fetch providers (skip SSR)
  const { data, mutate, isLoading } = useSWR(
    typeof window !== 'undefined' ? 'providers' : null,
    () => providersApi.list({ limit: 100 }),
  )

  const providers = data?.data ?? []

  const filtered = providers.filter((p: Provider) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    return matchesSearch && matchesStatus
  })

  async function handleCreate() {
    if (!formName || !formEndpoint) {
      toast.error('请填写必填字段')
      return
    }

    setSubmitting(true)
    try {
      await providersApi.create({
        name: formName,
        type: formType,
        endpoint: formEndpoint,
        keys: formKey ? [{ key: formKey, weight: Number(formKeyWeight) || 100 }] : undefined,
      })
      toast.success(`供应商 "${formName}" 创建成功`)
      setDialogOpen(false)
      resetForm()
      mutate()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '创建失败'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setFormName('')
    setFormType('openai')
    setFormEndpoint('')
    setFormKey('')
    setFormKeyWeight('100')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">供应商管理</h1>
          <p className="text-muted-foreground">管理 AI 供应商及其 API Key</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              添加供应商
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>添加新供应商</DialogTitle>
              <DialogDescription>配置供应商连接信息和初始 API Key</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">名称 *</Label>
                <Input
                  id="name"
                  placeholder="例: OpenAI Production"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">类型 *</Label>
                <Select
                  value={formType}
                  onValueChange={(v: 'openai' | 'anthropic') => setFormType(v)}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endpoint">Base URL *</Label>
                <Input
                  id="endpoint"
                  placeholder="https://api.openai.com"
                  value={formEndpoint}
                  onChange={(e) => setFormEndpoint(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="key">API Key（可选）</Label>
                <Input
                  id="key"
                  type="password"
                  placeholder="sk-..."
                  value={formKey}
                  onChange={(e) => setFormKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Key 权重</Label>
                <Input
                  id="weight"
                  type="number"
                  min={1}
                  max={1000}
                  value={formKeyWeight}
                  onChange={(e) => setFormKeyWeight(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreate} disabled={submitting}>
                {submitting ? '创建中...' : '创建'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索供应商名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="状态筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="active">正常</SelectItem>
            <SelectItem value="degraded">降级</SelectItem>
            <SelectItem value="disabled">停用</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            供应商列表
            <Badge variant="secondary">{filtered.length}</Badge>
          </CardTitle>
          <CardDescription>共 {providers.length} 个已注册供应商</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      没有匹配的供应商
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((provider: Provider) => {
                    const status = statusConfig[provider.status as keyof typeof statusConfig]
                    const StatusIcon = status?.icon ?? Server
                    return (
                      <TableRow
                        key={provider.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/dashboard/providers/${provider.id}`)}
                      >
                        <TableCell className="font-medium">{provider.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="uppercase text-xs">
                            {provider.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {provider.endpoint}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`flex items-center gap-1.5 text-sm ${status?.color ?? ''}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {status?.label ?? provider.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/dashboard/providers/${provider.id}`)
                            }}
                          >
                            查看
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
