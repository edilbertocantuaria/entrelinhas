'use client'

import { useState } from 'react'
import { useStore } from '@/shared/store'
import { useClock } from '@/shared/time'
import type { RecurringTask, Repeat } from '@/domain/types'
import { useShell } from './app-shell'
import { RepeatPicker } from './repeat-picker'
import { Button } from './ui/button'
import { Field } from './ui/controls'
import { Sheet } from './ui/sheet'

/**
 * Cria ou edita uma tarefa que se repete.
 * - `rule`: edita a regra existente (vale para as próximas ocorrências; as já feitas ficam como estão)
 * - sem `rule`: cria uma nova, com `draft` como ponto de partida (ex.: a tarefa de uma meta)
 */
export function RuleSheet({
  open,
  onClose,
  rule,
  draft,
  suggestedEnd,
}: {
  open: boolean
  onClose: () => void
  rule?: RecurringTask
  draft?: { title: string; goalId?: string; repeat: Repeat }
  suggestedEnd?: string
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={rule ? 'Editar repetição' : 'Tarefa que se repete'}
      description={rule ? 'As mudanças valem daqui para frente. O que já foi feito continua no histórico.' : undefined}
    >
      {open && <RuleForm key={rule?.id ?? 'nova'} rule={rule} draft={draft} suggestedEnd={suggestedEnd} onClose={onClose} />}
    </Sheet>
  )
}

function RuleForm({
  rule,
  draft,
  suggestedEnd,
  onClose,
}: {
  rule?: RecurringTask
  draft?: { title: string; goalId?: string; repeat: Repeat }
  suggestedEnd?: string
  onClose: () => void
}) {
  const { today } = useClock()
  const { toast } = useShell()
  const addRule = useStore(state => state.addRule)
  const updateRule = useStore(state => state.updateRule)
  const removeRule = useStore(state => state.removeRule)
  const base = rule ?? draft
  const [title, setTitle] = useState(base?.title ?? '')
  const [repeat, setRepeat] = useState<Repeat | null>(base?.repeat ?? null)
  const [confirming, setConfirming] = useState(false)
  // ao editar, a repetição recomeça hoje se o início já passou (assim a mudança não reescreve o passado)
  const start = rule && rule.repeat.start < today ? today : (base?.repeat.start ?? today)

  const save = () => {
    if (!title.trim() || !repeat) return
    if (rule) {
      // o histórico anterior a hoje fica com a regra antiga, como na agenda ("este e os seguintes")
      updateRule(rule.id, { title: title.trim(), repeat: { ...repeat, start } })
      toast('Repetição atualizada')
    } else {
      addRule({ title, goalId: draft?.goalId, repeat: { ...repeat, start } })
      toast('Tarefa agendada')
    }
    onClose()
  }

  return (
    <div className="flex flex-col gap-4">
      <Field label="Tarefa" htmlFor="regra-titulo">
        <input id="regra-titulo" className="field" value={title} onChange={event => setTitle(event.target.value)} placeholder="Ex.: ir à academia" />
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] text-muted">Repetir</span>
        <RepeatPicker value={repeat} onChange={setRepeat} start={start} allowNone={false} suggestedEnd={suggestedEnd} />
      </div>
      <Button block disabled={!title.trim() || !repeat} onClick={save}>
        {rule ? 'Salvar' : 'Agendar'}
      </Button>
      {rule &&
        (confirming ? (
          <div className="card p-3">
            <p className="text-[13px]">Parar de repetir? As tarefas já feitas continuam no histórico, e as próximas saem da agenda.</p>
            <div className="mt-2 flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  removeRule(rule.id, today)
                  toast('A tarefa parou de se repetir')
                  onClose()
                }}
              >
                Parar de repetir
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            Parar de repetir
          </Button>
        ))}
    </div>
  )
}
