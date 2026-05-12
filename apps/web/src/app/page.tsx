import Link from 'next/link'
import { Bot, Shield, Zap, BarChart3, ArrowRight, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/theme-toggle'

const features = [
  {
    icon: Shield,
    title: '统一鉴权网关',
    description: 'Virtual Key 池化管理，细粒度权限控制，预算限额与审计日志',
  },
  {
    icon: Bot,
    title: '多模型代理',
    description: '支持 OpenAI、Anthropic、Google 等主流供应商，统一 API 格式接入',
  },
  {
    icon: Zap,
    title: '模型别名解析',
    description: '灵活的别名映射机制，应用无需修改代码即可切换底层模型',
  },
  {
    icon: BarChart3,
    title: 'Token 精准计量',
    description: '实时 Token 消耗追踪，多维度用量分析，支持预算预警',
  },
]

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Bot className="h-4 w-4" />
            </div>
            <span className="text-lg font-bold">AIHub</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">控制台</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/dashboard">
                开始使用
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-1 flex-col items-center justify-center px-4 py-20 md:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <Zap className="h-3.5 w-3.5" />
            Enterprise AI Control Plane
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            企业级 AI
            <span className="bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
              {' '}
              控制平台
            </span>
          </h1>
          <p className="mb-8 text-lg text-muted-foreground md:text-xl">
            统一 API 网关、Virtual Key 鉴权池化、Token 精准计量、多模型智能代理。
            <br />
            一个平台管理所有 AI 接入。
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/dashboard">
                进入控制台
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                GitHub
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-bold tracking-tight md:text-3xl">核心能力</h2>
            <p className="text-muted-foreground">为企业级 AI 应用提供完整的接入层解决方案</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="border-none bg-background shadow-sm transition-shadow hover:shadow-md"
              >
                <CardContent className="pt-6">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mb-2 font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="rounded-2xl bg-primary/5 border p-8 md:p-12 text-center">
            <h2 className="mb-3 text-2xl font-bold tracking-tight md:text-3xl">准备好了吗？</h2>
            <p className="mb-6 text-muted-foreground max-w-xl mx-auto">
              立即开始使用 AIHub，统一管理你的 AI 模型接入、密钥授权和用量监控
            </p>
            <Button size="lg" asChild>
              <Link href="/dashboard">
                进入控制台
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bot className="h-4 w-4" />
              <span>AIHub - 企业级 AI 控制平台</span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} AIHub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
