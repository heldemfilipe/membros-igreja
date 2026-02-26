"use client"

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Building2, UserCog, Cake,
  Menu, X, Church, LogOut, Shield, Loader2, Lock,
} from 'lucide-react'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const menuItems = [
  { title: 'Dashboard',       icon: LayoutDashboard, href: '/dashboard',       permissao: 'dashboard' },
  { title: 'Membros',         icon: Users,            href: '/membros',         permissao: 'membros_ver' },
  { title: 'Aniversariantes', icon: Cake,             href: '/aniversariantes', permissao: 'aniversariantes_ver' },
  { title: 'Departamentos',   icon: Building2,        href: '/departamentos',   permissao: 'departamentos_ver' },
  { title: 'Congregações',    icon: Church,           href: '/congregacoes',    permissao: 'departamentos_ver' },
]

const adminItems = [
  { title: 'Usuários', icon: UserCog, href: '/usuarios' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const { user, isAdmin, loading, logout, temPermissao } = useAuth()

  const handleSignOut = async () => {
    setSigningOut(true)
    await logout()
    router.replace('/login')
  }

  const iniciais = user?.nome
    ? user.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?'

  const perfilNome = user && !isAdmin && user.perfil_id
    ? 'Acesso restrito'
    : null

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-primary text-primary-foreground shadow-lg"
        aria-label="Menu"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-full w-64 bg-card border-r border-border flex flex-col",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-5 py-5 border-b border-border hover:bg-accent/50 transition-colors shrink-0"
          onClick={() => setIsOpen(false)}
        >
          <div className="bg-primary p-2 rounded-xl shrink-0">
            <Church className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-bold leading-tight">Igreja</h2>
            <p className="text-[11px] text-muted-foreground leading-tight">Sistema de Membros</p>
          </div>
        </Link>

        {/* Navegação */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {menuItems
                .filter(item => temPermissao(item.permissao))
                .map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </Link>
                  )
                })}

              {isAdmin && (
                <>
                  <div className="pt-4 pb-1 px-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Administração
                    </p>
                  </div>
                  {adminItems.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    )
                  })}
                </>
              )}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-border space-y-1 shrink-0">
          {user && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                {iniciais}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate leading-tight">{user.nome}</p>
                <div className="flex items-center gap-1">
                  {isAdmin
                    ? <Shield className="h-3 w-3 text-primary shrink-0" />
                    : perfilNome
                      ? <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                      : null
                  }
                  <p className="text-[11px] text-muted-foreground truncate">
                    {isAdmin ? 'Administrador' : perfilNome || 'Usuário'}
                  </p>
                </div>
              </div>
              <ThemeToggle />
            </div>
          )}

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
          >
            {signingOut
              ? <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              : <LogOut className="h-4 w-4 shrink-0" />
            }
            <span>{signingOut ? 'Saindo...' : 'Sair'}</span>
          </button>
        </div>
      </aside>
    </>
  )
}
