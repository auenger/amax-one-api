import Link from 'next/link'
import { Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold tracking-tighter text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">页面未找到</h2>
        <p className="mt-2 text-muted-foreground">你访问的页面不存在</p>
        <Button className="mt-6" asChild>
          <Link href="/dashboard">
            <Home className="mr-2 h-4 w-4" />
            返回概览
          </Link>
        </Button>
      </div>
    </div>
  )
}
