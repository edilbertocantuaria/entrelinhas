'use client'

import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  ListChecks,
  Plus,
  Repeat as RepeatIcon,
  Sun,
  Trash2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useShell } from '@/components/app-shell'
import { EmptyState, GoalChip, MoodBadge, MoodPicker, StarBurst } from '@/components/common'
import { CornerBlob, Illustration, useIllustrations } from '@/components/illustration'
import { LogSheet } from '@/components/log-sheet'
import { RepeatPicker } from '@/components/repeat-picker'
import { RuleSheet } from '@/components/rule-sheet'
import { Button, buttonVariants } from '@/components/ui/button'
import { Chip, Field, ScrollRow } from '@/components/ui/controls'
import { Sheet } from '@/components/ui/sheet'
import { cap, fmt, iso, longDay, mondayOf, plural, shift } from '@/shared/format'
import { suggestTasks, todayTasks } from '@/domain/goals'
import { describe, plannedOn, scheduledGoals } from '@/domain/recurrence'
import { useStore } from '@/shared/store'
import { periodShort } from '@/domain/summaries'
import { useClock } from '@/shared/time'
import type { RecurringTask, Repeat, Task } from '@/domain/types'
import { cn } from '@/shared/utils'

const GREETING = { morning: 'Bom dia', afternoon: 'Boa tarde', night: 'Boa noite' }

/** Hoje, com a faixa da semana para ver outros dias. O dia escolhido fica na URL (?dia=aaaa-mm-dd). */
export default function TodayPage() {
  return (
    <Suspense fallback={null}>
      <TodayView />
    </Suspense>
  )
}

