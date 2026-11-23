'use client'

import { Minus, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { brl, fmt, minutesLabel, num, parseNum } from '@/shared/format'
import { logsOf, nextMilestone, progressOf, tracksTime } from '@/domain/goals'
import { useStore } from '@/shared/store'
import { useClock } from '@/shared/time'
import { guessKind, isFitnessGoal, kindOf, WORKOUT_KINDS } from '@/domain/fitness'
import type { Goal, LogEntry, Task, WorkoutKind, WorkoutSet } from '@/domain/types'
import { useShell } from './app-shell'
import { Button } from './ui/button'
import { Chip, Field } from './ui/controls'
import { Sheet } from './ui/sheet'

interface Props {
  goalId: string | undefined
  /** quando o registro vem de uma tarefa, ela é concluída junto */
  task?: Task
  /** dia do registro (padrão: hoje). Num dia que passou, o registro fica naquele dia. */
  date?: string
  open: boolean
  onClose: () => void
  onLogged?: () => void
}

type Row = { exercise: string; sets: string; reps: string; weight: string }
const emptyRow = (): Row => ({ exercise: '', sets: '', reps: '', weight: '' })
const toRow = (set: WorkoutSet): Row => ({
  exercise: set.exercise,
  sets: set.sets ? String(set.sets) : '',
  reps: set.reps ? String(set.reps) : '',
  weight: set.weight ? String(set.weight).replace('.', ',') : '',
})

const DESCRIPTION = {
  frequency: 'Os detalhes são opcionais. Dá para registrar só que aconteceu.',
  sum: 'Quanto entrou desta vez?',
  value: 'Qual é a medição de hoje?',
  milestones: 'Marque a etapa como concluída.',
  days: 'Quanto tempo você dedicou?',
}

/** Folha de registro que se adapta à métrica da meta. Registro comum em 2 toques. */
export function LogSheet({ goalId, task, date, open, onClose, onLogged }: Props) {
  const goal = useStore(state => state.goals.find(item => item.id === goalId))
  const { today } = useClock()
  const past = date && date < today
  return (
    <Sheet
      open={open && !!goal}
      onClose={onClose}
      title={task?.title ?? goal?.title ?? ''}
      description={
        goal
          ? `${past ? `Registro de ${fmt(date, "EEEE, d 'de' MMM")}. ` : ''}${goal.metric.type === 'frequency' && tracksTime(goal.metric) ? DESCRIPTION.days : DESCRIPTION[goal.metric.type]}`
          : undefined
      }
    >
      {goal && <LogForm key={`${goal.id}-${task?.id ?? ''}-${date ?? ''}`} goal={goal} task={task} date={date} onClose={onClose} onLogged={onLogged} />}
    </Sheet>
  )
}

function LogForm({ goal, task, date, onClose, onLogged }: { goal: Goal; task?: Task; date?: string; onClose: () => void; onLogged?: () => void }) {
  const logs = useStore(state => state.logs)
  const areas = useStore(state => state.areas)
  const completeTask = useStore(state => state.completeTask)
  const addLog = useStore(state => state.addLog)
  const { today: now } = useClock()
  // o dia do registro: hoje, ou o dia que passou de onde a tarefa foi marcada
  const today = date && date < now ? date : now
  const { toast } = useShell()
  const m = goal.metric
  const mine = logsOf(logs, goal.id)
  const current = progressOf(goal, logs, today).current
  const fitness = isFitnessGoal(goal, logs, areas)

  const [kind, setKind] = useState<WorkoutKind | undefined>(() => (fitness ? guessKind(goal, logs) : undefined))
  const kindDef = kind ? kindOf(kind) : undefined
  const lastWorkout = [...mine].reverse().find(log => log.workout?.length && (log.activity?.kind ?? 'musculacao') === kind)
  const [activityMinutes, setActivityMinutes] = useState('')
  const [distance, setDistance] = useState('')

  const [rows, setRows] = useState<Row[]>([emptyRow()])
  const [amountText, setAmountText] = useState('')
  const [measureText, setMeasureText] = useState(m.type === 'value' ? num(current, 1) : '')
  const measure = parseNum(measureText)
  const nudge = (delta: number) => setMeasureText(num(Math.round(((Number.isNaN(measure) ? current : measure) + delta) * 10) / 10, 1))
  // tempo em horas e minutos: os atalhos preenchem, e dá para digitar qualquer valor
  // metas de dias/tempo e de frequência em horas registram tempo
  const timed = tracksTime(m)
  // dias e horas: começa no mínimo de horas por dia/sessão combinado
  const initialMinutes =
    m.type === 'days'
      ? (m.sessionMinutes ?? 30)
      : m.type === 'frequency' && m.hours && m.hours.rule !== 'total'
        ? Math.round(m.hours.min * 60)
        : timed
          ? 60
          : 30
  const [hoursText, setHoursText] = useState(String(Math.floor(initialMinutes / 60)))
  const [minsText, setMinsText] = useState(String(initialMinutes % 60))
  const minutes = (Number.parseInt(hoursText, 10) || 0) * 60 + (Number.parseInt(minsText, 10) || 0)
  const setMinutes = (total: number) => {
    setHoursText(String(Math.floor(total / 60)))
    setMinsText(String(total % 60))
  }
  const [note, setNote] = useState('')

  const milestone = m.type === 'milestones' ? (m.items.find(item => item.id === task?.milestoneId) ?? nextMilestone(goal, logs)) : undefined
  const amountValue = parseNum(amountText)
  const invalid =
    (m.type === 'sum' && !(amountValue > 0)) ||
    (m.type === 'milestones' && !milestone) ||
    (timed && minutes <= 0) ||
    (m.type === 'value' && Number.isNaN(measure))

  const submit = () => {
    if (invalid) return
    const data: Partial<LogEntry> = { note: note.trim() || undefined }
    if (m.type === 'frequency' && fitness) {
      const workout = kindDef?.exercises
        ? rows
            .filter(row => row.exercise.trim())
            .map(row => ({
              exercise: row.exercise.trim(),
              sets: parseNum(row.sets) || undefined,
              reps: parseNum(row.reps) || undefined,
              weight: parseNum(row.weight) || undefined,
            }))
        : []
      if (workout.length) data.workout = workout
      // em horas, a duração é o próprio tempo registrado
      const mins = timed ? minutes : Math.round(parseNum(activityMinutes))
      const km = parseNum(distance)
      // sem tipo escolhido, vale como "outro": o treino ainda aparece no módulo Fitness
      data.activity = { kind: kind ?? 'outro', minutes: mins > 0 ? mins : undefined, distanceKm: kindDef?.distance && km > 0 ? km : undefined }
      if (timed) data.value = minutes
    } else if (m.type === 'frequency' && timed) data.value = minutes
    else if (m.type === 'sum') data.value = amountValue
    else if (m.type === 'value') data.value = Math.round(measure * 10) / 10
    else if (m.type === 'days') data.value = minutes
    else if (milestone) {
      data.milestoneId = milestone.id
      data.note = data.note ?? milestone.title
    }

    if (task) completeTask(task.id, data, today)
    else addLog({ ...data, goalId: goal.id, date: today })
    toast('Registrado')
    onLogged?.()
    onClose()
  }

  const updateRow = (index: number, patch: Partial<Row>) => setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={event => {
        event.preventDefault()
        submit()
      }}
    >
      {m.type === 'frequency' && mine.some(log => log.date === today) && (
        <p className="rounded-ctl bg-primary-soft p-3 text-[12px] leading-relaxed">
          {today === now ? 'Você já registrou hoje.' : 'Já tem registro neste dia.'}{' '}
          {timed ? 'O tempo deste registro soma com o que já está lá.' : 'Este entra como mais uma atividade do dia: a meta conta 1 dia, não 2.'}
        </p>
      )}

      {m.type === 'frequency' && fitness && (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] text-muted">Tipo de atividade</span>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo de atividade">
              {WORKOUT_KINDS.map(item => (
                <Chip key={item.value} selected={kind === item.value} onClick={() => setKind(kind === item.value ? undefined : item.value)} className="pl-3">
                  <item.icon size={16} strokeWidth={1.75} aria-hidden />
                  {item.label}
                </Chip>
              ))}
            </div>
          </div>
          <div className={kindDef?.distance && !timed ? 'grid grid-cols-2 gap-3' : ''}>
            {!timed && (
              <Field label="Duração (min, opcional)" htmlFor="log-minutos">
                <input
                  id="log-minutos"
                  className="field"
                  inputMode="numeric"
                  placeholder="45"
                  value={activityMinutes}
                  onChange={event => setActivityMinutes(event.target.value)}
                />
              </Field>
            )}
            {kindDef?.distance && (
              <Field label="Distância (km)" htmlFor="log-km">
                <input
                  id="log-km"
                  className="field"
                  inputMode="decimal"
                  placeholder="3,5"
                  value={distance}
                  onChange={event => setDistance(event.target.value)}
                />
              </Field>
            )}
          </div>
        </>
      )}

      {m.type === 'frequency' && fitness && kindDef?.exercises && (
        <>
          {lastWorkout?.workout && (
            <Button variant="outline" size="sm" className="self-start" onClick={() => setRows(lastWorkout.workout!.map(toRow))}>
              <RotateCcw size={16} strokeWidth={1.75} aria-hidden />
              Repetir o último treino
            </Button>
          )}
          {rows.map((row, index) => (
            <fieldset key={index} className="card flex flex-col gap-2 p-3">
              <legend className="sr-only">Exercício {index + 1}</legend>
              <div className="flex gap-1">
                <input
                  className="field"
                  aria-label={`Exercício ${index + 1}`}
                  placeholder="Exercício (ex.: agachamento)"
                  value={row.exercise}
                  onChange={event => updateRow(index, { exercise: event.target.value })}
                />
                {rows.length > 1 && (
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Remover exercício ${index + 1}`}
                    onClick={() => setRows(rows.filter((_, i) => i !== index))}
                  >
                    <Trash2 size={18} strokeWidth={1.75} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['sets', 'Séries'],
                    ['reps', 'Repetições'],
                    ['weight', 'Carga (kg)'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex flex-col gap-1 text-[12px] text-muted">
                    {label}
                    <input
                      className="field text-center"
                      inputMode="decimal"
                      value={row[key]}
                      onChange={event => updateRow(index, { [key]: event.target.value })}
                    />
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <Button variant="ghost" size="sm" className="self-start" onClick={() => setRows([...rows, emptyRow()])}>
            <Plus size={16} strokeWidth={1.75} aria-hidden />
            Adicionar exercício
          </Button>
        </>
      )}

      {m.type === 'sum' && (
        <>
          <Field label={m.currency ? 'Valor' : `Quantidade (${m.unit})`} htmlFor="log-amount">
            <div className="relative">
              {m.currency && <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">R$</span>}
              <input
                id="log-amount"
                className="field h-14 text-[20px]"
                style={m.currency ? { paddingLeft: 44 } : undefined}
                inputMode="decimal"
                autoFocus
                placeholder="0,00"
                value={amountText}
                onChange={event => setAmountText(event.target.value)}
              />
            </div>
          </Field>
          <div className="flex flex-wrap gap-2">
            {(m.currency ? [100, 250, 500] : [1, 5, 10]).map(value => (
              <Chip key={value} selected={amountValue === value} onClick={() => setAmountText(num(value, m.currency ? 2 : 0))}>
                {m.currency ? brl(value) : `${value} ${m.unit}`}
              </Chip>
            ))}
          </div>
        </>
      )}

      {m.type === 'value' && (
        <div className="card flex items-center justify-between p-3">
          <button type="button" className="icon-btn border-[0.5px] border-line" aria-label="Diminuir 0,1" onClick={() => nudge(-0.1)}>
            <Minus size={20} strokeWidth={1.75} />
          </button>
          <label className="flex items-baseline gap-1.5">
            <span className="sr-only">Medição em {m.unit}</span>
            <input
              className="w-24 bg-transparent text-center text-[28px] font-medium tabular-nums"
              inputMode="decimal"
              value={measureText}
              onChange={event => setMeasureText(event.target.value)}
            />
            <span className="text-muted">{m.unit}</span>
          </label>
          <button type="button" className="icon-btn border-[0.5px] border-line" aria-label="Aumentar 0,1" onClick={() => nudge(0.1)}>
            <Plus size={20} strokeWidth={1.75} />
          </button>
        </div>
      )}

      {timed && (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Tempos rápidos">
            {[...new Set([15, 30, 45, 60, 90, 120, 180, ...(m.type === 'days' && m.sessionMinutes ? [m.sessionMinutes] : [])])]
              .sort((a, b) => a - b)
              .map(value => (
                <Chip key={value} selected={minutes === value} onClick={() => setMinutes(value)}>
                  {minutesLabel(value)}
                </Chip>
              ))}
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-[13px] text-muted">Ou digite o tempo</legend>
            <div className="flex items-center gap-2">
              <label className="flex flex-1 items-center gap-2">
                <input
                  className="field text-center"
                  inputMode="numeric"
                  aria-label="Horas"
                  value={hoursText}
                  onChange={event => setHoursText(event.target.value.replace(/\D/g, '').slice(0, 2))}
                />
                <span className="text-[14px] text-muted">h</span>
              </label>
              <label className="flex flex-1 items-center gap-2">
                <input
                  className="field text-center"
                  inputMode="numeric"
                  aria-label="Minutos"
                  value={minsText}
                  onChange={event => setMinsText(event.target.value.replace(/\D/g, '').slice(0, 3))}
                />
                <span className="text-[14px] text-muted">min</span>
              </label>
            </div>
            <p className="text-[12px] text-muted" aria-live="polite">
              {minutes > 0 ? `Vai registrar ${minutesLabel(minutes)}.` : 'Informe quanto tempo você dedicou.'}
            </p>
          </fieldset>
        </>
      )}

      {m.type === 'milestones' &&
        (milestone ? (
          <p className="card p-4">
            <span className="block text-[12px] text-muted">Etapa</span>
            {milestone.title}
          </p>
        ) : (
          <p className="text-muted">Todas as etapas desta meta já estão concluídas.</p>
        ))}

      {m.type !== 'milestones' && (
        <Field label="Observação (opcional)" htmlFor="log-note">
          <input id="log-note" className="field" value={note} onChange={event => setNote(event.target.value)} />
        </Field>
      )}

      <Button type="submit" block disabled={invalid}>
        {m.type === 'milestones' ? 'Concluir etapa' : 'Registrar'}
      </Button>
    </form>
  )
}
