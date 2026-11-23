'use client'

import { Pencil } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useStore } from '@/shared/store'
import type { AppModule } from '@/domain/types'
import { cn } from '@/shared/utils'
import { TopBar, useShell } from './app-shell'
import { BackButton } from './common'
import { Button } from './ui/button'
import { Sheet } from './ui/sheet'

/** Cabeçalho das telas de Fitness e Estudos: nome escolhido pela pessoa, botão de editar e aviso se estiver removido. */
export function BuiltinModuleHeader({ kind, fallback }: { kind: 'fitness' | 'study'; fallback: string }) {
  const mod = useStore(state => state.modules.find(item => item.kind === kind))
  const restoreModule = useStore(state => state.restoreModule)
  return (
    <>
      <TopBar
        title={mod?.name ?? fallback}
        back={<BackButton href="/metas" label="Voltar para Metas" />}
        right={
          mod && (
            <Link href={`/modulos/editor?id=${mod.id}`} className="icon-btn" aria-label={`Editar ${mod.name}`}>
              <Pencil size={20} strokeWidth={1.75} />
            </Link>
          )
        }
      />
      {mod?.hidden && (
        <div className="card mx-5 mb-3 flex items-center gap-3 p-3 text-[13px]">
          <span className="flex-1 text-muted">Este módulo está fora da aba Metas.</span>
          <Button variant="ghost" size="sm" onClick={() => restoreModule(mod.id)}>
            Trazer de volta
          </Button>
        </div>
      )}
    </>
  )
}

/** Confirmação para tirar um módulo do app. */
export function RemoveModuleSheet({ mod, onClose, onRemoved }: { mod: AppModule | null; onClose: () => void; onRemoved?: () => void }) {
  return (
    <Sheet
      open={!!mod}
      onClose={onClose}
      title={mod ? (mod.kind === 'custom' ? `Excluir o módulo ${mod.name}?` : `Remover ${mod.name} do app?`) : ''}
      description={
        mod?.kind === 'custom'
          ? 'O módulo e os registros dele saem deste aparelho. O que já contou para as metas continua nelas.'
          : 'Ele some da aba Metas. Dá para trazer de volta em Gerenciar módulos.'
      }
    >
      {mod && <RemoveBody key={mod.id} mod={mod} onClose={onClose} onRemoved={onRemoved} />}
    </Sheet>
  )
}

function RemoveBody({ mod, onClose, onRemoved }: { mod: AppModule; onClose: () => void; onRemoved?: () => void }) {
  const { toast } = useShell()
  const removeModule = useStore(state => state.removeModule)
  const [erase, setErase] = useState(false)
  const builtin = mod.kind !== 'custom'

  return (
    <div className="flex flex-col gap-4">
      {builtin && (
        <div role="radiogroup" aria-label="E os registros?" className="flex flex-col gap-2">
          {[
            { value: false, title: 'Guardar os registros', text: 'Se você trouxer o módulo de volta, tudo estará lá.' },
            {
              value: true,
              title: 'Apagar os registros também',
              text: mod.kind === 'fitness' ? 'Treinos e pesos registrados saem.' : 'Disciplinas e sessões de estudo saem.',
            },
          ].map(option => (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={erase === option.value}
              onClick={() => setErase(option.value)}
              className={cn('card p-3 text-left', erase === option.value && 'border-primary bg-primary-soft')}
            >
              <span className="block text-[14px] font-medium">{option.title}</span>
              <span className="block text-[12px] text-muted">{option.text}</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            removeModule(mod.id, erase)
            onClose()
            onRemoved?.()
            toast(builtin ? `${mod.name} removido` : 'Módulo excluído')
          }}
        >
          {builtin ? 'Remover' : 'Excluir'}
        </Button>
      </div>
    </div>
  )
}
