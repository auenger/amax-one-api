import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/layout/theme-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'AIHub - 企业级 AI 控制平台',
  description: 'Enterprise AI Control Plane',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
