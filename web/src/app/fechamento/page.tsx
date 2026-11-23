'use client'

import { ArrowRight, EyeOff, Moon, X } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { TopBar } from '@/components/app-shell'
import { EmptyState, GoalChip, MoodPicker } from '@/components/common'
import { Illustration } from '@/components/illustration'
import { Button, buttonVariants } from '@/components/ui/button'
import { Chip } from '@/components/ui/controls'
import { plural, shift } from '@/shared/format'
import { todayTasks } from '@/domain/goals'
import { useStore } from '@/shared/store'
import { useClock } from '@/shared/time'
import { cn } from '@/shared/utils'

type Action = 'move' | 'discard' | 'dismiss'
type Decision = { action: Action; reason?: string }

const ACTIONS = [
  { action: 'move', label: 'Mover', hint: 'Vai para amanhã', icon: ArrowRight },
  { action: 'discard', label: 'Descartar', hint: 'Sai da lista', icon: X },
  { action: 'dismiss', label: 'Ignorar', hint: 'Não conta como falha', icon: EyeOff },
] as const

const REASONS = ['Doente', 'Viagem', 'Imprevisto', 'Descanso']

/** Fechamento do dia: resolver pendências em poucos toques e escrever no diário. */
export default function CloseDayPage() {
  const { today } = useClock()
  const tasks = useStore(state => state.tasks)
  const closedOn = useStore(state => state.day.closedOn)
  const entry = useStore(state => state.journal.find(item => item.date === today))
  const moveTask = useStore(state => state.moveTask)
  const discardTask = useStore(state => state.discardTask)
  const dismissTask = useStore(state => state.dismissTask)
  const saveJournal = useStore(state => state.saveJournal)
  const closeDay = useStore(state => state.closeDay)

  const pending = useMemo(() => todayTasks(tasks, today).filter(task => task.status === 'pending'), [tasks, today])
  const [step, setStep] = useState<'tasks' | 'journal' | 'done'>(() => (closedOn === today ? 'done' : pending.length ? 'tasks' : 'journal'))
  const [decisions, setDecisions] = useState<Record<string, Decision>>({})
  const hadTasks = useState(pending.length > 0)[0]

  const decide = (id: string, decision: Decision) => setDecisions(previous => ({ ...previous, [id]: decision }))
  const decideAll = (action: Action) => setDecisions(Object.fromEntries(pending.map(task => [task.id, { action }])))

  const applyDecisions = () => {
    const tomorrow = shift(today, 1)
    for (const task of pending) {
      const decision = decisions[task.id] ?? { action: 'move' }
      if (decision.action === 'move') moveTask(task.id, tomorrow)
      else if (decision.action === 'discard') discardTask(task.id)
      else dismissTask(task.id, decision.reason)
    }
    setStep('journal')
  }

  if (step === 'done')
    return (
      <div className="flex min-h-full flex-col justify-center">
        <EmptyState
          illustration="day-closed"
          icon={Moon}
          title="Dia fechado"
          description="Bom descanso. Amanhã você começa do zero."
          action={
            <Link href="/" className={buttonVariants()}>
              Voltar para Hoje
            </Link>
          }
        />
      </div>
    )

  const steps = hadTasks ? ['tasks', 'journal'] : ['journal']

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title="Fechar o dia"
        right={
          <Link href="/" className="icon-btn" aria-label="Sair do fechamento">
            <X size={20} strokeWidth={1.75} />
          </Link>
        }
      />
      {steps.length > 1 && (
        <div className="flex gap-1.5 px-5" role="img" aria-label={`Passo ${steps.indexOf(step) + 1} de ${steps.length}`}>
          {steps.map((name, index) => (
            <span key={name} className={cn('h-1 flex-1 rounded-full', index <= steps.indexOf(step) ? 'bg-primary' : 'bg-primary-soft')} />
          ))}
        </div>
      )}

      {step === 'tasks' ? (
        <>
          <div className="flex-1 px-5 pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <h2 className="text-[17px] font-medium">
                  {pending.length} {plural(pending.length, 'tarefa ficou aberta', 'tarefas ficaram abertas')}
                </h2>
                <p className="mt-1 text-[13px] text-muted">Escolha um destino para cada uma. Sem escolha, ela vai para amanhã.</p>
              </div>
              <Illustration name="step-tasks" height={84} decorative />
            </div>

            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => decideAll('move')}>
                Mover tudo
              </Button>
              <Button variant="outline" size="sm" onClick={() => decideAll('discard')}>
                Descartar tudo
              </Button>
            </div>

            <ul className="mt-4 flex flex-col gap-3">
              {pending.map(task => {
                const decision = decisions[task.id]
                return (
                  <li key={task.id} className="card p-3">
                    <p className="text-[14px]">{task.title}</p>
                    {task.goalId && <GoalChip goalId={task.goalId} className="mt-1" />}
                    <div className="mt-3 grid grid-cols-3 gap-2" role="radiogroup" aria-label={`Destino de: ${task.title}`}>
                      {ACTIONS.map(option => {
                        const on = decision?.action === option.action
                        return (
                          <button
                            key={option.action}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            title={option.hint}
                            onClick={() => decide(task.id, { action: option.action })}
                            className={cn(
                              'flex h-11 items-center justify-center gap-1.5 rounded-ctl border-[0.5px] text-[13px]',
                              on ? 'border-primary bg-primary-soft font-medium text-ink' : 'border-line text-muted',
                            )}
                          >
                            <option.icon size={16} strokeWidth={1.75} aria-hidden />
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                    {decision?.action === 'dismiss' && (
                      <div className="fade-in mt-3">
                        <p className="mb-2 text-[12px] text-muted">Motivo (opcional). Tarefas ignoradas não contam contra o ritmo da meta.</p>
                        <div className="flex flex-wrap gap-2">
                          {REASONS.map(reason => (
                            <Chip key={reason} selected={decision.reason === reason} onClick={() => decide(task.id, { action: 'dismiss', reason: decision.reason === reason ? undefined : reason })}>
                              {reason}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
          <div className="sticky bottom-0 border-t-[0.5px] border-line bg-bg px-5 py-3">
            <Button block onClick={applyDecisions}>
              Continuar
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 px-5 pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <h2 className="text-[17px] font-medium">Como foi o dia?</h2>
                <p className="mt-1 text-[13px] text-muted">Uma linha já vale. Pode deixar em branco também.</p>
              </div>
              <Illustration name="step-journal" height={84} decorative />
            </div>
            <div className="card mt-4 p-3">
              <MoodPicker value={entry?.mood} onChange={mood => saveJournal(today, { mood })} />
              <textarea
                aria-label="Texto do diário de hoje"
                className="voice mt-2 block min-h-44 w-full resize-none rounded-ctl bg-transparent p-2 text-[15px] leading-[1.7] placeholder:text-muted"
                placeholder="Como foi o dia, do seu jeito."
                value={entry?.text ?? ''}
                onChange={event => saveJournal(today, { text: event.target.value })}
              />
            </div>
          </div>
          <div className="sticky bottom-0 border-t-[0.5px] border-line bg-bg px-5 py-3">
            <Button
              block
              onClick={() => {
                closeDay(today)
                setStep('done')
              }}
            >
              Fechar o dia
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
