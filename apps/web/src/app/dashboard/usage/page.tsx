'use client'

import { useState, useMemo } from 'react'
import { CalendarDays, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import useSWR from 'swr'
import { usageApi } from '@/lib/api/usage'
import { keysApi } from '@/lib/api/keys'
import type { UsageGroupSummary } from '@/lib/api/types'

function formatTokens(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
  return num.toString()
}

function getDateRange(timeRange: string): { startDate: string; endDate: string } {
  const now = new Date()
  const endDate = now.toISOString()
  const startDate = new Date()

  switch (timeRange) {
    case '24h':
      startDate.setHours(startDate.getHours() - 24)
      break
    case '7d':
      startDate.setDate(startDate.getDate() - 7)
      break
    case '30d':
      startDate.setDate(startDate.getDate() - 30)
      break
    case '90d':
      startDate.setDate(startDate.getDate() - 90)
      break
    default:
      startDate.setDate(startDate.getDate() - 7)
  }

  return { startDate: startDate.toISOString(), endDate }
}

// Bar chart component using divs
function UsageBarChart({ data }: { data: UsageGroupSummary[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
        暂无数据
      </div>
    )
  }

  const maxTokens = Math.max(...data.map((d) => d.total_tokens))
  return (
    <div className="flex items-end gap-2 h-[200px] w-full">
      {data.slice(0, 15).map((item, i) => {
        const label =
          item.group_key.length > 12
            ? '...' + item.group_key.slice(-10)
            : item.group_key || 'unknown'
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1 group relative">
            <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              {formatTokens(item.total_tokens)}
            </span>
            <div
              className="w-full rounded-t-md bg-primary/80 hover:bg-primary transition-colors min-h-[4px] cursor-pointer"
              style={{ height: `${(item.total_tokens / maxTokens) * 160}px` }}
              title={`${item.group_key}: ${formatTokens(item.total_tokens)} tokens (${item.request_count} requests)`}
            />
            <span
              className="text-xs text-muted-foreground truncate w-full text-center"
              title={item.group_key}
            >
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function UsagePage() {
  const [timeRange, setTimeRange] = useState('7d')
  const dateRange = useMemo(() => getDateRange(timeRange), [timeRange])

  // Fetch usage summary grouped by model
  const { data: modelSummary, isLoading: loadingModel } = useSWR(
    typeof window !== 'undefined' ? `usage-model-${timeRange}` : null,
    () =>
      usageApi.summary({
        group_by: 'model',
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
      }),
  )

  // Fetch usage summary grouped by key
  const { data: keySummary, isLoading: loadingKey } = useSWR(
    typeof window !== 'undefined' ? `usage-key-${timeRange}` : null,
    () =>
      usageApi.summary({
        group_by: 'virtual_key',
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
      }),
  )

  // Fetch virtual keys to resolve names
  const { data: keysData } = useSWR(typeof window !== 'undefined' ? 'keys-for-usage' : null, () =>
    keysApi.list({ limit: 100 }),
  )

  // Build key name lookup
  const keyNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    if (keysData?.data) {
      for (const key of keysData.data) {
        map[key.id] = key.name
      }
    }
    return map
  }, [keysData])

  const modelData = modelSummary?.data ?? []
  const keyData = keySummary?.data ?? []

  // Aggregate totals
  const totalTokens = modelData.reduce((sum, d) => sum + d.total_tokens, 0)
  const totalRequests = modelData.reduce((sum, d) => sum + d.request_count, 0)
  const avgPerRequest = totalRequests > 0 ? Math.round(totalTokens / totalRequests) : 0

  const isLoading = loadingModel || loadingKey

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="mt-2 h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">用量统计</h1>
          <p className="text-muted-foreground">监控平台 Token 消耗和 API 使用趋势</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[160px]">
            <CalendarDays className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">最近 24 小时</SelectItem>
            <SelectItem value="7d">最近 7 天</SelectItem>
            <SelectItem value="30d">最近 30 天</SelectItem>
            <SelectItem value="90d">最近 90 天</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">总 Token 消耗</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTokens(totalTokens)}</div>
            <p className="text-xs text-muted-foreground">
              共 {totalRequests.toLocaleString()} 次请求
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">总请求次数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">涵盖 {modelData.length} 个模型</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">平均 Token/请求</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTokens(avgPerRequest)}</div>
            <p className="text-xs text-muted-foreground">活跃 Key: {keyData.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Token 消耗趋势</CardTitle>
          <CardDescription>按模型维度的 Token 使用量（Top 15）</CardDescription>
        </CardHeader>
        <CardContent>
          <UsageBarChart data={modelData} />
        </CardContent>
      </Card>

      <Tabs defaultValue="model" className="space-y-4">
        <TabsList>
          <TabsTrigger value="model">按模型</TabsTrigger>
          <TabsTrigger value="key">按 Key</TabsTrigger>
        </TabsList>

        <TabsContent value="model">
          <Card>
            <CardHeader>
              <CardTitle>模型用量排行</CardTitle>
              <CardDescription>按 Token 消耗量排列的模型使用排行</CardDescription>
            </CardHeader>
            <CardContent>
              {modelData.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-muted-foreground">
                  当前时间范围内暂无用量数据
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>排名</TableHead>
                      <TableHead>模型名称</TableHead>
                      <TableHead>Token 消耗</TableHead>
                      <TableHead>请求数</TableHead>
                      <TableHead>占比</TableHead>
                      <TableHead className="w-[200px]">分布</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modelData.map((model, i) => {
                      const percentage =
                        totalTokens > 0 ? Math.round((model.total_tokens / totalTokens) * 100) : 0
                      return (
                        <TableRow key={model.group_key}>
                          <TableCell className="font-medium">
                            <Badge variant={i < 3 ? 'default' : 'secondary'}>{i + 1}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {model.group_key || 'unknown'}
                          </TableCell>
                          <TableCell>{formatTokens(model.total_tokens)}</TableCell>
                          <TableCell>{model.request_count.toLocaleString()}</TableCell>
                          <TableCell>{percentage}%</TableCell>
                          <TableCell>
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="key">
          <Card>
            <CardHeader>
              <CardTitle>Key 用量排行</CardTitle>
              <CardDescription>按 Token 消耗量排列的密钥使用排行</CardDescription>
            </CardHeader>
            <CardContent>
              {keyData.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-muted-foreground">
                  当前时间范围内暂无用量数据
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>排名</TableHead>
                      <TableHead>Key 名称</TableHead>
                      <TableHead>Token 消耗</TableHead>
                      <TableHead>请求数</TableHead>
                      <TableHead>占比</TableHead>
                      <TableHead className="w-[200px]">分布</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keyData.map((key, i) => {
                      const percentage =
                        totalTokens > 0 ? Math.round((key.total_tokens / totalTokens) * 100) : 0
                      const displayName = keyNameMap[key.group_key] || key.group_key.slice(-8)
                      return (
                        <TableRow key={key.group_key}>
                          <TableCell className="font-medium">
                            <Badge variant={i < 3 ? 'default' : 'secondary'}>{i + 1}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{displayName}</TableCell>
                          <TableCell>{formatTokens(key.total_tokens)}</TableCell>
                          <TableCell>{key.request_count.toLocaleString()}</TableCell>
                          <TableCell>{percentage}%</TableCell>
                          <TableCell>
                            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
