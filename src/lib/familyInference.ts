import type { PoolClient } from 'pg'

/**
 * Garante que um vínculo familiar exista.
 * Se já existir QUALQUER link entre os dois membros, não duplica.
 */
async function ensureLink(
  client: PoolClient,
  memId: number,
  parentesco: string,
  vinculadoId: number
): Promise<void> {
  if (memId === vinculadoId) return

  // Se já existe qualquer vínculo entre os dois, não cria outro
  const { rows } = await client.query(
    'SELECT id FROM familiares WHERE membro_id = $1 AND membro_vinculado_id = $2',
    [memId, vinculadoId]
  )
  if (rows.length > 0) return

  const { rows: vinc } = await client.query(
    'SELECT nome FROM membros WHERE id = $1',
    [vinculadoId]
  )
  if (vinc.length === 0) return

  await client.query(
    'INSERT INTO familiares (membro_id, parentesco, nome, membro_vinculado_id) VALUES ($1, $2, $3, $4)',
    [memId, parentesco, vinc[0].nome, vinculadoId]
  )
}

/**
 * Infere e cria vínculos familiares derivados após salvar um membro.
 *
 * Regras implementadas:
 *  1. Filhos do cônjuge → tornam-se meus filhos também (e eu me torno pai/mãe deles)
 *  2. Meus filhos → o cônjuge herda também como pai/mãe
 *  3. Meus pais → tornam-se avós de todos os meus filhos (incluindo herdados)
 *  4. Pais do cônjuge → também avós dos meus filhos
 *  5. Filhos dos meus filhos → eu me torno avô/avó deles
 */
export async function inferirRelacoesFamiliares(
  membroId: number,
  sexoDoMembro: string | null,
  client: PoolClient
): Promise<void> {
  const meuParentesco = sexoDoMembro === 'Feminino' ? 'Mãe' : 'Pai'

  // Lê links atuais do membro
  const { rows: links } = await client.query(
    `SELECT parentesco, membro_vinculado_id
     FROM familiares
     WHERE membro_id = $1 AND membro_vinculado_id IS NOT NULL`,
    [membroId]
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filhosIds: number[] = links
    .filter((l: any) => l.parentesco === 'Filho(a)')
    .map((l: any) => Number(l.membro_vinculado_id))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paisIds: number[] = links
    .filter((l: any) => l.parentesco === 'Pai' || l.parentesco === 'Mãe')
    .map((l: any) => Number(l.membro_vinculado_id))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conjugeId: number | null =
    links.find((l: any) => l.parentesco === 'Cônjuge')?.membro_vinculado_id ?? null

  // ────────────────────────────────────────────────────────────────
  // REGRA 1: Filhos do cônjuge → tornam-se meus filhos
  // ────────────────────────────────────────────────────────────────
  if (conjugeId) {
    const { rows: filhosConjuge } = await client.query(
      `SELECT membro_vinculado_id FROM familiares
       WHERE membro_id = $1 AND parentesco = 'Filho(a)' AND membro_vinculado_id IS NOT NULL`,
      [conjugeId]
    )
    for (const fc of filhosConjuge) {
      const filhoId = Number(fc.membro_vinculado_id)
      await ensureLink(client, membroId, 'Filho(a)', filhoId)
      await ensureLink(client, filhoId, meuParentesco, membroId)
    }
  }

  // ────────────────────────────────────────────────────────────────
  // REGRA 2: Meus filhos → cônjuge herda como pai/mãe
  // ────────────────────────────────────────────────────────────────
  if (conjugeId) {
    const { rows: conjInfo } = await client.query(
      'SELECT sexo FROM membros WHERE id = $1',
      [conjugeId]
    )
    const parentescoConjuge = conjInfo[0]?.sexo === 'Feminino' ? 'Mãe' : 'Pai'
    for (const filhoId of filhosIds) {
      await ensureLink(client, conjugeId, 'Filho(a)', filhoId)
      await ensureLink(client, filhoId, parentescoConjuge, conjugeId)
    }
  }

  // Re-lê meus filhos (agora inclui os herdados do cônjuge)
  const { rows: allFilhosRows } = await client.query(
    `SELECT membro_vinculado_id FROM familiares
     WHERE membro_id = $1 AND parentesco = 'Filho(a)' AND membro_vinculado_id IS NOT NULL`,
    [membroId]
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const todosFilhosIds = allFilhosRows.map((r: any) => Number(r.membro_vinculado_id))

  // ────────────────────────────────────────────────────────────────
  // REGRA 3: Meus pais → avós de todos os meus filhos
  // ────────────────────────────────────────────────────────────────
  for (const paiId of paisIds) {
    for (const filhoId of todosFilhosIds) {
      await ensureLink(client, paiId, 'Avô/Avó', filhoId)
      await ensureLink(client, filhoId, 'Neto(a)', paiId)
    }
  }

  // ────────────────────────────────────────────────────────────────
  // REGRA 4: Pais do cônjuge → também avós dos meus filhos
  // ────────────────────────────────────────────────────────────────
  if (conjugeId) {
    const { rows: paisConjuge } = await client.query(
      `SELECT membro_vinculado_id FROM familiares
       WHERE membro_id = $1 AND parentesco IN ('Pai', 'Mãe') AND membro_vinculado_id IS NOT NULL`,
      [conjugeId]
    )
    for (const pc of paisConjuge) {
      const avoId = Number(pc.membro_vinculado_id)
      for (const filhoId of todosFilhosIds) {
        await ensureLink(client, avoId, 'Avô/Avó', filhoId)
        await ensureLink(client, filhoId, 'Neto(a)', avoId)
      }
    }
  }

  // ────────────────────────────────────────────────────────────────
  // REGRA 5: Filhos dos meus filhos → eu sou avô/avó deles
  // (útil quando o avô/avó salva o próprio cadastro)
  // ────────────────────────────────────────────────────────────────
  for (const filhoId of todosFilhosIds) {
    const { rows: netosRows } = await client.query(
      `SELECT membro_vinculado_id FROM familiares
       WHERE membro_id = $1 AND parentesco = 'Filho(a)' AND membro_vinculado_id IS NOT NULL`,
      [filhoId]
    )
    for (const nr of netosRows) {
      const netoId = Number(nr.membro_vinculado_id)
      await ensureLink(client, membroId, 'Avô/Avó', netoId)
      await ensureLink(client, netoId, 'Neto(a)', membroId)
    }
  }
}
