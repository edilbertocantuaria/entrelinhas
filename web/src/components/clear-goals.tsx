'use client'

import { Check } from 'lucide-react'
import { useState } from 'react'
import { useStore } from '@/shared/store'
import { useClock } from '@/shared/time'
import { cn } from '@/shared/utils'
import { useShell } from './app-shell'
import { Button } from './ui/button'
import { Sheet } from './ui/sheet'

type Mode = 'goals' | 'all'

const OPTIONS: { value: Mode; title: string; text: string }[] = [
  {
    value: 'all',
    title: 'Começar do zero',
    text: 'Saem as metas, as tarefas, o diário, os resumos, os treinos e os estudos. Ficam as suas áreas e os ajustes.',
  },
  { value: 'goals', title: 'Só as metas', text: 'Saem as metas e os registros delas. Tarefas avulsas, diário, treinos e estudos continuam.' },
]

/** Folha para apagar as metas (as de exemplo ou as suas) antes de criar as próprias. */
export function ClearGoalsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { today } = useClock()
  const { toast } = useShell()
  const count = useStore(state => state.goals.length)
  const clearGoals = useStore(state => state.clearGoals)
  const [mode, setMode] = useState<Mode>('all')

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Limpar todas as metas?"
      description={`${count} ${count === 1 ? 'meta será apagada' : 'metas serão apagadas'} deste aparelho. Não dá para desfazer depois.`}
    >
      <div className="flex flex-col gap-4">
        <div role="radiogroup" aria-label="O que apagar" className="flex flex-col gap-2">
          {OPTIONS.map(option => {
            const selected = option.value === mode
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setMode(option.value)}
                className={cn('card flex items-start gap-3 p-3 text-left transition-colors', selected && 'border-primary bg-primary-soft')}
              >
                <span
                  className={cn(
                    'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border',
                    selected ? 'border-primary bg-primary text-on-primary' : 'border-line',
                  )}
                >
                  {selected && <Check size={12} strokeWidth={2.5} aria-hidden />}
                </span>
                <span>
                  <span className="block text-[14px] font-medium">{option.title}</span>
                  <span className="block text-[12px] leading-relaxed text-muted">{option.text}</span>
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              clearGoals(mode, today)
              onClose()
              toast(mode === 'all' ? 'Tudo limpo. Comece pela sua primeira meta' : 'Metas apagadas')
            }}
          >
            Limpar
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
