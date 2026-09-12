import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ApiError, errorResponse } from '@/lib/api'
import { FORMULARIO_PUBLICO_CONFIG_PADRAO } from '@/lib/constants'

/**
 * GET /api/publico/formulario/[congregacaoId] — SEM autenticação.
 * Devolve o nome da congregação e quais blocos opcionais o admin habilitou,
 * para o formulário público de autocadastro montar a tela certa.
 */
export async function GET(_req: NextRequest, { params }: { params: { congregacaoId: string } }) {
  try {
    // Aceita tanto o id numérico (links antigos) quanto o slug (/cadastro/jardim-independencia).
    const raw = params.congregacaoId
    const numerico = /^\d+$/.test(raw)

    const congResult = await pool.query(
      numerico
        ? 'SELECT id, nome, nome_oficial FROM congregacoes WHERE id = $1'
        : 'SELECT id, nome, nome_oficial FROM congregacoes WHERE slug = $1',
      [numerico ? Number(raw) : raw],
    )
    if (congResult.rows.length === 0) throw new ApiError(404, 'Link inválido ou congregação removida.')
    const cong = congResult.rows[0]

    const configResult = await pool.query('SELECT * FROM formulario_publico_config WHERE congregacao_id = $1', [cong.id])
    const { congregacao_id: _cid, ...campos } = configResult.rows[0] || { ...FORMULARIO_PUBLICO_CONFIG_PADRAO, congregacao_id: cong.id }

    return Response.json({
      congregacao: { id: cong.id, nome: cong.nome_oficial || cong.nome },
      campos,
    })
  } catch (error) {
    return errorResponse(error)
  }
}
