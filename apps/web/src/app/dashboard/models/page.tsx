'use client'

import { useState } from 'react'
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  MessageSquare,
  Code2,
  Image,
  Zap,
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
import { Skeleton } from '@/components/ui/skeleton'

// Mock data
const mockModels = [
  {
    id: '1',
    name: 'gpt-4o',
    provider: 'OpenAI',
    status: 'active',
    capabilities: ['chat', 'vision', 'function_calling'],
    inputPrice: '$2.50/1M',
    outputPrice: '$10.00/1M',
  },
  {
    id: '2',
    name: 'gpt-4o-mini',
    provider: 'OpenAI',
    status: 'active',
    capabilities: ['chat', 'function_calling'],
    inputPrice: '$0.15/1M',
    outputPrice: '$0.60/1M',
  },
  {
    id: '3',
    name: 'claude-sonnet-4-20250514',
    provider: 'Anthropic',
    status: 'active',
    capabilities: ['chat', 'vision', 'function_calling'],
    inputPrice: '$3.00/1M',
    outputPrice: '$15.00/1M',
  },
  {
    id: '4',
    name: 'claude-haiku-4-20250506',
    provider: 'Anthropic',
    status: 'active',
    capabilities: ['chat', 'function_calling'],
    inputPrice: '$0.80/1M',
    outputPrice: '$4.00/1M',
  },
  {
    id: '5',
    name: 'text-embedding-3-large',
    provider: 'OpenAI',
    status: 'active',
    capabilities: ['embedding'],
    inputPrice: '$0.13/1M',
    outputPrice: '-',
  },
  {
    id: '6',
    name: 'gemini-2.5-pro',
    provider: 'Google',
    status: 'inactive',
    capabilities: ['chat', 'vision'],
    inputPrice: '$1.25/1M',
    outputPrice: '$10.00/1M',
  },
  {
    id: '7',
    name: 'deepseek-v3',
    provider: 'DeepSeek',
    status: 'active',
    capabilities: ['chat', 'function_calling'],
    inputPrice: '$0.27/1M',
    outputPrice: '$1.10/1M',
  },
  {
    id: '8',
    name: 'qwen-max',
    provider: 'Alibaba',
    status: 'active',
    capabilities: ['chat', 'function_calling'],
    inputPrice: '$0.40/1M',
    outputPrice: '$1.20/1M',
  },
]

const capabilityIcons: Record<string, { icon: typeof Eye; label: string }> = {
  chat: { icon: MessageSquare, label: '对话' },
  vision: { icon: Eye, label: '视觉' },
  function_calling: { icon: Code2, label: '工具' },
  embedding: { icon: Zap, label: '嵌入' },
  image: { icon: Image, label: '图像' },
}

const providers = ['all', 'OpenAI', 'Anthropic', 'Google', 'DeepSeek', 'Alibaba']

export default function ModelsPage() {
  const [search, setSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState('all')

  const filtered = mockModels.filter((model) => {
    const matchesSearch = model.name.toLowerCase().includes(search.toLowerCase())
    const matchesProvider = providerFilter === 'all' || model.provider === providerFilter
    return matchesSearch && matchesProvider
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">模型目录</h1>
        <p className="text-muted-foreground">管理平台已注册的所有 AI 模型</p>
      </div>

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
            {providers.map((p) => (
              <SelectItem key={p} value={p}>
                {p === 'all' ? '全部供应商' : p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            模型列表
            <Badge variant="secondary" className="ml-2">
              {filtered.length}
            </Badge>
          </CardTitle>
          <CardDescription>共 {mockModels.length} 个已注册模型</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>模型名称</TableHead>
                <TableHead>供应商</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>能力</TableHead>
                <TableHead className="text-right">输入价格</TableHead>
                <TableHead className="text-right">输出价格</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    没有匹配的模型
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((model) => (
                  <TableRow key={model.id}>
                    <TableCell className="font-medium font-mono text-sm">{model.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{model.provider}</Badge>
                    </TableCell>
                    <TableCell>
                      {model.status === 'active' ? (
                        <span className="flex items-center gap-1.5 text-sm text-emerald-500">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          可用
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm text-red-500">
                          <XCircle className="h-3.5 w-3.5" />
                          停用
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {model.capabilities.map((cap) => {
                          const info = capabilityIcons[cap]
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
                    <TableCell className="text-right text-sm">{model.inputPrice}</TableCell>
                    <TableCell className="text-right text-sm">{model.outputPrice}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