function TodayView() {
  const { today, part, now } = useClock()
  const rollover = useStore(state => state.settings.rollover)
  const { scroller } = useShell()
  const params = useSearchParams()
  const [picked, setPicked] = useState<string | null>(() => {
    const param = params.get('dia')
    return param && /^\d{4}-\d{2}-\d{2}$/.test(param) ? param : null
  })
  const date = picked ?? today

  const go = (next: string) => {
    setPicked(next === today ? null : next)
    window.history.replaceState(null, '', next === today ? '/' : `/?dia=${next}`)
    scroller?.scrollTo({ top: 0 })
  }

  return (
    <div className="px-5 pt-6 pb-8">
      <DayHeader date={date} today={today} part={part} onChange={go} />
      {/* depois da meia-noite e antes da virada do dia, o app ainda está no dia anterior */}
      {iso(now) !== today && date === today && (
        <p className="-mt-2 mb-4 rounded-ctl bg-primary-soft px-3 py-2 text-[12px] leading-relaxed">
          Até as {rollover}, a madrugada ainda conta como {fmt(today, 'EEEE')}. Dá para mudar em{' '}
          <Link href="/ajustes" className="font-medium text-primary underline-offset-2 hover:underline">
            Ajustes, Virada do dia
          </Link>
          .
        </p>
      )}
      {date === today ? <TodayContent today={today} /> : <OtherDay key={date} date={date} today={today} />}
    </div>
  )
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

/** Saudação, data (toque abre o calendário) e a faixa com os dias da semana. */
function DayHeader({ date, today, part, onChange }: { date: string; today: string; part: keyof typeof GREETING; onChange: (date: string) => void }) {
  const { scroller } = useShell()
  const tasks = useStore(state => state.tasks)
  const rules = useStore(state => state.rules)
  const goals = useStore(state => state.goals)
  const picker = useRef<HTMLInputElement>(null)
  const [fade, setFade] = useState(1)

  // A ilustração do cabeçalho some conforme a lista rola
  useEffect(() => {
    if (!scroller) return
    const onScroll = () => setFade(Math.max(0, 1 - scroller.scrollTop / 90))
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [scroller])

  // As setas só folheiam as semanas; o dia escolhido muda apenas ao tocar num dia (ou no calendário).
  const [weekStart, setWeekStart] = useState(() => mondayOf(date))
  const [syncedDate, setSyncedDate] = useState(date)
  if (syncedDate !== date) {
    // escolheu um dia fora da semana visível (calendário, "Voltar para hoje"): a faixa vai até ele
    setSyncedDate(date)
    setWeekStart(mondayOf(date))
  }
  const week = Array.from({ length: 7 }, (_, index) => shift(weekStart, index))
  const showingOtherWeek = weekStart !== mondayOf(date)
  const busy = (day: string) =>
    tasks.some(task => task.date === day && !task.later && task.status !== 'dismissed') || (day >= today && plannedOn(rules, goals, tasks, day).length > 0)
  const relative =
    date === today
      ? GREETING[part]
      : date === shift(today, 1)
        ? 'Amanhã'
        : date === shift(today, -1)
          ? 'Ontem'
          : date > today
            ? 'Dia planejado'
            : 'Dia que passou'

  const openPicker = () => {
    const input = picker.current
    if (!input) return
    try {
      input.showPicker()
    } catch {
      input.focus()
    }
  }

  return (
    <header className="mb-5">
      <div className="relative min-h-[72px] pr-20">
        <div className="pointer-events-none absolute -top-1 right-0" style={{ opacity: fade }}>
          <Illustration name={`time-${part}`} height={72} />
        </div>
        <p className="text-[12px] text-muted">{relative}</p>
        <button
          type="button"
          onClick={openPicker}
          className="-ml-1 flex items-center gap-1 rounded-ctl px-1 text-left"
          aria-label={`${longDay(date)}. Escolher outro dia`}
        >
          <h1 className="voice mt-0.5 text-[22px] leading-tight font-medium">{longDay(date)}</h1>
          <CalendarDays size={18} strokeWidth={1.75} aria-hidden className="shrink-0 text-muted" />
        </button>
        <input
          ref={picker}
          type="date"
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 h-0 w-0 opacity-0"
          value={date}
          onChange={event => DAY_RE.test(event.target.value) && onChange(event.target.value)}
        />
      </div>

      <nav aria-label="Dias da semana" className="mt-3 flex items-center gap-1">
        <button type="button" className="icon-btn -ml-2" aria-label="Semana anterior" onClick={() => setWeekStart(shift(weekStart, -7))}>
          <ChevronLeft size={20} strokeWidth={1.75} />
        </button>
        <div className="grid flex-1 grid-cols-7 gap-1">
          {week.map(day => {
            const selected = day === date
            const isToday = day === today
            return (
              <button
                key={day}
                type="button"
                onClick={() => onChange(day)}
                aria-current={selected ? 'date' : undefined}
                aria-label={`${longDay(day)}${isToday ? ', hoje' : ''}${busy(day) ? ', com tarefas' : ''}`}
                className={cn(
                  'relative flex h-14 flex-col items-center justify-center rounded-ctl text-[12px] transition-colors',
                  selected ? 'bg-primary text-on-primary' : isToday ? 'bg-primary-soft text-ink' : 'text-muted hover:bg-primary-soft',
                )}
              >
                <span>{fmt(day, 'EEEEEE')}</span>
                <span className={cn('text-[15px] tabular-nums', (selected || isToday) && 'font-medium')}>{fmt(day, 'd')}</span>
                {busy(day) && <span aria-hidden className={cn('absolute bottom-1.5 size-1 rounded-full', selected ? 'bg-on-primary' : 'bg-primary')} />}
              </button>
            )
          })}
        </div>
        <button type="button" className="icon-btn -mr-2" aria-label="Próxima semana" onClick={() => setWeekStart(shift(weekStart, 7))}>
          <ChevronRight size={20} strokeWidth={1.75} />
        </button>
      </nav>
      <div className={cn('flex items-center gap-3', (showingOtherWeek || date !== today) && 'mt-1 min-h-11')}>
        {showingOtherWeek && (
          <p className="flex-1 text-[12px] text-muted" aria-live="polite">
            Semana de {fmt(weekStart, "d 'de' MMM")} a {fmt(shift(weekStart, 6), "d 'de' MMM")}. Toque num dia para ver.
          </p>
        )}
        {date !== today && (
          <button
            type="button"
            onClick={() => onChange(today)}
            className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-1 text-[13px] font-medium text-primary"
          >
            <Sun size={16} strokeWidth={1.75} aria-hidden />
            Voltar para hoje
          </button>
        )}
        {date === today && showingOtherWeek && (
          <button
            type="button"
            onClick={() => setWeekStart(mondayOf(today))}
            className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-1 text-[13px] font-medium text-primary"
          >
            <Sun size={16} strokeWidth={1.75} aria-hidden />
            Esta semana
          </button>
        )}
      </div>
    </header>
  )
}

function TodayContent({ today }: { today: string }) {
  const { toast } = useShell()
  const rules = useStore(state => state.rules)
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
  const [moving, setMoving] = useState<Task | null>(null)
  const [editingRule, setEditingRule] = useState<string | null>(null)

  const list = useMemo(() => todayTasks(tasks, today), [tasks, today])
  const later = tasks.filter(task => task.later && task.status === 'pending')
  const overdue = tasks.filter(task => !task.later && task.status === 'pending' && task.date < today)
  const suggestions = useMemo(
    () => suggestTasks(goals, logs, tasks, today, new Set(areas.filter(area => area.archived).map(area => area.id)), scheduledGoals(rules)),
    [goals, logs, tasks, today, areas, rules],
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
    <>
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
          <span
            className="rounded-full bg-primary-soft px-2 py-0.5 text-[12px] tabular-nums"
            aria-label={`${list.length} de ${maxTasks} tarefas no limite de hoje`}
          >
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
                      <span
                        className={cn(
                          'grid size-6 place-items-center rounded-full border-[1.5px] transition-colors',
                          done ? 'border-primary bg-primary text-on-primary' : 'border-muted',
                        )}
                      >
                        {done && <Check size={14} strokeWidth={2.5} aria-hidden />}
                      </span>
                      {burst === task.id && <StarBurst />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('flex items-center gap-1.5 text-[14px]', done && 'text-muted line-through')}>
                        {task.title}
                        {task.ruleId && <RepeatIcon size={13} strokeWidth={1.75} className="shrink-0 text-muted" aria-label="Repete" />}
                      </span>
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
          <button
            type="button"
            aria-expanded={laterOpen}
            aria-controls="depois"
            onClick={() => setLaterOpen(!laterOpen)}
            className="flex min-h-11 w-full items-center gap-2 rounded-ctl px-1 text-left text-muted"
          >
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

      <LogSheet
        goalId={logTask?.goalId}
        task={logTask ?? undefined}
        open={!!logTask}
        onClose={() => setLogTask(null)}
        onLogged={() => logTask && celebrate(logTask.id)}
      />

      <AddTaskSheet
        open={adding}
        full={full}
        date={today}
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
              setMoving(menuTask)
              setMenuTask(null)
            }}
          >
            <CalendarDays size={18} strokeWidth={1.75} aria-hidden />
            Mover para outro dia
          </Button>
          {menuTask?.ruleId && rules.some(rule => rule.id === menuTask.ruleId) && (
            <Button
              variant="outline"
              block
              className="justify-start"
              onClick={() => {
                setEditingRule(menuTask.ruleId ?? null)
                setMenuTask(null)
              }}
            >
              <RepeatIcon size={18} strokeWidth={1.75} aria-hidden />
              Editar repetição
            </Button>
          )}
          <Button
            variant="outline"
            block
            className="justify-start"
            onClick={() => {
              if (menuTask) deleteTask(menuTask.id)
              if (menuTask?.ruleId) toast('Pulada só hoje. A repetição continua.')
              setMenuTask(null)
            }}
          >
            <Trash2 size={18} strokeWidth={1.75} aria-hidden />
            {menuTask?.ruleId ? 'Tirar de hoje (só hoje)' : 'Excluir tarefa'}
          </Button>
        </div>
      </Sheet>

      <MoveSheet task={moving} today={today} onClose={() => setMoving(null)} />
      <RuleSheet open={!!editingRule} onClose={() => setEditingRule(null)} rule={rules.find(rule => rule.id === editingRule)} />
    </>
  )
}

