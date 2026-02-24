"use client"

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { AniversarianteItem } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Cake, Phone } from 'lucide-react'
import { calcularIdade, getDiaDoMes } from '@/lib/utils'
import { getCargoStyle } from '@/lib/constants'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const TIPO_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  Membro: 'default',
  Congregado: 'secondary',
  Visitante: 'outline',
}

export default function AniversariantesPage() {
  const { token } = useAuth()
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [aniversariantes, setAniversariantes] = useState<AniversarianteItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`/api/aniversariantes?mes=${mes}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setAniversariantes(await res.json())
    } finally {
      setLoading(false)
    }
  }, [token, mes])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cake className="h-6 w-6 text-yellow-500" />
            Aniversariantes
          </h1>
          <p className="text-sm text-muted-foreground">
            {loading ? '...' : `${aniversariantes.length} aniversariante${aniversariantes.length !== 1 ? 's' : ''} em ${MESES[mes - 1]}`}
          </p>
        </div>

        <select
          value={mes}
          onChange={e => setMes(Number(e.target.value))}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
        >
          {MESES.map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : aniversariantes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Nenhum aniversariante em {MESES[mes - 1]}.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {aniversariantes.map(a => {
            const dia = getDiaDoMes(a.data_nascimento)
            const idade = calcularIdade(a.data_nascimento)

            return (
              <Card key={a.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-xl select-none">
                      🎂
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight">{a.nome}</p>
                      {a.conhecido_como && (
                        <p className="text-xs text-muted-foreground">&quot;{a.conhecido_como}&quot;</p>
                      )}

                      <div className="flex flex-wrap gap-1 mt-1.5">
                        <Badge variant="outline" className="text-xs">
                          Dia {dia}{idade !== null ? ` · ${idade} anos` : ''}
                        </Badge>
                        <Badge
                          variant={TIPO_VARIANT[a.tipo_participante] ?? 'outline'}
                          className="text-xs"
                        >
                          {a.tipo_participante}
                        </Badge>
                        {a.cargo && (
                          <Badge className="text-xs" style={getCargoStyle(a.cargo)}>
                            {a.cargo}
                          </Badge>
                        )}
                      </div>

                      {a.telefone_principal && (
                        <a
                          href={`tel:${a.telefone_principal}`}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-1.5 w-fit transition-colors"
                        >
                          <Phone className="h-3 w-3" />
                          {a.telefone_principal}
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
