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
  Trash2,
  Ban,
  RotateCcw,
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type KeyStatus = 'active' | 'revoked' | 'expired'

interface VirtualKey {
  id: string
  name: string
  keyPrefix: string
  status: KeyStatus
  scope: string
  budgetLimit: string
  createdAt: string
  lastUsed: string
}

// Mock data
const mockKeys: VirtualKey[] = [
  {
    id: '1',
    name: 'Production API',
    keyPrefix: 'vk-prod-****7a3f',
    status: 'active',
    scope: 'full',
    budgetLimit: '$500/month',
    createdAt: '2026-05-01',
    lastUsed: '2 分钟前',
  },
  {
    id: '2',
    name: 'Development',
    keyPrefix: 'vk-dev-****2b8e',
    status: 'active',
    scope: 'models_only',
    budgetLimit: '$50/month',
    createdAt: '2026-05-03',
    lastUsed: '1 小时前',
  },
  {
    id: '3',
    name: 'Testing Bot',
    keyPrefix: 'vk-test-****9c1d',
    status: 'revoked',
    scope: 'full',
    budgetLimit: '$20/month',
    createdAt: '2026-04-15',
    lastUsed: '3 天前',
  },
  {
    id: '4',
    name: 'Analytics Service',
    keyPrefix: 'vk-svc-****4e5f',
    status: 'active',
    scope: 'usage_read',
    budgetLimit: '$100/month',
    createdAt: '2026-05-08',
    lastUsed: '15 分钟前',
  },
  {
    id: '5',
    name: 'Legacy Integration',
    keyPrefix: 'vk-leg-****6g2h',
    status: 'expired',
    scope: 'full',
    budgetLimit: '$200/month',
    createdAt: '2026-01-10',
    lastUsed: '30 天前',
  },
]

const statusConfig: Record<KeyStatus, { label: string; color: string; icon: typeof CheckCircle2 }> =
  {
    active: { label: '活跃', color: 'text-emerald-500', icon: CheckCircle2 },
    revoked: { label: '已撤销', color: 'text-red-500', icon: XCircle },
    expired: { label: '已过期', color: 'text-yellow-500', icon: Clock },
  }

const scopeLabels: Record<string, string> = {
  full: '完全访问',
  models_only: '仅模型',
  usage_read: '仅读取用量',
}

export default function KeysPage() {
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyScope, setNewKeyScope] = useState('full')

  const filtered = mockKeys.filter((key) => key.name.toLowerCase().includes(search.toLowerCase()))

  const handleCreateKey = () => {
    // Will be replaced with real API call
    setDialogOpen(false)
    setNewKeyName('')
    setNewKeyScope('full')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Virtual Key 管理</h1>
          <p className="text-muted-foreground">创建和管理 API 访问密钥</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              创建 Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建 Virtual Key</DialogTitle>
              <DialogDescription>创建新的 API 密钥用于访问 AIHub 平台</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="key-name">密钥名称</Label>
                <Input
                  id="key-name"
                  placeholder="例如：Production API"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="key-scope">权限范围</Label>
                <Select value={newKeyScope} onValueChange={setNewKeyScope}>
                  <SelectTrigger id="key-scope">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">完全访问</SelectItem>
                    <SelectItem value="models_only">仅模型</SelectItem>
                    <SelectItem value="usage_read">仅读取用量</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreateKey} disabled={!newKeyName.trim()}>
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜索 Key 名称..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 max-w-sm"
        />
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
                <TableHead>创建时间</TableHead>
                <TableHead>最后使用</TableHead>
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
                  const status = statusConfig[key.status]
                  const StatusIcon = status.icon
                  return (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                          {key.keyPrefix}
                        </code>
                      </TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1.5 text-sm ${status.color}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{scopeLabels[key.scope]}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{key.budgetLimit}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {key.createdAt}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {key.lastUsed}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4" />
                              复制 Key
                            </DropdownMenuItem>
                            {key.status === 'active' && (
                              <DropdownMenuItem>
                                <Ban className="mr-2 h-4 w-4" />
                                撤销
                              </DropdownMenuItem>
                            )}
                            {key.status === 'revoked' && (
                              <DropdownMenuItem>
                                <RotateCcw className="mr-2 h-4 w-4" />
                                重新启用
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" />
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
    </div>
  )
}
