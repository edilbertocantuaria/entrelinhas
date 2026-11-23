'use client'

import { Check, Flag, Pencil, Repeat as RepeatIcon, Target, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { RuleSheet } from '@/components/rule-sheet'
import { TaskSheet } from '@/components/task-sheet'
import { ESTHER, EstherAvatar } from '@/components/esther'
import { buttonVariants } from '@/components/ui/button'
import { defaultRepeat, describe, nextDates, repeatEndFor, suggestRepeat } from '@/domain/recurrence'
import { untilLabel } from '@/domain/goal-draft'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Missing, TopBar, useShell } from '@/components/app-shell'
import { AreaChip, BackButton, PacePill, useArea } from '@/components/common'
import { ArtPicker, goalArt, GoalChart, GoalProgress, GOAL_ART, logText, METRIC_ART, workoutText } from '@/components/goal-visuals'
import type { IllustrationName } from '@/components/illustration'
import { Illustration } from '@/components/illustration'
import { LogSheet } from '@/components/log-sheet'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/controls'
import { Sheet } from '@/components/ui/sheet'
import { fmt, shift, shortDay } from '@/shared/format'
import { logsOf, marcoReachedOn, METRIC_LABEL, milestoneDates, paceOf, progressOf, streakOf, untilText } from '@/domain/goals'
import { useStore } from '@/shared/store'
import { useClock } from '@/shared/time'
import type { Task } from '@/domain/types'
import { cn } from '@/shared/utils'

