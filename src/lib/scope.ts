import type { Pool, PoolClient } from 'pg'
import { AuthUser } from './auth'
import { ApiError } from './api'

type DB = Pool | PoolClient

/**
 * Helpers de escopo por congregação / departamento.
 *
 * `buildAccessWhere` (lib/access.ts) já restringe LISTAGENS de membros. Aqui
 * tratamos as rotas "por ID" (congregações, departamentos) e a gestão de
 * usuários, onde a restrição precisa ser verificada explicitamente para
 * impedir que alguém da congregação X leia/edite algo da congregação Y só
 * conhecendo o ID.
 */

/** Congregações que o usuário pode acessar. `null` = sem restrição (todas). */
export function escopoCongregacoes(user: AuthUser): number[] | null {
  return user.congregacoes_acesso?.length ? user.congregacoes_acesso : null
}

/** Departamentos aos quais o usuário está restrito. `null` = sem restrição. */
export function escopoDepartamentos(user: AuthUser): number[] | null {
  return user.departamentos_acesso?.length ? user.departamentos_acesso : null
}

/**
 * `true` se o usuário pode agir sobre a congregação informada.
 * Admin sempre pode. Usuário sem restrição também. Uma congregação `null`
 * ("sem congregação") fica FORA do escopo de um usuário restrito.
 */
export function congregacaoNoEscopo(user: AuthUser, congId: number | null | undefined): boolean {
  if (user.tipo === 'admin') return true
  const escopo = escopoCongregacoes(user)
  if (!escopo) return true
  if (congId == null) return false
  return escopo.includes(Number(congId))
}

export function assertCongregacaoNoEscopo(user: AuthUser, congId: number | null | undefined): void {
  if (!congregacaoNoEscopo(user, congId)) {
    throw new ApiError(403, 'Acesso restrito: fora do escopo da sua congregação.')
  }
}

/**
 * Verifica se o departamento `deptId` está dentro do escopo do usuário
 * (restrição de departamento E de congregação). Lança 403/404 caso não.
 * Departamento sem congregação atribuída ("global") continua acessível.
 */
export async function assertDepartamentoNoEscopo(
  user: AuthUser,
  deptId: string | number,
  db: DB,
): Promise<void> {
  if (user.tipo === 'admin') return

  const deptAcesso = escopoDepartamentos(user)
  if (deptAcesso && !deptAcesso.includes(Number(deptId))) {
    throw new ApiError(403, 'Acesso restrito: este departamento não está no seu escopo.')
  }

  const escopoCong = escopoCongregacoes(user)
  if (!escopoCong) return

  const { rows } = await db.query('SELECT congregacao_id FROM departamentos WHERE id = $1', [deptId])
  if (rows.length === 0) throw new ApiError(404, 'Departamento não encontrado.')
  const congId = rows[0].congregacao_id
  if (congId != null && !escopoCong.includes(Number(congId))) {
    throw new ApiError(403, 'Acesso restrito: departamento de outra congregação.')
  }
}

/**
 * Valida que o campo `igreja` (nome da congregação) de um cadastro de membro
 * está dentro do escopo do usuário. Impede que alguém restrito à congregação X
 * crie/mova um membro para a congregação Y informando outro nome.
 */
export async function assertIgrejaNoEscopo(
  user: AuthUser,
  igrejaNome: string | null | undefined,
  db: DB,
): Promise<void> {
  if (user.tipo === 'admin') return
  const escopo = escopoCongregacoes(user)
  if (!escopo) return

  if (!igrejaNome) throw new ApiError(400, 'Informe a congregação do cadastro.')
  const { rows } = await db.query('SELECT id FROM congregacoes WHERE nome = $1', [igrejaNome])
  const congId = rows[0]?.id
  if (congId == null || !escopo.includes(Number(congId))) {
    throw new ApiError(403, 'Acesso restrito: cadastro fora do escopo da sua congregação.')
  }
}

/** Filtra uma lista de IDs de departamento, mantendo só os do escopo do usuário. */
export async function departamentosPermitidos(
  user: AuthUser,
  deptIds: number[],
  db: DB,
): Promise<number[]> {
  if (deptIds.length === 0) return []
  if (user.tipo === 'admin') return deptIds

  const deptAcesso = escopoDepartamentos(user)
  const escopoCong = escopoCongregacoes(user)

  let ids = deptIds
  if (deptAcesso) ids = ids.filter(id => deptAcesso.includes(id))
  if (ids.length === 0 || !escopoCong) return ids

  const { rows } = await db.query(
    `SELECT id FROM departamentos
     WHERE id = ANY($1::int[])
       AND (congregacao_id IS NULL OR congregacao_id = ANY($2::int[]))`,
    [ids, escopoCong],
  )
  return rows.map(r => Number(r.id))
}

// ─── Gestão de usuários por congregação ──────────────────────────────────────

/** Pode abrir a tela de Usuários / criar / editar usuários. */
export function podeGerenciarUsuarios(user: AuthUser): boolean {
  return user.tipo === 'admin' || !!user.permissoes.usuarios_gerenciar
}

type UsuarioAlvo = {
  id: number
  tipo: string
  congregacoes_acesso: number[] | null
}

/**
 * Garante que um gestor (não-admin com `usuarios_gerenciar`) só mexa em
 * usuários da própria congregação. Admin passa sempre. Editar o próprio
 * usuário é permitido (as demais regras limitam o que pode mudar).
 */
export function assertUsuarioAlvoNoEscopo(manager: AuthUser, alvo: UsuarioAlvo): void {
  if (manager.tipo === 'admin') return
  if (alvo.id === manager.id) return
  if (alvo.tipo === 'admin') {
    throw new ApiError(403, 'Você não tem permissão sobre este usuário.')
  }
  const escopo = escopoCongregacoes(manager)
  if (!escopo) return
  const alvoCongs = alvo.congregacoes_acesso
  if (!alvoCongs?.length || !alvoCongs.every(c => escopo.includes(c))) {
    throw new ApiError(403, 'Este usuário não pertence à sua congregação.')
  }
}

/**
 * Normaliza o que um gestor (não-admin) pode gravar num usuário:
 *  - nunca cria/promove admin;
 *  - congregações limitadas às dele (default: todas as dele);
 *  - departamentos são validados depois contra as congregações.
 */
export function sanitizarAcessoDeGestor(
  manager: AuthUser,
  body: { congregacoes_acesso?: unknown; departamentos_acesso?: unknown },
): { congregacoes_acesso: number[] | null; departamentos_acesso_bruto: number[] } {
  const escopo = escopoCongregacoes(manager)

  let congs = Array.isArray(body.congregacoes_acesso)
    ? body.congregacoes_acesso.map(Number).filter(Number.isFinite)
    : []
  if (escopo) {
    congs = congs.filter(c => escopo.includes(c))
    if (congs.length === 0) congs = [...escopo]
  }

  const depts = Array.isArray(body.departamentos_acesso)
    ? body.departamentos_acesso.map(Number).filter(Number.isFinite)
    : []

  return {
    congregacoes_acesso: congs.length ? congs : null,
    departamentos_acesso_bruto: depts,
  }
}
