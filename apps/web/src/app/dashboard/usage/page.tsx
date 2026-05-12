'use client'

import { useState } from 'react'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Mock trend data
const dailyUsage = [
  { date: '05/06', tokens: 820000, requests: 5200 },
  { date: '05/07', tokens: 950000, requests: 6100 },
  { date: '05/08', tokens: 780000, requests: 4800 },
  { date: '05/09', tokens: 1100000, requests: 7200 },
  { date: '05/10', tokens: 1250000, requests: 8400 },
  { date: '05/11', tokens: 690000, requests: 4100 },
  { date: '05/12', tokens: 1200000, requests: 8429 },
]

const modelRanking = [
  { name: 'gpt-4o', tokens: 4200000, percentage: 35, trend: 'up' as const },
  { name: 'claude-sonnet-4', tokens: 2800000, percentage: 23, trend: 'up' as const },
  { name: 'gpt-4o-mini', tokens: 2100000, percentage: 18, trend: 'down' as const },
  { name: 'deepseek-v3', tokens: 1500000, percentage: 13, trend: 'up' as const },
  { name: 'text-embedding-3-large', tokens: 840000, percentage: 7, trend: 'down' as const },
  { name: '其他', tokens: 560000, percentage: 4, trend: 'stable' as const },
]

const keyRanking = [
  { name: 'Production API', tokens: 5100000, percentage: 43, trend: 'up' as const },
  { name: 'Analytics Service', tokens: 3200000, percentage: 27, trend: 'up' as const },
  { name: 'Development', tokens: 1800000, percentage: 15, trend: 'down' as const },
  { name: 'Testing Bot', tokens: 1200000, percentage: 10, trend: 'down' as const },
  { name: 'Legacy Integration', tokens: 600000, percentage: 5, trend: 'stable' as const },
]

function formatTokens(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
  return num.toString()
}

// Simple bar chart component using CSS
function SimpleBarChart({
  data,
  maxVal,
}: {
  data: { value: number; label: string }[]
  maxVal: number
}) {
  return (
    <div className="flex items-end gap-2 h-[200px] w-full">
      {data.map((item, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">{formatTokens(item.value)}</span>
          <div
            className="w-full rounded-t-md bg-primary/80 hover:bg-primary transition-colors min-h-[4px]"
            style={{ height: `${(item.value / maxVal) * 160}px` }}
          />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function UsagePage() {
  const [timeRange, setTimeRange] = useState('7d')

  const maxTokens = Math.max(...dailyUsage.map((d) => d.tokens))
  const totalTokens = dailyUsage.reduce((sum, d) => sum + d.tokens, 0)
  const totalRequests = dailyUsage.reduce((sum, d) => sum + d.requests, 0)
  const avgDaily = Math.round(totalTokens / dailyUsage.length)

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
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-500">+18.2%</span> vs 上一周期
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">总请求次数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRequests.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-500">+12.5%</span> vs 上一周期
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">日均消耗</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatTokens(avgDaily)}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowDownRight className="h-3 w-3 text-red-500" />
              <span className="text-red-500">-3.2%</span> vs 上一周期
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Token 消耗趋势</CardTitle>
          <CardDescription>每日 Token 使用量</CardDescription>
        </CardHeader>
        <CardContent>
          <SimpleBarChart
            data={dailyUsage.map((d) => ({ value: d.tokens, label: d.date }))}
            maxVal={maxTokens}
          />
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>排名</TableHead>
                    <TableHead>模型名称</TableHead>
                    <TableHead>Token 消耗</TableHead>
                    <TableHead>占比</TableHead>
                    <TableHead>趋势</TableHead>
                    <TableHead className="w-[200px]">分布</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelRanking.map((model, i) => (
                    <TableRow key={model.name}>
                      <TableCell className="font-medium">
                        <Badge variant={i < 3 ? 'default' : 'secondary'}>{i + 1}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{model.name}</TableCell>
                      <TableCell>{formatTokens(model.tokens)}</TableCell>
                      <TableCell>{model.percentage}%</TableCell>
                      <TableCell>
                        {model.trend === 'up' ? (
                          <span className="flex items-center gap-1 text-emerald-500 text-sm">
                            <TrendingUp className="h-3.5 w-3.5" />
                            上升
                          </span>
                        ) : model.trend === 'down' ? (
                          <span className="flex items-center gap-1 text-red-500 text-sm">
                            <ArrowDownRight className="h-3.5 w-3.5" />
                            下降
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">持平</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${model.percentage}%` }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>排名</TableHead>
                    <TableHead>Key 名称</TableHead>
                    <TableHead>Token 消耗</TableHead>
                    <TableHead>占比</TableHead>
                    <TableHead>趋势</TableHead>
                    <TableHead className="w-[200px]">分布</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keyRanking.map((key, i) => (
                    <TableRow key={key.name}>
                      <TableCell className="font-medium">
                        <Badge variant={i < 3 ? 'default' : 'secondary'}>{i + 1}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>{formatTokens(key.tokens)}</TableCell>
                      <TableCell>{key.percentage}%</TableCell>
                      <TableCell>
                        {key.trend === 'up' ? (
                          <span className="flex items-center gap-1 text-emerald-500 text-sm">
                            <TrendingUp className="h-3.5 w-3.5" />
                            上升
                          </span>
                        ) : key.trend === 'down' ? (
                          <span className="flex items-center gap-1 text-red-500 text-sm">
                            <ArrowDownRight className="h-3.5 w-3.5" />
                            下降
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">持平</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${key.percentage}%` }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
