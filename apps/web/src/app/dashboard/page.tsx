import { Cpu, KeyRound, Activity, Coins, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

// Mock data - will be replaced with real API calls
const stats = [
  {
    title: '模型数量',
    value: '24',
    change: '+3',
    trend: 'up' as const,
    icon: Cpu,
    href: '/dashboard/models',
    description: '已注册模型',
  },
  {
    title: 'Virtual Key',
    value: '12',
    change: '+2',
    trend: 'up' as const,
    icon: KeyRound,
    href: '/dashboard/keys',
    description: '活跃密钥',
  },
  {
    title: '今日调用',
    value: '8,429',
    change: '+12.5%',
    trend: 'up' as const,
    icon: Activity,
    href: '/dashboard/usage',
    description: 'API 请求次数',
  },
  {
    title: '今日 Token',
    value: '1.2M',
    change: '-3.2%',
    trend: 'down' as const,
    icon: Coins,
    href: '/dashboard/usage',
    description: 'Token 消耗总量',
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">控制面板概览</h1>
        <p className="text-muted-foreground">AIHub 平台运行状态一览</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="transition-colors hover:bg-accent/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {stat.trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={stat.trend === 'up' ? 'text-emerald-500' : 'text-red-500'}>
                    {stat.change}
                  </span>{' '}
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full lg:col-span-2">
          <CardHeader>
            <CardTitle>快速开始</CardTitle>
            <CardDescription>常用操作入口</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
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
