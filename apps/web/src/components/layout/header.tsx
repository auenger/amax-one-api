'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Sun, Moon, Menu, X } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Boxes, KeyRound, BarChart3 } from 'lucide-react'
import { useState } from 'react'

const breadcrumbMap: Record<string, string> = {
  '/dashboard': '概览',
  '/dashboard/models': '模型目录',
  '/dashboard/keys': 'Virtual Key',
  '/dashboard/usage': '用量统计',
  '/dashboard/settings': '设置',
}

const mobileNavItems = [
  { href: '/dashboard', label: '概览', icon: LayoutDashboard },
  { href: '/dashboard/models', label: '模型目录', icon: Boxes },
  { href: '/dashboard/keys', label: 'Virtual Key', icon: KeyRound },
  { href: '/dashboard/usage', label: '用量统计', icon: BarChart3 },
]

export function Header() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)

  const pageName = breadcrumbMap[pathname] || '概览'

  return (
    <header className="flex items-center h-14 px-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Mobile menu */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden mr-2">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-56 p-0">
          <div className="flex items-center justify-between h-14 px-4 border-b">
            <span className="font-semibold">AIHub</span>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <nav className="py-4 px-2 space-y-1">
            {mobileNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50',
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/dashboard"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Dashboard
        </Link>
        {pathname !== '/dashboard' && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">{pageName}</span>
          </>
        )}
        {pathname === '/dashboard' && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="font-medium">{pageName}</span>
          </>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="h-8 w-8"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  )
}
