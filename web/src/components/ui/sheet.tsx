'use client'

import { Dialog } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useShell } from '@/components/app-shell'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  description?: ReactNode
  /** arte pequena acima do título */
  header?: ReactNode
  children?: ReactNode
}

/** Folha inferior, presa à moldura do celular. Foco preso, Esc fecha, toque fora fecha. */
export function Sheet({ open, onClose, title, description, header, children }: SheetProps) {
  const { frame } = useShell()
  return (
    <Dialog.Root open={open} onOpenChange={next => !next && onClose()}>
      <Dialog.Portal container={frame}>
        <Dialog.Backdrop className="sheet-backdrop" />
        <Dialog.Popup className="sheet-popup">
          <div aria-hidden className="mx-auto mb-2 h-1 w-9 rounded-full bg-line" />
          {header}
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1 pt-2.5">
              <Dialog.Title className="text-[17px] leading-snug font-medium">{title}</Dialog.Title>
              {description && <Dialog.Description className="mt-1 text-[13px] text-muted">{description}</Dialog.Description>}
            </div>
            <Dialog.Close className="icon-btn -mr-2" aria-label="Fechar">
              <X size={20} strokeWidth={1.75} />
            </Dialog.Close>
          </div>
          <div className="mt-4">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
