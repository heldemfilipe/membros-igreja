"use client"

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { MemberForm } from './MemberForm'
import { RequirePermission } from '@/components/auth/RequirePermission'

interface Props {
  open: boolean
  membroId?: number
  onClose: () => void
  onSuccess: () => void
}

export function MemberModal({ open, membroId, onClose, onSuccess }: Props) {
  const handleSuccess = () => {
    onClose()
    onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={open ? onClose : undefined}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {membroId ? 'Editar Membro' : 'Novo Membro'}
          </DialogTitle>
        </DialogHeader>
        <RequirePermission perm="membros_editar">
          <MemberForm
            membroId={membroId}
            onSuccess={handleSuccess}
            onCancel={onClose}
          />
        </RequirePermission>
      </DialogContent>
    </Dialog>
  )
}
