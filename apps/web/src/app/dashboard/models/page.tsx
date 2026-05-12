'use client'

import { useState } from 'react'
import {
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Eye,
  MessageSquare,
  Code2,
  Image,
  Zap,
  Trash2,
  Pencil,
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
import useSWR from 'swr'
import { modelsApi } from '@/lib/api/models'
import { providersApi } from '@/lib/api/providers'
import type { Model, CreateModelInput } from '@/lib/api/types'

const capabilityLabels: Record<string, { icon: typeof Eye; label: string }> = {
  chat: { icon: MessageSquare, label: '对话' },
  vision: { icon: Eye, label: '视觉' },
  function_calling: { icon: Code2, label: '工具' },
  embedding: { icon: Zap, label: '嵌入' },
  image: { icon: Image, label: '图像' },
}

const capabilityOptions = ['chat', 'vision', 'function_calling', 'embedding']

export default function ModelsPage() {
  const [search, setSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Register model dialog
  const [registerOpen, setRegisterOpen] = useState(false)
  const [formProviderId, setFormProviderId] = useState('')
  const [formModelName, setFormModelName] = useState('')
  const [formDisplayName, setFormDisplayName] = useState('')
  const [formCapabilities, setFormCapabilities] = useState<string[]>([])
  const [formContextWindow, setFormContextWindow] = useState('')
  const [formInputPrice, setFormInputPrice] = useState('')
  const [formOutputPrice, setFormOutputPrice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Alias dialog
  const [aliasOpen, setAliasOpen] = useState(false)
  const [aliasModelId, setAliasModelId] = useState('')
  const [aliasModelName, setAliasModelName] = useState('')
  const [aliasValue, setAliasValue] = useState('')
  const [aliasSubmitting, setAliasSubmitting] = useState(false)

  // Fetch models (skip SSR)
  const {
    data: modelsData,
    mutate: mutateModels,
    isLoading,
  } = useSWR(typeof window !== 'undefined' ? 'models' : null, () => modelsApi.list({ limit: 100 }))

  // Fetch providers for filter and form (skip SSR)
  const { data: providersData } = useSWR(
    typeof window !== 'undefined' ? 'providers-list' : null,
    () => providersApi.list({ limit: 100 }),
  )

  const models = modelsData?.data ?? []
  const providers = providersData?.data ?? []

  // Build unique provider names from models
  const providerNames = [...new Set(models.map((m: Model) => m.provider_name))]

  const filtered = models.filter((model: Model) => {
    const matchesSearch = model.name.toLowerCase().includes(search.toLowerCase())
    const matchesProvider = providerFilter === 'all' || model.provider_name === providerFilter
    const matchesStatus = statusFilter === 'all' || model.status === statusFilter
    return matchesSearch && matchesProvider && matchesStatus
  })

  function toggleCapability(cap: string) {
    setFormCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap],
    )
  }

  async function handleRegister() {
    if (!formProviderId || !formModelName) {
      toast.error('请填写必填字段')
      return
    }
    setSubmitting(true)
    try {
      const input: CreateModelInput = {
        provider_id: formProviderId,
        name: formModelName,
        display_name: formDisplayName || undefined,
        capabilities: formCapabilities,
        context_window: formContextWindow ? Number(formContextWindow) : undefined,
        pricing:
          formInputPrice || formOutputPrice
            ? {
                input_per_1k: Number(formInputPrice) || 0,
                output_per_1k: Number(formOutputPrice) || 0,
              }
            : undefined,
      }
      await modelsApi.create(input)
      toast.success(`模型 "${formModelName}" 注册成功`)
      setRegisterOpen(false)
      resetForm()
      mutateModels()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '注册失败')
    } finally {
      setSubmitting(false)
    }
  }

  function resetForm() {
    setFormProviderId('')
    setFormModelName('')
    setFormDisplayName('')
    setFormCapabilities([])
    setFormContextWindow('')
    setFormInputPrice('')
    setFormOutputPrice('')
  }

  function openAliasDialog(modelId: string, modelName: string) {
    setAliasModelId(modelId)
    setAliasModelName(modelName)
    setAliasValue('')
    setAliasOpen(true)
  }

  async function handleCreateAlias() {
    if (!aliasValue) {
      toast.error('请输入别名')
      return
    }
    setAliasSubmitting(true)
    try {
      await modelsApi.createAlias({ alias: aliasValue, model_id: aliasModelId })
      toast.success(`别名 "${aliasValue}" 创建成功`)
      setAliasOpen(false)
      mutateModels()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '创建失败')
    } finally {
      setAliasSubmitting(false)
    }
  }

  async function handleDeleteModel(id: string, name: string) {
    if (!confirm(`确认删除模型 "${name}"？此操作不可撤销。`)) return
    try {
      await modelsApi.delete(id)
      toast.success(`模型 "${name}" 已删除`)
      mutateModels()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : '删除失败')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">模型目录</h1>
          <p className="text-muted-foreground">管理平台已注册的所有 AI 模型</p>
        </div>

        <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              注册模型
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>注册新模型</DialogTitle>
              <DialogDescription>选择供应商并填写模型信息</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>供应商 *</Label>
                <Select value={formProviderId} onValueChange={setFormProviderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择供应商" />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>模型 ID *</Label>
                  <Input
                    placeholder="gpt-4o"
                    value={formModelName}
                    onChange={(e) => setFormModelName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>显示名称</Label>
                  <Input
                    placeholder="GPT-4o"
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>能力标签</Label>
                <div className="flex flex-wrap gap-2">
                  {capabilityOptions.map((cap) => {
                    const info = capabilityLabels[cap]
                    const selected = formCapabilities.includes(cap)
                    return (
                      <Badge
                        key={cap}
                        variant={selected ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleCapability(cap)}
                      >
                        {info && <info.icon className="mr-1 h-3 w-3" />}
                        {info?.label ?? cap}
                      </Badge>
                    )
                  })}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>上下文窗口</Label>
                  <Input
                    type="number"
                    placeholder="128000"
                    value={formContextWindow}
                    onChange={(e) => setFormContextWindow(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>输入价格/1K</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="2.50"
                    value={formInputPrice}
                    onChange={(e) => setFormInputPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>输出价格/1K</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="10.00"
                    value={formOutputPrice}
                    onChange={(e) => setFormOutputPrice(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRegisterOpen(false)}>
                取消
              </Button>
              <Button onClick={handleRegister} disabled={submitting}>
                {submitting ? '注册中...' : '注册'}
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
            placeholder="搜索模型名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="供应商筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部供应商</SelectItem>
            {providerNames.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[120px]">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="active">可用</SelectItem>
            <SelectItem value="deprecated">弃用</SelectItem>
            <SelectItem value="hidden">隐藏</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            模型列表
            <Badge variant="secondary" className="ml-2">
              {filtered.length}
            </Badge>
          </CardTitle>
          <CardDescription>共 {models.length} 个已注册模型</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>模型名称</TableHead>
                  <TableHead>供应商</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>能力</TableHead>
                  <TableHead className="text-right">输入价</TableHead>
                  <TableHead className="text-right">输出价</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      没有匹配的模型
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((model: Model) => {
                    const pricing = model.pricing as {
                      input_per_1k: number
                      output_per_1k: number
                    } | null
                    return (
                      <TableRow key={model.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium font-mono text-sm">{model.name}</span>
                            {model.display_name && (
                              <span className="ml-2 text-sm text-muted-foreground">
                                ({model.display_name})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{model.provider_name}</Badge>
                        </TableCell>
                        <TableCell>
                          {model.status === 'active' ? (
                            <span className="flex items-center gap-1.5 text-sm text-emerald-500">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              可用
                            </span>
                          ) : model.status === 'deprecated' ? (
                            <span className="flex items-center gap-1.5 text-sm text-yellow-500">
                              <XCircle className="h-3.5 w-3.5" />
                              弃用
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                              <XCircle className="h-3.5 w-3.5" />
                              隐藏
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {model.capabilities.map((cap: string) => {
                              const info = capabilityLabels[cap]
                              if (!info) return null
                              const Icon = info.icon
                              return (
                                <Badge key={cap} variant="secondary" className="gap-1 text-xs">
                                  <Icon className="h-3 w-3" />
                                  {info.label}
                                </Badge>
                              )
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {pricing ? `$${pricing.input_per_1k}/1M` : '-'}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {pricing ? `$${pricing.output_per_1k}/1M` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openAliasDialog(model.id, model.name)}
                              title="添加别名"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDeleteModel(model.id, model.name)}
                              title="删除模型"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </div>
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

      {/* Alias Dialog */}
      <Dialog open={aliasOpen} onOpenChange={setAliasOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>添加别名</DialogTitle>
            <DialogDescription>
              为模型 <span className="font-mono">{aliasModelName}</span> 添加别名映射
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>别名 *</Label>
              <Input
                placeholder="例: gpt4"
                value={aliasValue}
                onChange={(e) => setAliasValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                代理请求可通过别名路由到 {aliasModelName}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAliasOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCreateAlias} disabled={aliasSubmitting}>
              {aliasSubmitting ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
