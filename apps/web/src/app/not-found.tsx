import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-7xl font-bold tracking-tighter text-primary">404</h1>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">页面未找到</h2>
        <p className="mt-2 text-muted-foreground">你访问的页面不存在或已被移除</p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button variant="outline" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              返回首页
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              进入控制台
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
