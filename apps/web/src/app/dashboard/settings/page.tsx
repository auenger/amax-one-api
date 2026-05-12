import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">设置</h1>
        <p className="text-muted-foreground text-sm mt-1">平台配置与环境信息</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">系统信息</CardTitle>
          <CardDescription>当前平台运行状态与版本信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">版本</span>
            <Badge variant="outline">v0.1.0</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">网关状态</span>
            <Badge variant="default">运行中</Badge>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">API 地址</span>
            <code className="text-xs bg-muted px-2 py-0.5 rounded">http://localhost:3000</code>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">数据库</span>
            <code className="text-xs bg-muted px-2 py-0.5 rounded">PostgreSQL 16</code>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">缓存</span>
            <code className="text-xs bg-muted px-2 py-0.5 rounded">Redis 7</code>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
