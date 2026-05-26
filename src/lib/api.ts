import { NextRequest } from 'next/server'
import { z } from 'zod'
import { AuthUser, verificarToken, unauthorized, forbidden } from './auth'
import { Permissoes } from '@/types'

/**
 * Erro de aplicação com status HTTP. Lançar dentro de um handler embrulhado
 * por withAuth/withAuthParams faz a resposta sair com o status e a mensagem
 * informados — útil para validações (400) e regras de negócio (403/404/409).
 */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Converte um erro em Response. Erros conhecidos (ApiError, violação de
 * unicidade) viram mensagens específicas; o resto é logado no servidor e
 * devolvido como mensagem genérica — nunca vaza a mensagem crua do Postgres.
 */
export function errorResponse(error: unknown): Response {
  // Erros de controle de fluxo do Next (DYNAMIC_SERVER_USAGE durante o build,
  // NEXT_REDIRECT, NEXT_NOT_FOUND) não são falhas — devem propagar para o Next
  // tratar (ex: marcar a rota como dinâmica). Engoli-los gera ruído no build.
  if (
    typeof error === 'object' && error !== null && 'digest' in error &&
    typeof (error as { digest: unknown }).digest === 'string' &&
    ((error as { digest: string }).digest === 'DYNAMIC_SERVER_USAGE' ||
      (error as { digest: string }).digest.startsWith('NEXT_'))
  ) {
    throw error
  }

  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  if (typeof error === 'object' && error !== null && (error as { code?: string }).code === '23505') {
    return Response.json({ error: 'Já existe um registro com esses dados.' }, { status: 409 })
  }
  console.error('[API]', error)
  return Response.json({ error: 'Erro interno do servidor.' }, { status: 500 })
}

interface AuthOptions {
  /** Exige uma permissão específica (admin sempre passa). */
  permission?: keyof Permissoes
  /** Exige tipo === 'admin'. */
  adminOnly?: boolean
}

/**
 * Espelha temPermissao() do AuthContext: admin tem tudo; usuário SEM perfil
 * atribuído tem acesso total (retrocompatibilidade); com perfil, depende da
 * permissão específica.
 */
export function temPermissao(user: AuthUser, chave: keyof Permissoes): boolean {
  if (user.tipo === 'admin') return true
  if (!user.perfil_id) return true
  return !!user.permissoes[chave]
}

function checkAccess(user: AuthUser, options: AuthOptions): Response | null {
  if (options.adminOnly && user.tipo !== 'admin') return forbidden()
  if (options.permission && !temPermissao(user, options.permission)) return forbidden()
  return null
}

type Handler = (req: NextRequest, user: AuthUser) => Promise<Response> | Response
type HandlerWithParams<P> = (
  req: NextRequest,
  user: AuthUser,
  ctx: { params: P },
) => Promise<Response> | Response

/**
 * Embrulha um handler de rota SEM parâmetros dinâmicos.
 * Valida token + permissão e captura erros (esconde detalhes do banco).
 */
export function withAuth(handler: Handler, options: AuthOptions = {}) {
  return async (req: NextRequest): Promise<Response> => {
    try {
      const user = await verificarToken(req)
      if (!user) return unauthorized()
      const denied = checkAccess(user, options)
      if (denied) return denied
      return await handler(req, user)
    } catch (error) {
      return errorResponse(error)
    }
  }
}

/**
 * Embrulha um handler de rota COM parâmetros dinâmicos (ex: /[id]).
 * Use o genérico para tipar params: withAuthParams<{ id: string }>(...).
 */
export function withAuthParams<P>(handler: HandlerWithParams<P>, options: AuthOptions = {}) {
  return async (req: NextRequest, ctx: { params: P }): Promise<Response> => {
    try {
      const user = await verificarToken(req)
      if (!user) return unauthorized()
      const denied = checkAccess(user, options)
      if (denied) return denied
      return await handler(req, user, ctx)
    } catch (error) {
      return errorResponse(error)
    }
  }
}

/**
 * Lê e valida o corpo JSON com um schema zod. Lança ApiError(400) com
 * mensagem legível se o JSON for inválido ou não passar na validação.
 */
export async function parseBody<T>(req: NextRequest, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    throw new ApiError(400, 'Corpo da requisição inválido (JSON esperado).')
  }
  const result = schema.safeParse(raw)
  if (!result.success) {
    const msg = result.error.issues.map(i => i.message).join('; ')
    throw new ApiError(400, msg || 'Dados inválidos.')
  }
  return result.data
}
