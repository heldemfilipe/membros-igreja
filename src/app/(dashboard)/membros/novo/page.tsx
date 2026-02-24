import { MemberForm } from '@/components/membros/MemberForm'

export default function NovoMembroPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Novo Membro</h1>
        <p className="text-muted-foreground text-sm">Preencha os dados do novo membro</p>
      </div>
      <MemberForm />
    </div>
  )
}
