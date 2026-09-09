import { MemberForm } from '@/components/membros/MemberForm'
import { RequirePermission } from '@/components/auth/RequirePermission'

export default function NovoMembroPage({ searchParams }: { searchParams: { nome?: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Novo Membro</h1>
        <p className="text-muted-foreground text-sm">Preencha os dados do novo membro</p>
      </div>
      <RequirePermission perm="membros_editar">
        <MemberForm initialNome={searchParams.nome} />
      </RequirePermission>
    </div>
  )
}
