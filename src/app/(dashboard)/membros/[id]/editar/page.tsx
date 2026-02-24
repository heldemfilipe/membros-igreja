"use client"

import { MemberForm } from '@/components/membros/MemberForm'
import { useParams } from 'next/navigation'

export default function EditarMembroPage() {
  const params = useParams()
  const id = Number(params.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Editar Membro</h1>
        <p className="text-muted-foreground text-sm">Atualize os dados do membro</p>
      </div>
      <MemberForm membroId={id} />
    </div>
  )
}
