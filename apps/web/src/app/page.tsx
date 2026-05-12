import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Boxes,
  KeyRound,
  BarChart3,
  Shield,
  Zap,
  Globe,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'

const features = [
  {
    icon: Boxes,
    title: '统一模型目录',
    desc: '一站式管理 OpenAI、Anthropic 等多家 LLM 供应商，智能路由与协议转换。',
  },
  {
    icon: KeyRound,
    title: 'Virtual Key 鉴权',
    desc: '安全的虚拟密钥体系，支持权限范围、速率限制与预算控制。',
  },
  {
    icon: BarChart3,
    title: 'Token 精准计量',
    desc: '实时追踪每次调用的 Token 消耗，多维度成本分析与预算告警。',
  },
  {
    icon: Shield,
    title: '安全护栏',
    desc: '多层安全策略：PII 检测、内容审查、不可篡改审计日志。',
  },
  {
    icon: Zap,
    title: '高性能网关',
    desc: '基于 Fastify 的高吞吐 API 网关，P99 延迟 < 500ms。',
  },
  {
    icon: Globe,
    title: 'OpenAI 兼容',
    desc: '完全兼容 OpenAI API 格式，现有应用零改动接入。',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl flex items-center justify-between h-14 px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              AI
            </div>
            <span className="font-semibold text-lg">AIHub</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                控制台
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm">
                开始使用
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_-20%,rgba(99,102,241,0.15),transparent)] dark:bg-[radial-gradient(ellipse_60%_50%_at_50%_-20%,rgba(99,102,241,0.25),transparent)]" />
        <div className="mx-auto max-w-6xl px-6 py-24 md:py-36 text-center">
          <Badge variant="secondary" className="mb-6">
            Enterprise AI Control Plane
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            企业级 AI 控制平台
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            统一网关、鉴权池化、精准计量。一个平台管理所有 AI 模型接入，
            <br className="hidden md:block" />让 AI 治理简单而可靠。
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button size="lg" className="h-12 px-8 text-base">
                进入控制台
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">核心能力</h2>
          <p className="text-muted-foreground">为 AI 治理而生的企业级基础设施</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card
              key={f.title}
              className="group transition-shadow hover:shadow-md border-border/60"
            >
              <CardContent className="pt-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4 group-hover:bg-primary/15 transition-colors">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-8 flex items-center justify-between text-sm text-muted-foreground">
          <span>AIHub - Enterprise AI Control Plane</span>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