const TASK_STATE: Record<Task['status'], string> = { pending: 'pendente', done: 'feita', dismissed: 'dispensada', not_done: 'não feita' }

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { today } = useClock()
  const { toast } = useShell()
  const goal = useStore(state => state.goals.find(item => item.id === id))
  const logs = useStore(state => state.logs)
  const tasks = useStore(state => state.tasks)
  const hideStreaks = useStore(state => state.settings.hideStreaks)
  const addLog = useStore(state => state.addLog)
  const removeLog = useStore(state => state.removeLog)
  const updateGoal = useStore(state => state.updateGoal)
  const deleteGoal = useStore(state => state.deleteGoal)
  const area = useArea(goal?.areaId)

  const [logging, setLogging] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [allLogs, setAllLogs] = useState(false)
  const [picking, setPicking] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [marking, setMarking] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const editingTask = useStore(state => state.tasks.find(task => task.id === editingTaskId) ?? null)
  const setEditingTask = (task: Task | null) => setEditingTaskId(task?.id ?? null)
  const goals = useStore(state => state.goals)
  const rule = useStore(state => state.rules.find(item => item.goalId === id))

  if (!goal) return <Missing title="Meta não encontrada" description="Ela pode ter sido excluída." href="/metas" action="Ver metas" />

  const m = goal.metric
  const progress = progressOf(goal, logs, today, goals)
  const pace = paceOf(goal, logs, tasks, today, goals)
  const until = goal.until
  const reached = marcoReachedOn(goal, goals, logs)
  const linkedGoal = until?.type === 'goal' ? goals.find(item => item.id === until.goalId) : undefined
  const history = [...logsOf(logs, goal.id)].reverse()
  const linked = tasks
    .filter(task => task.goalId === goal.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6)
  const done = milestoneDates(goal, logs)
  const streak = m.type === 'days' && !hideStreaks ? streakOf(goal, logs, today) : 0
  const upcoming = rule ? nextDates(rule, shift(today, 1), 3) : []
  const draftRepeat = suggestRepeat({ metric: m, startDate: today, deadline: goal.deadline, until }) ?? {
    ...defaultRepeat(today),
    end: repeatEndFor(goal),
  }

  const setReached = (on: boolean) => {
    if (until?.type !== 'event') return
    updateGoal(goal.id, { until: { type: 'event', text: until.text, ...(on ? { reachedOn: today } : {}) } })
    setMarking(false)
    toast(on ? 'Meta concluída. As tarefas dela saíram da agenda.' : 'A meta voltou a valer')
  }

  const toggleMilestone = (milestoneId: string, title: string) => {
    const existing = logs.find(log => log.goalId === goal.id && log.milestoneId === milestoneId)
    if (existing) removeLog(existing.id)
    else addLog({ goalId: goal.id, date: today, milestoneId, note: title })
  }

  return (
    <div className="pb-8">
      <TopBar
        title="Meta"
        back={<BackButton href="/metas" label="Voltar para Metas" />}
        right={
          <>
            <Link href={`/metas/nova?editar=${goal.id}`} className="icon-btn" aria-label="Editar meta">
              <Pencil size={20} strokeWidth={1.75} />
            </Link>
            <button type="button" className="icon-btn" aria-label="Excluir meta" onClick={() => setConfirming(true)}>
              <Trash2 size={20} strokeWidth={1.75} />
            </button>
          </>
        }
      />

      <div className="flex flex-col gap-4 px-5">
        <header className="flex flex-col items-center text-center">
          <button type="button" className="group relative rounded-card" aria-label="Trocar o ícone da meta" onClick={() => setPicking(true)}>
            <Illustration name={goalArt(goal)} height={120} decorative always />
            <span
              aria-hidden
              className="absolute right-0 bottom-1 grid size-8 place-items-center rounded-full border-[0.5px] border-line bg-surface text-muted group-hover:text-ink"
            >
              <Pencil size={14} strokeWidth={1.75} />
            </span>
          </button>
          <h2 className="mt-2 text-[20px] leading-snug font-medium">{goal.title}</h2>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <AreaChip area={area} />
            <PacePill status={pace.status} />
            {streak > 1 && <span className="text-[12px] text-muted">{streak} dias seguidos</span>}
          </div>
          <Link href={`/metas/ia?editar=${goal.id}`} className={cn(buttonVariants({ variant: 'soft', size: 'sm' }), 'mt-3 rounded-full pl-1.5')}>
            <EstherAvatar size={30} />
            Ajustar com a {ESTHER}
          </Link>
        </header>

        <section className="card p-4" aria-label="Progresso">
          <GoalProgress goal={goal} progress={progress} />
          <Button block className="mt-4" onClick={() => setLogging(true)} disabled={progress.concluded || (pace.status === 'done' && m.type === 'milestones')}>
            {progress.concluded ? 'Meta concluída' : m.type === 'milestones' ? 'Concluir próxima etapa' : 'Registrar'}
          </Button>
        </section>

        {until && (
          <section className="card flex items-start gap-3 p-4" aria-labelledby="marco-meta">
            <span
              aria-hidden
              className={cn('grid size-10 shrink-0 place-items-center rounded-full', reached ? 'bg-primary text-on-primary' : 'bg-primary-soft text-primary')}
            >
              {reached ? <Check size={20} strokeWidth={2} /> : <Flag size={20} strokeWidth={1.75} />}
            </span>
            <div className="min-w-0 flex-1">
              <h3 id="marco-meta" className="text-[15px] font-medium">
                Marco
              </h3>
              <p className="text-[13px]">
                Até{' '}
                {until.type === 'goal' && linkedGoal ? (
                  <Link href={`/metas/${linkedGoal.id}`} className="text-primary underline-offset-2 hover:underline">
                    concluir “{linkedGoal.title}”
                  </Link>
                ) : (
                  untilText(goal, goals)
                )}
              </p>
              <p className="mt-0.5 text-[12px] text-muted">
                {reached
                  ? `Atingido em ${fmt(reached, "d 'de' MMMM 'de' yyyy")}. As tarefas e sugestões desta meta pararam.`
                  : until.type === 'goal'
                    ? 'Esta meta termina sozinha quando a outra for concluída.'
                    : goal.deadline
                      ? `Data estimada: ${fmt(goal.deadline, "d 'de' MMMM 'de' yyyy")}.`
                      : 'Sem data marcada. A meta segue até o marco acontecer.'}
              </p>
              {until.type === 'event' &&
                (reached ? (
                  <Button variant="ghost" size="sm" className="-ml-3 mt-1" onClick={() => setReached(false)}>
                    Desfazer
                  </Button>
                ) : (
                  <Button variant="soft" size="sm" className="mt-2" onClick={() => setMarking(true)}>
                    <Flag size={16} strokeWidth={1.75} aria-hidden />
                    Marco atingido
                  </Button>
                ))}
            </div>
          </section>
        )}

        <section className="card flex items-start gap-3 p-4" aria-labelledby="agenda-meta">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <RepeatIcon size={20} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="agenda-meta" className="text-[15px] font-medium">
              Na agenda
            </h3>
            {progress.concluded ? (
              <p className="text-[13px] text-muted">A meta foi concluída: as tarefas dela saíram da agenda. As já feitas continuam no histórico.</p>
            ) : rule ? (
              <>
                <p className="text-[13px]">
                  {rule.title}: {describe(rule.repeat).toLocaleLowerCase('pt-BR')}
                </p>
                {upcoming.length > 0 && (
                  <p className="mt-0.5 text-[12px] text-muted">Próximas: {upcoming.map(date => fmt(date, "EEE, d 'de' MMM")).join(' · ')}</p>
                )}
              </>
            ) : (
              <p className="text-[13px] text-muted">Sem tarefa fixa. As sugestões aparecem na abertura do dia.</p>
            )}
            {!progress.concluded && (
              <Button variant="ghost" size="sm" className="-ml-3 mt-1" onClick={() => setScheduling(true)}>
                {rule ? 'Editar repetição' : 'Agendar tarefa'}
              </Button>
            )}
          </div>
        </section>

        <section className="card p-4" aria-labelledby="ritmo">
          <h3 id="ritmo" className="text-[13px] text-muted">
            Ritmo
          </h3>
          <p className="mt-1 text-[14px]">{pace.explanation}</p>
          {pace.catchUp && (
            <div className="mt-3 flex items-start gap-2.5 rounded-ctl bg-alert-soft p-3">
              <Target size={18} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0 text-alert" />
              <p className="text-[14px]">
                <span className="block text-[12px] font-medium text-alert">Para ficar no ritmo</span>
                {pace.catchUp}
              </p>
            </div>
          )}
        </section>

        {m.type === 'milestones' ? (
          <section className="card p-2" aria-labelledby="etapas">
            <h3 id="etapas" className="px-2 pt-2 text-[13px] text-muted">
              Etapas
            </h3>
            <ul>
              {m.items.map(item => {
                const date = done.get(item.id)
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={!!date}
                      onClick={() => toggleMilestone(item.id, item.title)}
                      className="flex min-h-12 w-full items-center gap-3 rounded-ctl px-2 text-left"
                    >
                      <span
                        className={cn(
                          'grid size-6 shrink-0 place-items-center rounded-full border-[1.5px]',
                          date ? 'border-primary bg-primary text-on-primary' : 'border-muted',
                        )}
                      >
                        {date && <Check size={14} strokeWidth={2.5} aria-hidden />}
                      </span>
                      <span className={cn('flex-1 text-[14px]', date && 'text-muted')}>{item.title}</span>
                      {date && <span className="text-[12px] text-muted">{shortDay(date)}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ) : (
          <section className="card p-4" aria-labelledby="evolucao">
            <h3 id="evolucao" className="mb-2 text-[13px] text-muted">
              Evolução
            </h3>
            <GoalChart goal={goal} logs={logs} today={today} />
          </section>
        )}

        <section className="card p-4" aria-labelledby="sobre">
          <h3 id="sobre" className="text-[13px] text-muted">
            Sobre a meta
          </h3>
          <dl className="mt-2 flex flex-col gap-3 text-[14px]">
            {(
              [
                ['Específica', goal.description],
                ['Mensurável', METRIC_LABEL[m.type].name],
                ['Alcançável', [goal.startingPoint, goal.achievableNote].filter(Boolean).join(' ')],
                ['Relevante', goal.why],
                ['Prazo', untilLabel(goal, goals)],
              ] as const
            )
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[12px] text-muted">{label}</dt>
                  <dd className={label === 'Relevante' ? 'voice' : undefined}>{value}</dd>
                </div>
              ))}
          </dl>
        </section>

        {linked.length > 0 && (
          <section aria-labelledby="tarefas-ligadas">
            <h3 id="tarefas-ligadas" className="mb-2 text-[13px] text-muted">
              Tarefas ligadas
            </h3>
            <ul className="card divide-y-[0.5px] divide-line">
              {linked.map(task => (
                <li key={task.id}>
                  <button
                    type="button"
                    className="flex min-h-12 w-full items-center gap-3 py-2 pr-2 pl-4 text-left"
                    aria-label={`Editar tarefa: ${task.title}`}
                    onClick={() => setEditingTask(task)}
                  >
                    <span className="min-w-0 flex-1 truncate text-[14px]">{task.title}</span>
                    <span className="shrink-0 text-[12px] text-muted">
                      {task.later && task.status === 'pending' ? 'em Depois' : `${shortDay(task.date)} · ${TASK_STATE[task.status]}`}
                    </span>
                    <Pencil size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="historico">
          <h3 id="historico" className="mb-2 text-[13px] text-muted">
            Histórico de registros
          </h3>
          {history.length === 0 ? (
            <p className="card p-4 text-muted">Nenhum registro ainda.</p>
          ) : (
            <ul className="card divide-y-[0.5px] divide-line">
              {(allLogs ? history : history.slice(0, 6)).map(log => (
                <li key={log.id} className="flex items-start gap-2 py-1 pr-1 pl-4">
                  <div className="min-w-0 flex-1 py-2">
                    <p className="flex justify-between gap-3 text-[14px]">
                      <span>{logText(goal, log)}</span>
                      <span className="shrink-0 text-[12px] text-muted">{shortDay(log.date)}</span>
                    </p>
                    {workoutText(log).map(line => (
                      <p key={line} className="text-[12px] text-muted">
                        {line}
                      </p>
                    ))}
                    {m.type !== 'frequency' && m.type !== 'milestones' && log.note && <p className="text-[12px] text-muted">{log.note}</p>}
                  </div>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Remover registro de ${shortDay(log.date)}`}
                    onClick={() => {
                      removeLog(log.id)
                      toast('Registro removido')
                    }}
                  >
                    <X size={18} strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {history.length > 6 && (
            <Button variant="ghost" size="sm" className="mt-1" onClick={() => setAllLogs(!allLogs)}>
              {allLogs ? 'Ver menos' : `Ver todos os ${history.length}`}
            </Button>
          )}
        </section>

        <section className="card flex min-h-14 items-center gap-3 px-4">
          <div className="flex-1">
            <p className="text-[14px]">Lembrete</p>
            <p className="text-[12px] text-muted">{goal.reminder.on ? `Todos os dias às ${goal.reminder.time}` : 'Desligado'}</p>
          </div>
          <Switch checked={goal.reminder.on} onChange={on => updateGoal(goal.id, { reminder: { ...goal.reminder, on } })} label="Lembrete desta meta" />
        </section>
      </div>

      <LogSheet goalId={goal.id} open={logging} onClose={() => setLogging(false)} />

      <RuleSheet
        open={scheduling}
        onClose={() => setScheduling(false)}
        rule={rule}
        draft={{ title: goal.taskTitle || goal.title, goalId: goal.id, repeat: { ...draftRepeat, start: today > goal.startDate ? today : goal.startDate } }}
        suggestedEnd={until ? undefined : goal.deadline}
      />

      <TaskSheet task={editingTask} today={today} onClose={() => setEditingTask(null)} />

      <Sheet
        open={marking}
        onClose={() => setMarking(false)}
        title="O marco aconteceu?"
        description={`“${untilText(goal, goals)}”. A meta fica concluída a partir de hoje: as tarefas pendentes saem da agenda e as sugestões param. As tarefas feitas e os registros continuam no histórico, e dá para desfazer.`}
      >
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setMarking(false)}>
            Ainda não
          </Button>
          <Button className="flex-1" onClick={() => setReached(true)}>
            Sim, aconteceu
          </Button>
        </div>
      </Sheet>

      <Sheet open={picking} onClose={() => setPicking(false)} title="Ícone da meta">
        <ArtPicker
          value={goal.art && (GOAL_ART as string[]).includes(goal.art) ? (goal.art as IllustrationName) : null}
          auto={METRIC_ART[m.type]}
          onChange={art => {
            updateGoal(goal.id, { art: art ?? undefined })
            setPicking(false)
            toast('Ícone trocado')
          }}
        />
      </Sheet>

      <Sheet
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Excluir esta meta?"
        description="Os registros dela saem junto. As entradas do diário continuam guardadas."
      >
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              deleteGoal(goal.id)
              router.replace('/metas')
            }}
          >
            Excluir meta
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
