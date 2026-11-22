'use client'

import { ArrowRight, Check, ChevronDown, Ellipsis, ListChecks, Plus, Sun, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useShell } from '@/components/app-shell'
import { EmptyState, GoalChip, MoodPicker, StarBurst } from '@/components/common'
import { CornerBlob, Illustration, useIllustrations } from '@/components/illustration'
import { LogSheet } from '@/components/log-sheet'
import { Button, buttonVariants } from '@/components/ui/button'
import { Chip, Field, ScrollRow } from '@/components/ui/controls'
import { Sheet } from '@/components/ui/sheet'
import { longDay, plural } from '@/lib/format'
import { suggestTasks, todayTasks } from '@/lib/goals'
import { useStore } from '@/lib/store'
import { periodShort } from '@/lib/summaries'
import { useClock } from '@/lib/time'
import type { Task } from '@/lib/types'
import { cn } from '@/lib/utils'

const GREETING = { morning: 'Bom dia', afternoon: 'Boa tarde', night: 'Boa noite' }

export default function TodayPage() {
  const { today, part } = useClock()
  const { scroller, toast } = useShell()
  const tasks = useStore(state => state.tasks)
  const goals = useStore(state => state.goals)
  const logs = useStore(state => state.logs)
  const areas = useStore(state => state.areas)
  const day = useStore(state => state.day)
  const maxTasks = useStore(state => state.settings.maxTasks)
  const completeTask = useStore(state => state.completeTask)
  const uncompleteTask = useStore(state => state.uncompleteTask)
  const bringToToday = useStore(state => state.bringToToday)
  const sendToLater = useStore(state => state.sendToLater)
  const deleteTask = useStore(state => state.deleteTask)
  const reopenDay = useStore(state => state.reopenDay)

  const [logTask, setLogTask] = useState<Task | null>(null)
  const [menuTask, setMenuTask] = useState<Task | null>(null)
  const [adding, setAdding] = useState(false)
  const [limitOpen, setLimitOpen] = useState(false)
  const [laterOpen, setLaterOpen] = useState(false)
  const [burst, setBurst] = useState<string | null>(null)
  const [fade, setFade] = useState(1)

  // A ilustração do cabeçalho some conforme a lista rola
  useEffect(() => {
    if (!scroller) return
    const onScroll = () => setFade(Math.max(0, 1 - scroller.scrollTop / 90))
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [scroller])

  const list = useMemo(() => todayTasks(tasks, today), [tasks, today])
  const later = tasks.filter(task => task.later && task.status === 'pending')
  const overdue = tasks.filter(task => !task.later && task.status === 'pending' && task.date < today)
  const suggestions = useMemo(
    () => suggestTasks(goals, logs, tasks, today, new Set(areas.filter(area => area.archived).map(area => area.id))),
    [goals, logs, tasks, today, areas],
  )
  const waiting = overdue.length + suggestions.length
  const opened = day.openedOn === today
  const closed = day.closedOn === today
  const allDone = list.length > 0 && list.every(task => task.status === 'done')
  const full = list.length >= maxTasks

  const celebrate = (id: string) => {
    setBurst(id)
    window.setTimeout(() => setBurst(current => (current === id ? null : current)), 800)
  }

  const toggle = (task: Task) => {
    if (task.status === 'done') return uncompleteTask(task.id)
    if (task.goalId && goals.some(goal => goal.id === task.goalId)) return setLogTask(task)
    completeTask(task.id, null, today)
    celebrate(task.id)
  }

  return (
    <div className="px-5 pt-6 pb-8">
      <header className="relative mb-5 min-h-[72px] pr-20">
        <div className="pointer-events-none absolute -top-1 right-0" style={{ opacity: fade }}>
          <Illustration name={`time-${part}`} height={72} />
        </div>
        <p className="text-[12px] text-muted">{GREETING[part]}</p>
        <h1 className="voice mt-0.5 text-[22px] leading-tight font-medium">{longDay(today)}</h1>
      </header>

      <ReadyBanner />

      {!opened && !closed && (
        <section className="card relative isolate mb-4 overflow-hidden p-4">
          <CornerBlob />
          <h2 className="text-[15px] font-medium">Um novo dia</h2>
          <p className="mt-0.5 text-[13px] text-muted">Escolha com calma o que entra hoje.</p>
          <Link href="/abertura" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'mt-3')}>
            Abrir o dia
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
          </Link>
        </section>
      )}

      <section aria-labelledby="tarefas-titulo">
        <div className="mb-2 flex items-center gap-2">
          <h2 id="tarefas-titulo" className="text-[15px] font-medium">
            Tarefas
          </h2>
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[12px] tabular-nums" aria-label={`${list.length} de ${maxTasks} tarefas no limite de hoje`}>
            {list.length} de {maxTasks}
          </span>
          <span className="flex-1" />
          {list.length > 0 && (
            <Button variant="ghost" size="sm" className="-mr-2" onClick={() => setAdding(true)}>
              <Plus size={18} strokeWidth={1.75} aria-hidden />
              Adicionar
            </Button>
          )}
        </div>

        {list.length === 0 ? (
          <div className="card">
            <EmptyState
              illustration="today-empty"
              icon={Sun}
              title="Nada por aqui hoje"
              description="Aproveite o dia ou adicione uma tarefa."
              action={<Button onClick={() => setAdding(true)}>Adicionar tarefa</Button>}
            />
          </div>
        ) : (
          <ul className="card divide-y-[0.5px] divide-line">
            {list.map(task => {
              const done = task.status === 'done'
              return (
                <li key={task.id} className="flex min-h-[60px] items-center pr-1">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    onClick={() => toggle(task)}
                    className="flex min-h-[60px] min-w-0 flex-1 items-center gap-3 rounded-card py-2.5 pl-4 text-left"
                  >
                    <span className="relative grid size-6 shrink-0 place-items-center">
                      <span className={cn('grid size-6 place-items-center rounded-full border-[1.5px] transition-colors', done ? 'border-primary bg-primary text-on-primary' : 'border-muted')}>
                        {done && <Check size={14} strokeWidth={2.5} aria-hidden />}
                      </span>
                      {burst === task.id && <StarBurst />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-[14px]', done && 'text-muted line-through')}>{task.title}</span>
                      {task.goalId && <GoalChip goalId={task.goalId} className="mt-1" />}
                    </span>
                  </button>
                  <button type="button" className="icon-btn" aria-label={`Mais opções: ${task.title}`} onClick={() => setMenuTask(task)}>
                    <Ellipsis size={20} strokeWidth={1.75} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {opened && !closed && waiting > 0 && (
          <Link href="/abertura" className="mt-2 flex min-h-11 items-center gap-2 rounded-ctl px-1 text-[13px] text-primary">
            <ListChecks size={18} strokeWidth={1.75} aria-hidden />
            <span className="flex-1">Planejar o dia</span>
            <span className="text-muted">
              {waiting} {plural(waiting, 'esperando', 'esperando')}
            </span>
          </Link>
        )}

        {allDone && <AllDone />}
      </section>

      {later.length > 0 && (
        <section className="mt-4">
          <button type="button" aria-expanded={laterOpen} aria-controls="depois" onClick={() => setLaterOpen(!laterOpen)} className="flex min-h-11 w-full items-center gap-2 rounded-ctl px-1 text-left text-muted">
            <span className="text-[14px]">Depois</span>
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[12px] text-ink tabular-nums">{later.length}</span>
            <span className="flex-1" />
            <ChevronDown size={20} strokeWidth={1.75} aria-hidden className={cn('transition-transform', laterOpen && 'rotate-180')} />
          </button>
          {laterOpen && (
            <ul id="depois" className="card fade-in divide-y-[0.5px] divide-line">
              {later.map(task => (
                <li key={task.id} className="flex min-h-14 items-center gap-1 pr-1 pl-4">
                  <span className="min-w-0 flex-1 py-2">
                    <span className="block text-[14px]">{task.title}</span>
                    {task.goalId && <GoalChip goalId={task.goalId} className="mt-1" />}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (!bringToToday(task.id, today)) setLimitOpen(true)
                    }}
                  >
                    Trazer para hoje
                  </Button>
                  <button type="button" className="icon-btn" aria-label={`Excluir: ${task.title}`} onClick={() => deleteTask(task.id)}>
                    <X size={18} strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <JournalCard today={today} />

      <div className="mt-6">
        {closed ? (
          <div className="card flex items-center gap-3 p-4">
            <div className="flex-1">
              <p className="text-[15px] font-medium">Dia fechado</p>
              <p className="text-[13px] text-muted">Bom descanso. Amanhã você começa do zero.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={reopenDay}>
              Reabrir
            </Button>
          </div>
        ) : (
          <Link href="/fechamento" className={buttonVariants({ variant: list.length === 0 ? 'outline' : 'primary', block: true })}>
            Fechar o dia
          </Link>
        )}
      </div>

      <LogSheet goalId={logTask?.goalId} task={logTask ?? undefined} open={!!logTask} onClose={() => setLogTask(null)} onLogged={() => logTask && celebrate(logTask.id)} />

      <AddTaskSheet
        open={adding}
        full={full}
        onClose={() => setAdding(false)}
        onAdded={where => {
          if (where === 'later') {
            setLimitOpen(true)
            setLaterOpen(true)
          }
        }}
      />

      <Sheet
        open={limitOpen}
        onClose={() => setLimitOpen(false)}
        title="Hoje já está completo"
        description={`O limite de ${maxTasks} tarefas mantém o dia leve. O que passar disso espera em Depois, sem prazo.`}
        header={
          <div className="flex justify-center">
            <Illustration name="limit-reached" height={120} decorative />
          </div>
        }
      >
        <Button block onClick={() => setLimitOpen(false)}>
          Entendi
        </Button>
      </Sheet>

      <Sheet open={!!menuTask} onClose={() => setMenuTask(null)} title={menuTask?.title ?? ''}>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            block
            className="justify-start"
            onClick={() => {
              if (menuTask) sendToLater(menuTask.id)
              setMenuTask(null)
              toast('Guardada em Depois')
            }}
          >
            <ArrowRight size={18} strokeWidth={1.75} aria-hidden />
            Deixar para depois
          </Button>
          <Button
            variant="outline"
            block
            className="justify-start"
            onClick={() => {
              if (menuTask) deleteTask(menuTask.id)
              setMenuTask(null)
            }}
          >
            <Trash2 size={18} strokeWidth={1.75} aria-hidden />
            Excluir tarefa
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

/** Aviso calmo de resumo ou retrospectiva prontos. Sem contadores, sem pressão. */
function ReadyBanner() {
  const summaries = useStore(state => state.summaries)
  const retros = useStore(state => state.retros)
  const updateSummary = useStore(state => state.updateSummary)
  const updateRetro = useStore(state => state.updateRetro)
  const showArt = useIllustrations('extra')

  const retro = Object.values(retros).find(item => item.banner)
  const summary = [...summaries].filter(item => !item.seen).sort((a, b) => b.end.localeCompare(a.end))[0]
  if (!retro && !summary) return null

  const title = retro ? `Sua retrospectiva de ${retro.year} está pronta` : `Seu resumo de ${periodShort(summary)} está pronto`
  const href = retro ? `/retrospectiva/${retro.year}` : `/diario/resumo/${summary.id}`
  const dismiss = () => (retro ? updateRetro(retro.year, { banner: false }) : updateSummary(summary.id, { seen: true }))

  return (
    <section className="relative mb-4 flex items-center gap-3 rounded-card bg-primary-soft py-3 pr-11 pl-3" aria-label="Aviso">
      {showArt && <Illustration name={retro ? 'year-retro' : 'summary-ready'} height={64} decorative />}
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium">{title}</p>
        <Link href={href} onClick={dismiss} className="mt-0.5 inline-flex min-h-11 items-center gap-1 text-[13px] font-medium text-primary">
          {retro ? 'Ver retrospectiva' : 'Ver resumo'}
          <ArrowRight size={16} strokeWidth={1.75} aria-hidden />
        </Link>
      </div>
      <button type="button" className="icon-btn absolute top-0 right-0" aria-label="Dispensar aviso" onClick={dismiss}>
        <X size={18} strokeWidth={1.75} />
      </button>
    </section>
  )
}

function AllDone() {
  const showArt = useIllustrations('core')
  return (
    <div className="card fade-in mt-3 flex items-center gap-3 p-4">
      {showArt && <Illustration name="all-done" height={72} level="core" decorative />}
      <div>
        <p className="text-[15px] font-medium">Tudo feito por hoje</p>
        <p className="text-[13px] text-muted">O resto do dia é seu.</p>
      </div>
    </div>
  )
}

function JournalCard({ today }: { today: string }) {
  const entry = useStore(state => state.journal.find(item => item.date === today))
  const goals = useStore(state => state.goals)
  const saveJournal = useStore(state => state.saveJournal)
  const tags = entry?.goalIds ?? []

  return (
    <section className="mt-6" aria-labelledby="diario-titulo">
      <h2 id="diario-titulo" className="mb-2 text-[15px] font-medium">
        Diário de hoje
      </h2>
      <div className="card p-3">
        <MoodPicker value={entry?.mood} onChange={mood => saveJournal(today, { mood })} />
        <textarea
          aria-label="Texto do diário de hoje"
          className="voice mt-2 block min-h-32 w-full resize-none rounded-ctl bg-transparent p-2 text-[15px] leading-[1.7] placeholder:text-muted"
          placeholder="Como foi o dia, do seu jeito."
          value={entry?.text ?? ''}
          onChange={event => saveJournal(today, { text: event.target.value })}
        />
        {goals.length > 0 && (
          <div className="-mx-3 border-t-[0.5px] border-line pt-3">
            <ScrollRow className="px-3" label="Metas ligadas a esta entrada" fade="var(--surface)">
              {goals.map(goal => {
                const selected = tags.includes(goal.id)
                return (
                  <Chip key={goal.id} selected={selected} onClick={() => saveJournal(today, { goalIds: selected ? tags.filter(id => id !== goal.id) : [...tags, goal.id] })}>
                    {goal.title}
                  </Chip>
                )
              })}
            </ScrollRow>
          </div>
        )}
      </div>
      <p className="mt-1.5 px-1 text-[12px] text-muted" aria-live="polite">
        {entry?.text.trim() ? 'Salvo neste aparelho.' : 'O texto é salvo enquanto você escreve.'}
      </p>
    </section>
  )
}

function AddTaskSheet({ open, full, onClose, onAdded }: { open: boolean; full: boolean; onClose: () => void; onAdded: (where: 'today' | 'later') => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Nova tarefa" description={full ? 'Hoje já está completo. Esta tarefa vai para Depois.' : 'Não precisa estar ligada a uma meta.'}>
      <AddTaskForm key={String(open)} onClose={onClose} onAdded={onAdded} />
    </Sheet>
  )
}

function AddTaskForm({ onClose, onAdded }: { onClose: () => void; onAdded: (where: 'today' | 'later') => void }) {
  const goals = useStore(state => state.goals)
  const addTask = useStore(state => state.addTask)
  const { today } = useClock()
  const [title, setTitle] = useState('')
  const [goalId, setGoalId] = useState<string | undefined>()

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={event => {
        event.preventDefault()
        if (!title.trim()) return
        const where = addTask({ title, goalId }, today)
        onClose()
        onAdded(where)
      }}
    >
      <Field label="O que você quer fazer?" htmlFor="nova-tarefa">
        <input id="nova-tarefa" className="field" autoFocus placeholder="Ex.: comprar pão" value={title} onChange={event => setTitle(event.target.value)} />
      </Field>
      {goals.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-muted">Meta (opcional)</span>
          <div className="-mx-5">
            <ScrollRow className="px-5" label="Meta (opcional)">
              {goals.map(goal => (
                <Chip key={goal.id} selected={goalId === goal.id} onClick={() => setGoalId(goalId === goal.id ? undefined : goal.id)}>
                  {goal.title}
                </Chip>
              ))}
            </ScrollRow>
          </div>
        </div>
      )}
      <Button type="submit" block disabled={!title.trim()}>
        Adicionar
      </Button>
    </form>
  )
}