/** Escolher outro dia para uma tarefa. */
function MoveSheet({ task, today, onClose }: { task: Task | null; today: string; onClose: () => void }) {
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

const STATUS_LABEL: Record<Task['status'], string> = { pending: 'pendente', done: 'feita', dismissed: 'dispensada', not_done: 'não feita' }

/** Um dia que não é hoje: o plano (futuro) ou o que aconteceu (passado). */
function OtherDay({ date, today }: { date: string; today: string }) {
  const { toast } = useShell()
  const tasks = useStore(state => state.tasks)
  const rules = useStore(state => state.rules)
  const goals = useStore(state => state.goals)
  const maxTasks = useStore(state => state.settings.maxTasks)
  const entry = useStore(state => state.journal.find(item => item.date === date))
  const deleteTask = useStore(state => state.deleteTask)
  const skipOccurrence = useStore(state => state.skipOccurrence)
  const completeTask = useStore(state => state.completeTask)
  const uncompleteTask = useStore(state => state.uncompleteTask)
  const materializeOccurrence = useStore(state => state.materializeOccurrence)
  const onlyOnDay = useStore(state => !!state.settings.onlyOnDay)
  const [logging, setLogging] = useState<{ task: Task; date: string } | null>(null)

  /**
   * Dia que passou: marca como feita naquele dia (vale para "não feita" também).
   * Dia futuro: feita antes do tempo, fica registrada como feita hoje.
   * Com "Só marcar no dia" ligado em Ajustes, nada disso: só dá para ver.
   */
  const toggle = (task: Task) => {
    if (onlyOnDay) return toast('Em Ajustes, “Só marcar no dia” está ligado.')
    if (task.status === 'done') return uncompleteTask(task.id)
    const when = task.date > today ? today : task.date
    if (task.goalId && goals.some(goal => goal.id === task.goalId)) return setLogging({ task, date: when })
    completeTask(task.id, null, when)
    toast(when === today ? 'Feita hoje' : `Marcada como feita em ${fmt(when, "d 'de' MMM")}`)
  }
  const toggleRule = (rule: RecurringTask) => {
    if (onlyOnDay) return toast('Em Ajustes, “Só marcar no dia” está ligado.')
    const task = materializeOccurrence(rule.id, date, date)
    if (task) toggle(task)
  }
  const logSheet = (
    <LogSheet
      goalId={logging?.task.goalId}
      task={logging?.task}
      date={logging?.date}
      open={!!logging}
      onClose={() => setLogging(null)}
      onLogged={() => logging && toast(logging.date === today ? 'Feita hoje' : `Registrada em ${fmt(logging.date, "d 'de' MMM")}`)}
    />
  )

  const [adding, setAdding] = useState(false)
  const [moving, setMoving] = useState<Task | null>(null)
  const [editingRule, setEditingRule] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ task?: Task; rule?: RecurringTask } | null>(null)

  const future = date > today
  const real = tasks.filter(task => task.date === date && !task.later && (future ? task.status === 'pending' : true))
  const planned = future ? plannedOn(rules, goals, tasks, date) : []
  const count = real.length + planned.length
  const full = count >= maxTasks
  const showArt = useIllustrations('core')

  if (!future)
    return (
      <>
        <section aria-labelledby="como-foi">
          <h2 id="como-foi" className="mb-2 text-[15px] font-medium">
            Como foi
          </h2>
          {real.length === 0 ? (
            <p className="card p-4 text-[13px] text-muted">Nenhuma tarefa neste dia.</p>
          ) : (
            <ul className="card divide-y-[0.5px] divide-line">
              {real.map(task => (
                <li key={task.id}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={task.status === 'done'}
                    aria-disabled={onlyOnDay || undefined}
                    onClick={() => toggle(task)}
                    className="flex min-h-14 w-full items-center gap-3 rounded-card px-4 py-2.5 text-left"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-full border-[1.5px]',
                        task.status === 'done' ? 'border-primary bg-primary text-on-primary' : 'border-muted',
                      )}
                    >
                      {task.status === 'done' && <Check size={14} strokeWidth={2.5} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-[14px]', task.status !== 'done' && 'text-muted')}>{task.title}</span>
                      {task.goalId && <GoalChip goalId={task.goalId} className="mt-1" />}
                    </span>
                    <span className="shrink-0 text-[12px] text-muted">{STATUS_LABEL[task.status]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {real.some(task => task.status !== 'done') && (
            <p className="mt-2 px-1 text-[12px] text-muted">
              {onlyOnDay
                ? 'Só para ver: em Ajustes, “Só marcar no dia” está ligado.'
                : 'Esqueceu de marcar? Toque na tarefa para registrar como feita neste dia.'}
            </p>
          )}
        </section>
        {logSheet}
        <section className="mt-6" aria-labelledby="diario-dia">
          <h2 id="diario-dia" className="mb-2 text-[15px] font-medium">
            Diário
          </h2>
          {entry?.text.trim() || entry?.mood ? (
            <Link href="/diario" className="card block p-4">
              <MoodBadge mood={entry.mood} />
              {entry.text.trim() && <p className="voice mt-1 line-clamp-4 text-[15px] leading-[1.7]">{entry.text}</p>}
            </Link>
          ) : (
            <p className="card p-4 text-[13px] text-muted">Sem diário neste dia.</p>
          )}
        </section>
      </>
    )

  return (
    <>
      <section aria-labelledby="planejado">
        <div className="mb-2 flex items-center gap-2">
          <h2 id="planejado" className="text-[15px] font-medium">
            Planejado
          </h2>
          <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[12px] tabular-nums">
            {count} de {maxTasks}
          </span>
          <span className="flex-1" />
          {count > 0 && (
            <Button variant="ghost" size="sm" className="-mr-2" onClick={() => setAdding(true)}>
              <Plus size={18} strokeWidth={1.75} aria-hidden />
              Adicionar
            </Button>
          )}
        </div>

        {count === 0 ? (
          <div className="card flex flex-col items-center px-6 py-8 text-center">
            {showArt && <Illustration name="today-empty" height={110} level="core" decorative />}
            <p className="mt-3 text-[15px] font-medium">Nada planejado ainda</p>
            <p className="mt-1 text-[13px] text-muted">Deixe o dia livre ou adiante uma tarefa.</p>
            <Button className="mt-4" onClick={() => setAdding(true)}>
              Adicionar tarefa
            </Button>
          </div>
        ) : (
          <ul className="card divide-y-[0.5px] divide-line">
            {real.map(task => (
              <li key={task.id} className="flex min-h-[60px] items-center pr-1">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={false}
                  aria-disabled={onlyOnDay || undefined}
                  aria-label={`Concluir agora: ${task.title}`}
                  onClick={() => toggle(task)}
                  className="flex min-h-[60px] min-w-0 flex-1 items-center gap-3 rounded-card py-2.5 pl-4 text-left"
                >
                  <span aria-hidden className="size-6 shrink-0 rounded-full border-[1.5px] border-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[14px]">
                      {task.title}
                      {task.ruleId && <RepeatIcon size={13} strokeWidth={1.75} className="shrink-0 text-muted" aria-label="Repete" />}
                    </span>
                    {task.goalId && <GoalChip goalId={task.goalId} className="mt-1" />}
                  </span>
                </button>
                <button type="button" className="icon-btn" aria-label={`Mais opções: ${task.title}`} onClick={() => setMenu({ task })}>
                  <Ellipsis size={20} strokeWidth={1.75} />
                </button>
              </li>
            ))}
            {planned.map(rule => (
              <li key={rule.id} className="flex min-h-[60px] items-center pr-1">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={false}
                  aria-disabled={onlyOnDay || undefined}
                  aria-label={`Concluir agora: ${rule.title}`}
                  onClick={() => toggleRule(rule)}
                  className="flex min-h-[60px] min-w-0 flex-1 items-center gap-3 rounded-card py-2.5 pl-4 text-left"
                >
                  <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-full border-[1.5px] border-dashed border-muted text-muted">
                    <RepeatIcon size={12} strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px]">{rule.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      {rule.goalId && <GoalChip goalId={rule.goalId} />}
                      <span className="text-[12px] text-muted">{describe(rule.repeat)}</span>
                    </span>
                  </span>
                </button>
                <button type="button" className="icon-btn" aria-label={`Mais opções: ${rule.title}`} onClick={() => setMenu({ rule })}>
                  <Ellipsis size={20} strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 px-1 text-[12px] text-muted">
          As tarefas que se repetem entram sozinhas no dia.{' '}
          {onlyOnDay ? 'Elas podem ser marcadas quando o dia chegar.' : 'Já fez antes? Toque na tarefa para registrar como feita hoje.'}
        </p>
      </section>
      {logSheet}

      <AddTaskSheet
        open={adding}
        full={full}
        date={date}
        reserved={planned.length}
        onClose={() => setAdding(false)}
        onAdded={where => where === 'later' && toast(`Esse dia já tinha ${maxTasks} tarefas. A nova espera em Depois.`)}
      />

      <Sheet
        open={!!menu}
        onClose={() => setMenu(null)}
        title={menu?.task?.title ?? menu?.rule?.title ?? ''}
        description={menu?.rule ? describe(menu.rule.repeat) : undefined}
      >
        <div className="flex flex-col gap-2">
          {menu?.task && (
            <>
              <Button
                variant="outline"
                block
                className="justify-start"
                onClick={() => {
                  setMoving(menu.task ?? null)
                  setMenu(null)
                }}
              >
                <CalendarDays size={18} strokeWidth={1.75} aria-hidden />
                Mover para outro dia
              </Button>
              <Button
                variant="outline"
                block
                className="justify-start"
                onClick={() => {
                  if (menu.task) deleteTask(menu.task.id)
                  setMenu(null)
                }}
              >
                <Trash2 size={18} strokeWidth={1.75} aria-hidden />
                {menu.task.ruleId ? 'Tirar deste dia (só este)' : 'Excluir tarefa'}
              </Button>
            </>
          )}
          {menu?.rule && (
            <>
              <Button
                variant="outline"
                block
                className="justify-start"
                onClick={() => {
                  if (menu.rule) skipOccurrence(menu.rule.id, date)
                  toast('Pulada só neste dia')
                  setMenu(null)
                }}
              >
                <X size={18} strokeWidth={1.75} aria-hidden />
                Pular só este dia
              </Button>
              <Button
                variant="outline"
                block
                className="justify-start"
                onClick={() => {
                  setEditingRule(menu.rule?.id ?? null)
                  setMenu(null)
                }}
              >
                <RepeatIcon size={18} strokeWidth={1.75} aria-hidden />
                Editar repetição
              </Button>
            </>
          )}
        </div>
      </Sheet>

      <MoveSheet task={moving} today={today} onClose={() => setMoving(null)} />
      <RuleSheet open={!!editingRule} onClose={() => setEditingRule(null)} rule={rules.find(rule => rule.id === editingRule)} />
    </>
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
                  <Chip
                    key={goal.id}
                    selected={selected}
                    onClick={() => saveJournal(today, { goalIds: selected ? tags.filter(id => id !== goal.id) : [...tags, goal.id] })}
                  >
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

function AddTaskSheet({
  open,
  full,
  date,
  reserved = 0,
  onClose,
  onAdded,
}: {
  open: boolean
  full: boolean
  date: string
  /** ocorrências planejadas que ainda não viraram tarefa (contam no limite do dia) */
  reserved?: number
  onClose: () => void
  onAdded: (where: 'today' | 'later') => void
}) {
  const { today } = useClock()
  const dayName = date === today ? 'Hoje' : date === shift(today, 1) ? 'Amanhã' : cap(fmt(date, "EEEE, d 'de' MMM"))
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={date === today ? 'Nova tarefa' : `Nova tarefa: ${dayName.toLocaleLowerCase('pt-BR')}`}
      description={full ? `${dayName} já está completo. Uma tarefa avulsa vai para Depois.` : 'Não precisa estar ligada a uma meta.'}
    >
      <AddTaskForm key={String(open)} date={date} reserved={reserved} onClose={onClose} onAdded={onAdded} />
    </Sheet>
  )
}

function AddTaskForm({
  date,
  reserved,
  onClose,
  onAdded,
}: {
  date: string
  reserved: number
  onClose: () => void
  onAdded: (where: 'today' | 'later') => void
}) {
  const goals = useStore(state => state.goals)
  const addTask = useStore(state => state.addTask)
  const addRule = useStore(state => state.addRule)
  const { toast } = useShell()
  const [title, setTitle] = useState('')
  const [goalId, setGoalId] = useState<string | undefined>()
  const [repeat, setRepeat] = useState<Repeat | null>(null)

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={event => {
        event.preventDefault()
        if (!title.trim()) return
        if (repeat) {
          // a repetição começa no dia escolhido; a ocorrência de hoje entra sozinha na lista
          addRule({ title, goalId, repeat: { ...repeat, start: date } })
          toast(`Agendada: ${describe({ ...repeat, start: date }).toLocaleLowerCase('pt-BR')}`)
          onClose()
          return
        }
        const where = addTask({ title, goalId }, date, reserved)
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
      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] text-muted">Repetir</span>
        <RepeatPicker value={repeat} onChange={setRepeat} start={date} />
      </div>
      <Button type="submit" block disabled={!title.trim()}>
        {repeat ? 'Agendar' : 'Adicionar'}
      </Button>
    </form>
  )
}
