import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center text-center">
        <h1 className="text-4xl font-bold tracking-tight mb-4">AIHub</h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 mb-8">企业级 AI 控制平台</p>
        <Button>开始使用</Button>
      </div>
    </main>
  )
}
