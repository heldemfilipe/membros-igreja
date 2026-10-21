import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth, ApiError } from '@/lib/api'
import type { AuthUser } from '@/lib/auth'
import { assertCongregacaoNoEscopoDb, congregacoesEfetivas } from '@/lib/scope'
import {
  carregarFaixas, carregarPadrao, montarFaixas, salvarFaixas, mesmasFaixas,
} from '@/lib/faixas'

/**
 * Faixas etárias por congregação.
 *  - GET ?congregacao=ID   faixas efetivas da congregação (+ padrão geral para comparar)
 *  - GET                   padrão geral
 *  - GET ?resumo=1         congregações visíveis com faixas próprias (para padronizar)
 *  - PUT                   salva { congregacao_id | null, faixas: [{nome, min}] }
 *  - DELETE ?congregacao=ID  volta a congregação para o padrão geral
 * Padrão geral: só admin. Congregação: admin ou perfil com `faixas_editar`
 * dentro do escopo de congregações do usuário.
 */

function idCongregacao(valor: unknown): number | null {
  if (valor == null || valor === '') return null
  const id = Number(valor)
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, 'Congregação inválida.')
  return id
}

async function assertPodeEditar(user: AuthUser, congregacaoId: number | null) {
  if (congregacaoId == null) {
    if (user.tipo !== 'admin') throw new ApiError(403, 'O padrão geral só pode ser alterado pelo administrador.')
    return
  }
  if (user.tipo !== 'admin' && user.permissoes.faixas_editar !== true) {
    throw new ApiError(403, 'Você não tem permissão para editar as faixas etárias.')
  }
  await assertCongregacaoNoEscopoDb(user, congregacaoId, pool)
  const { rows } = await pool.query('SELECT 1 FROM congregacoes WHERE id = $1', [congregacaoId])
  if (rows.length === 0) throw new ApiError(404, 'Congregação não encontrada.')
}

export const GET = withAuth(async (req: NextRequest, user) => {
  const sp = new URL(req.url).searchParams

  if (sp.get('resumo')) {
    const efetivas = await congregacoesEfetivas(user, pool)
    const padrao = await carregarPadrao(pool)
    const { rows } = await pool.query(
      `SELECT c.id, c.nome FROM congregacoes c
       ${efetivas ? 'WHERE c.id = ANY($1::int[])' : ''} ORDER BY c.nome`,
      efetivas ? [efetivas] : [],
    )
    const congregacoes = []
    for (const c of rows) {
      const { faixas, personalizada } = await carregarFaixas(pool, c.id)
      congregacoes.push({
        id: c.id,
        nome: c.nome,
        personalizada: personalizada && !mesmasFaixas(faixas, padrao),
        faixas,
      })
    }
    return Response.json({ padrao, congregacoes })
  }

  const congregacaoId = idCongregacao(sp.get('congregacao'))
  if (congregacaoId != null) await assertCongregacaoNoEscopoDb(user, congregacaoId, pool)
  const padrao = await carregarPadrao(pool)
  const { faixas, personalizada } = await carregarFaixas(pool, congregacaoId)
  return Response.json({ faixas, personalizada, padrao })
})

export const PUT = withAuth(async (req: NextRequest, user) => {
  let body: { congregacao_id?: unknown; faixas?: unknown }
  try {
    body = await req.json()
  } catch {
    throw new ApiError(400, 'Corpo da requisição inválido (JSON esperado).')
  }
  const congregacaoId = idCongregacao(body.congregacao_id)
  await assertPodeEditar(user, congregacaoId)
  const faixas = montarFaixas(body.faixas)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await salvarFaixas(client, congregacaoId, faixas)
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
  return Response.json({ message: 'Faixas etárias salvas!', faixas })
})

export const DELETE = withAuth(async (req: NextRequest, user) => {
  const congregacaoId = idCongregacao(new URL(req.url).searchParams.get('congregacao'))
  if (congregacaoId == null) throw new ApiError(400, 'Informe a congregação.')
  await assertPodeEditar(user, congregacaoId)
  await pool.query('DELETE FROM faixas_etarias WHERE congregacao_id = $1', [congregacaoId])
  return Response.json({ message: 'Congregação voltou a usar o padrão geral.' })
})
