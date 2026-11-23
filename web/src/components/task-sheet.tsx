'use client'

import { CalendarDays, Copy, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Chip, Field, Switch } from '@/components/ui/controls'
import { Sheet } from '@/components/ui/sheet'
import { plannedOn } from '@/domain/recurrence'
import { cap, fmt, mondayOf, shift } from '@/shared/format'
import { useStore } from '@/shared/store'
import type { Task } from '@/domain/types'

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

/** Atalhos e calendário para escolher um dia de hoje em diante. */
function DayChoice({ value, today, onChange, withToday }: { value: string; today: string; onChange: (date: string) => void; withToday?: boolean }) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {[
          ...(withToday ? [{ label: 'Hoje', value: today }] : []),
          { label: 'Amanhã', value: shift(today, 1) },
          { label: 'Em 2 dias', value: shift(today, 2) },
          { label: 'Próxima segunda', value: shift(mondayOf(today), 7) },
        ].map(option => (
          <Chip key={option.label} selected={value === option.value} onClick={() => onChange(option.value)}>
            {option.label}
          </Chip>
        ))}
      </div>
      <input
        type="date"
        aria-label="Dia"
        className="field"
        min={today}
        value={value}
        onChange={event => DAY_RE.test(event.target.value) && onChange(event.target.value)}
      />
    </>
  )
}

/** O que se copia: uma tarefa, ou uma ocorrência planejada de uma tarefa que se repete. */
export interface CopySource {
  title: string
  goalId?: string
  /** dia de origem (a sugestão de destino é o dia seguinte) */
  date: string
}

/**
 * Copiar uma tarefa para outro dia (ex.: o "Estudar AWS" de segunda também na terça).
 * A cópia é uma tarefa avulsa, ligada à mesma meta; a original fica onde está.
 * Respeita o limite diário: com o dia de destino cheio, a cópia espera em Depois.
 */
export function CopySheet({ source, today, onClose }: { source: CopySource | null; today: string; onClose: () => void }) {
  const addTask = useStore(state => state.addTask)
  const rules = useStore(state => state.rules)
  const goals = useStore(state => state.goals)
  const logs = useStore(state => state.logs)
  const tasks = useStore(state => state.tasks)
  const { toast } = useShell()
  const [date, setDate] = useState('')
  const value = date || (source ? shift(source.date < today ? today : source.date, 1) : today)
  // ocorrências planejadas no dia de destino ainda não viraram tarefa, mas ocupam lugar no limite
  // (a da mesma meta não: a cópia passa a valer como ela)
  const planned = value > today ? plannedOn(rules, goals, logs, tasks, value) : []
  const reserved = planned.filter(rule => !source?.goalId || rule.goalId !== source.goalId).length
  const sameGoal =
    !!source?.goalId &&
    (planned.some(rule => rule.goalId === source.goalId) ||
      tasks.some(task => task.goalId === source.goalId && task.date === value && !task.later && (task.status === 'pending' || task.status === 'done')))
  const close = () => {
    setDate('')
    onClose()
  }
  return (
    <Sheet open={!!source} onClose={close} title="Copiar para outro dia" description={source?.title}>
      <div className="flex flex-col gap-3">
        <DayChoice value={value} today={today} onChange={setDate} withToday={!!source && source.date !== today} />
        {sameGoal && (
          <p className="rounded-ctl bg-primary-soft p-3 text-[12px] leading-relaxed">
            Esse dia já tem uma tarefa desta meta. A cópia entra assim mesmo; numa repetição, ela vale como a ocorrência daquele dia.
          </p>
        )}
        <Button
          block
          onClick={() => {
            if (!source) return
            const where = addTask({ title: source.title, goalId: source.goalId }, value, reserved)
            const day = fmt(value, "EEEE, d 'de' MMM")
            toast(where === 'later' ? `${cap(day)} já estava cheio: a cópia espera em Depois.` : `Copiada para ${day}`)
            close()
          }}
        >
          Copiar
        </Button>
      </div>
    </Sheet>
  )
}

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
        <DayChoice value={value} today={today} onChange={setDate} />
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
  const [copying, setCopying] = useState<CopySource | null>(null)
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
            onCopy={() => {
              setCopying({ title: task.title, goalId: task.goalId, date: task.date })
              onClose()
            }}
          />
        )}
      </Sheet>
      <MoveSheet task={moving} today={today} onClose={() => setMoving(null)} />
      <CopySheet source={copying} today={today} onClose={() => setCopying(null)} />
    </>
  )
}

function TaskForm({ task, onClose, onMove, onCopy }: { task: Task; onClose: () => void; onMove: () => void; onCopy: () => void }) {
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
        <Button variant="outline" block className="justify-start" onClick={onCopy}>
          <Copy size={18} strokeWidth={1.75} aria-hidden />
          Copiar para outro dia
        </Button>
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
