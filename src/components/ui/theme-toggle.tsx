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
    // Lê o estado real do DOM como source of truth
    // (o themeScript já aplicou a classe correta antes do React hidratar)
    setIsDark(document.documentElement.classList.contains('dark'))
    setMounted(true)

    // Ouve mudanças na preferência do sistema em tempo real.
    // Só atualiza se o usuário não tiver definido um tema manualmente.
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setIsDark(e.matches)
        document.documentElement.classList.toggle('dark', e.matches)
      }
    }
    media.addEventListener('change', handleSystemChange)
    return () => media.removeEventListener('change', handleSystemChange)
  }, [])

  const toggle = () => {
    // Lê do DOM diretamente para nunca dessincronizar com o estado real
    const currentlyDark = document.documentElement.classList.contains('dark')
    const next = !currentlyDark
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
      title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      className={cn(
        "h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
        className
      )}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
