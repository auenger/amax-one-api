'use client'

import { usePathname } from 'next/navigation'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { ThemeToggle } from '@/components/theme-toggle'

const pageTitles: Record<string, string> = {
  '/dashboard': '概览',
  '/dashboard/providers': '供应商管理',
  '/dashboard/models': '模型目录',
  '/dashboard/keys': 'Virtual Key',
  '/dashboard/usage': '用量统计',
}

export function DashboardHeader() {
  const pathname = usePathname()

  // Resolve title from exact match or parent path
  let pageTitle = pageTitles[pathname]
  let parentPage: { title: string; href: string } | null = null

  if (!pageTitle) {
    // Check if we're in a sub-path like /dashboard/providers/[id]
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length >= 3) {
      const parentPath = '/' + segments.slice(0, 3).join('/')
      if (pageTitles[parentPath]) {
        parentPage = { title: pageTitles[parentPath], href: parentPath }
      }
    }
    pageTitle = parentPage ? '详情' : '页面'
  }

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb className="flex-1">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          {(pageTitle !== '概览' || parentPage) && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {parentPage ? (
                  <BreadcrumbLink href={parentPage.href}>{parentPage.title}</BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </>
          )}
          {parentPage && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      <ThemeToggle />
    </header>
  )
}
