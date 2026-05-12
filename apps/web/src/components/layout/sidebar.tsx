'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Boxes,
  KeyRound,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const navItems = [
  { href: '/dashboard', label: '概览', icon: LayoutDashboard },
  { href: '/dashboard/models', label: '模型目录', icon: Boxes },
  { href: '/dashboard/keys', label: 'Virtual Key', icon: KeyRound },
  { href: '/dashboard/usage', label: '用量统计', icon: BarChart3 },
  { href: '/dashboard/settings', label: '设置', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'hidden md:flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200',
          collapsed ? 'w-16' : 'w-56',
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            'flex items-center h-14 px-4 border-b border-sidebar-border',
            collapsed ? 'justify-center' : 'gap-2',
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm">
            AI
          </div>
          {!collapsed && <span className="font-semibold text-sm">AIHub</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const link = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                  collapsed && 'justify-center px-0',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              )
            }
            return link
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-8"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
