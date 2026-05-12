import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AIHub - 企业级 AI 控制平台',
  description: 'Enterprise AI Control Plane',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
