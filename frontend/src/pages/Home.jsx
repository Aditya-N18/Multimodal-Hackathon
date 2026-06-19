import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome</h1>
        <p className="text-muted-foreground">
          Vite + React + Tailwind v3.4 + React Router + shadcn/ui (JavaScript)
        </p>
      </div>
      <Button>shadcn Button</Button>
    </div>
  )
}
