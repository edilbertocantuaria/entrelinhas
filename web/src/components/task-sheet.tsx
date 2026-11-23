'use client'

import { CalendarDays, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Chip, Field, Switch } from '@/components/ui/controls'
import { Sheet } from '@/components/ui/sheet'
import { fmt, mondayOf, shift } from '@/shared/format'
import { useStore } from '@/shared/store'
import type { Task } from '@/domain/types'

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

/** Escolher outro dia para uma tarefa. */
export function MoveSheet({ task, today, onClose }: { task: Task | null; today: string; onClose: () => void }) {
  const moveTask = useStore(state => state.moveTask)
  const { toast } = useShell()
  const [date, setDate] = useState('')
  const value = date || (task ? shift(task.date < today ? today : task.date, 1) : today)
  return (
    <Sheet
      open={!!task}
      onClose={() => {
        setDate('')
        onClose()
      }}
      title="Mover para outro dia"
      description={task?.title}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Amanhã', value: shift(today, 1) },
            { label: 'Em 2 dias', value: shift(today, 2) },
            { label: 'Próxima segunda', value: shift(mondayOf(today), 7) },
          ].map(option => (
            <Chip key={option.label} selected={value === option.value} onClick={() => setDate(option.value)}>
              {option.label}
            </Chip>
          ))}
        </div>
        <input
          type="date"
          aria-label="Novo dia"
          className="field"
          min={today}
          value={value}
          onChange={event => DAY_RE.test(event.target.value) && setDate(event.target.value)}
        />
        <Button
          block
          onClick={() => {
            if (!task) return
            moveTask(task.id, value)
            toast(`Movida para ${fmt(value, "EEEE, d 'de' MMM")}`)
            setDate('')
            onClose()
          }}
        >
          Mover
        </Button>
      </div>
    </Sheet>
  )
}

/**
 * Editar uma tarefa já criada (ex.: em "Tarefas ligadas" da meta):
 * renomear, mover de dia, tirar do dia ou desfazer a conclusão.
 */
export function TaskSheet({ task, today, onClose }: { task: Task | null; today: string; onClose: () => void }) {
  const [moving, setMoving] = useState<Task | null>(null)
  return (
    <>
      <Sheet open={!!task} onClose={onClose} title="Editar tarefa">
        {task && (
          <TaskForm
            key={task.id}
            task={task}
            onClose={onClose}
            onMove={() => {
              setMoving(task)
              onClose()
            }}
          />
        )}
      </Sheet>
      <MoveSheet task={moving} today={today} onClose={() => setMoving(null)} />
    </>
  )
}

function TaskForm({ task, onClose, onMove }: { task: Task; onClose: () => void; onMove: () => void }) {
  const { toast } = useShell()
  const renameTask = useStore(state => state.renameTask)
  const deleteTask = useStore(state => state.deleteTask)
  const uncompleteTask = useStore(state => state.uncompleteTask)
  const [title, setTitle] = useState(task.title)
  // o nome novo vale para as próximas da meta (menos em etapas, que têm o nome da etapa)
  const canFollow = !!task.goalId && !task.milestoneId
  const [upcoming, setUpcoming] = useState(canFollow)
  const clean = title.trim()
  const pending = task.status === 'pending'

  return (
    <div className="flex flex-col gap-4">
      <form
        className="flex flex-col gap-3"
        onSubmit={event => {
          event.preventDefault()
          if (!clean) return
          renameTask(task.id, clean, canFollow && upcoming)
          toast('Tarefa renomeada')
          onClose()
        }}
      >
        <Field label="Nome da tarefa" htmlFor="tarefa-nome" hint={clean ? undefined : 'Dê um nome para a tarefa.'}>
          <input id="tarefa-nome" className="field" value={title} onChange={event => setTitle(event.target.value)} />
        </Field>
        {canFollow && (
          <div className="flex min-h-11 items-center gap-3">
            <div className="flex-1">
              <p className="text-[14px]">Usar nas próximas</p>
              <p className="text-[12px] text-muted">A repetição na agenda e as próximas tarefas desta meta ganham o mesmo nome.</p>
            </div>
            <Switch checked={upcoming} onChange={setUpcoming} label="Usar o nome nas próximas tarefas" />
          </div>
        )}
        <Button type="submit" block disabled={!clean || clean === task.title}>
          Salvar nome
        </Button>
      </form>

      <div className="flex flex-col gap-2 border-t-[0.5px] border-line pt-4">
        {pending && (
          <Button variant="outline" block className="justify-start" onClick={onMove}>
            <CalendarDays size={18} strokeWidth={1.75} aria-hidden />
            Mover para outro dia
          </Button>
        )}
        {task.status === 'done' && (
          <Button
            variant="outline"
            block
            className="justify-start"
            onClick={() => {
              uncompleteTask(task.id)
              toast('Voltou a ficar pendente')
              onClose()
            }}
          >
            <RotateCcw size={18} strokeWidth={1.75} aria-hidden />
            Desfazer conclusão
          </Button>
        )}
        {pending && (
          <Button
            variant="outline"
            block
            className="justify-start"
            onClick={() => {
              deleteTask(task.id)
              toast(task.ruleId ? 'Tirada deste dia. A repetição continua.' : 'Tarefa excluída')
              onClose()
            }}
          >
            <Trash2 size={18} strokeWidth={1.75} aria-hidden />
            {task.ruleId ? 'Tirar deste dia (só este)' : 'Excluir tarefa'}
          </Button>
        )}
      </div>
    </div>
  )
}
