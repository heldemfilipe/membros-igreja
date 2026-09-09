"use client"

import { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

/**
 * Envolve o conteúdo de uma página/tela que exige uma permissão.
 * Se o usuário não tiver (nenhuma d)a(s) permissão(ões), mostra "Acesso restrito"
 * no lugar do conteúdo — evita renderizar formulários/botões que a API vai barrar.
 */
export function RequirePermission({
  perm,
  children,
}: {
  perm: string | string[]
  children: ReactNode
}) {
  const { loading, temPermissao } = useAuth()
  const perms = Array.isArray(perm) ? perm : [perm]

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!perms.some(p => temPermissao(p))) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-semibold text-muted-foreground">Acesso restrito</p>
        <p className="text-sm text-muted-foreground mt-1">
          Você não tem permissão para acessar esta tela.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
