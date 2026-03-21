import { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  colorClass?: string
  description?: string
  href?: string
}

export function StatCard({
  title,
  value,
  icon: Icon,
  colorClass = 'bg-primary',
  description,
  href,
}: StatCardProps) {
  const inner = (
    <CardContent className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
          <p className="text-3xl font-bold mt-1 tabular-nums">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className={cn('p-3 rounded-xl shrink-0', colorClass)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </CardContent>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        <Card className="hover:shadow-md hover:border-primary/40 transition-all cursor-pointer">
          {inner}
        </Card>
      </Link>
    )
  }

  return <Card>{inner}</Card>
}
