"use client"

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDark(saved === 'dark' || (!saved && prefersDark))
  }, [])

  const toggle = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  if (!mounted) return (
    <div className={cn("h-8 w-8 rounded-md flex items-center justify-center", className)}>
      <div className="h-4 w-4 rounded-full bg-muted animate-pulse" />
    </div>
  )

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      className={cn(
        "h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
        className
      )}
    >
      {isDark
        ? <Sun className="h-4 w-4" />
        : <Moon className="h-4 w-4" />
      }
    </button>
  )
}
