'use client'

import {
  Cpu,
  KeyRound,
  Activity,
  Coins,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Server,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import useSWR from 'swr'
import { dashboardApi } from '@/lib/api/dashboard'
import type { DashboardStats } from '@/lib/api/dashboard'

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  href,
  loading,
}: {
  title: string
  value: string | number
  description: string
  icon: React.ElementType
  href: string
  loading: boolean
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-bold">{value}</div>
          )}
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useSWR<DashboardStats>(
    typeof window !== 'undefined' ? 'dashboard-stats' : null,
    () => dashboardApi.getStats(),
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">控制面板概览</h1>
        <p className="text-muted-foreground">AIHub 平台运行状态一览</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="模型数量"
          value={stats ? `${stats.model_count} (${stats.active_model_count} 可用)` : '-'}
          description="已注册模型"
          icon={Cpu}
          href="/dashboard/models"
          loading={isLoading}
        />
        <StatCard
          title="供应商"
          value={stats?.provider_count ?? '-'}
          description="已接入供应商"
          icon={Server}
          href="/dashboard/providers"
          loading={isLoading}
        />
        <StatCard
          title="今日调用"
          value={stats ? formatNumber(stats.today_requests) : '-'}
          description="API 请求次数"
          icon={Activity}
          href="/dashboard/usage"
          loading={isLoading}
        />
        <StatCard
          title="今日 Token"
          value={stats ? formatNumber(stats.today_tokens) : '-'}
          description="Token 消耗总量"
          icon={Coins}
          href="/dashboard/usage"
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full lg:col-span-2">
          <CardHeader>
            <CardTitle>快速开始</CardTitle>
            <CardDescription>常用操作入口</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-4">
              <Link
                href="/dashboard/providers"
                className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <Server className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">供应商管理</span>
                <span className="text-xs text-muted-foreground">接入新供应商</span>
              </Link>
              <Link
                href="/dashboard/models"
                className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <Cpu className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">模型目录</span>
                <span className="text-xs text-muted-foreground">查看和管理模型</span>
              </Link>
              <Link
                href="/dashboard/keys"
                className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <KeyRound className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">密钥管理</span>
                <span className="text-xs text-muted-foreground">创建和管理 Key</span>
              </Link>
              <Link
                href="/dashboard/usage"
                className="flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors hover:bg-accent"
              >
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium">用量统计</span>
                <span className="text-xs text-muted-foreground">查看使用趋势</span>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>系统状态</CardTitle>
            <CardDescription>平台运行状态</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">API 网关</span>
                <span className="flex items-center gap-1.5 text-sm text-emerald-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  正常运行
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">数据库</span>
                <span className="flex items-center gap-1.5 text-sm text-emerald-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  正常运行
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Redis 缓存</span>
                <span className="flex items-center gap-1.5 text-sm text-emerald-500">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  正常运行
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
