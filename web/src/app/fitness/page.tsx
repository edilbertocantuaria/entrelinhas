'use client'

import { Dumbbell, Plus, Scale, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useShell } from '@/components/app-shell'
import { EmptyState } from '@/components/common'
import { BuiltinModuleHeader } from '@/components/module-ui'
import { chartMargin, tick, tooltipStyle } from '@/components/goal-visuals'
import { Illustration } from '@/components/illustration'
import { Button } from '@/components/ui/button'
import { Chip, Field, ProgressBar, ScrollRow, Switch } from '@/components/ui/controls'
import { Sheet } from '@/components/ui/sheet'
import { kindBreakdown, kindOf, loadSeries, setText, weekStats, weightSeries, WORKOUT_KINDS, workoutMeta } from '@/domain/fitness'
import { longDay, minutesLabel, num, num1, parseNum, plural, shortDay } from '@/shared/format'
import { useStore } from '@/shared/store'
import { useClock } from '@/shared/time'
import type { Workout, WorkoutKind, WorkoutSet } from '@/domain/types'

const areaMar = 'var(--area-mar)'
const areaVerde = 'var(--area-verde)'

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="card flex flex-col-reverse p-3 text-center">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="text-[20px] leading-tight font-medium tabular-nums">{value}</dd>
    </div>
  )
}

export default function FitnessPage() {
  const { today } = useClock()
  const workouts = useStore(state => state.workouts)
  const weights = useStore(state => state.weights)
  const removeWorkout = useStore(state => state.removeWorkout)
  const removeWeight = useStore(state => state.removeWeight)
  const { toast } = useShell()

  const [form, setForm] = useState<'workout' | 'weight' | null>(null)
  const [detail, setDetail] = useState<Workout | null>(null)
  const [exercise, setExercise] = useState<string | null>(null)
  const [shown, setShown] = useState(6)

  const week = weekStats(workouts, today)
  const body = useMemo(() => weightSeries(weights), [weights])
  const loads = useMemo(() => loadSeries(workouts), [workouts])
  const breakdown = kindBreakdown(workouts, today)
  const history = useMemo(() => [...workouts].sort((a, b) => b.date.localeCompare(a.date)), [workouts])
  const load = loads.find(series => series.exercise === exercise) ?? loads[0]
  const lastWeight = body.at(-1)
  const maxCount = Math.max(1, ...breakdown.map(item => item.count))

  const empty = workouts.length === 0 && weights.length === 0

  return (
    <div className="flex min-h-full flex-col">
      <BuiltinModuleHeader kind="fitness" fallback="Fitness" />

      {empty ? (
        <EmptyState
          className="flex-1 justify-center"
          illustration="fitness-module"
          icon={Dumbbell}
          title="Registre o seu primeiro treino"
          description="Musculação, caminhada, dança ou o que fizer sentido para você."
          action={<Button onClick={() => setForm('workout')}>Registrar treino</Button>}
        />
      ) : (
        <div className="flex flex-col gap-4 px-5 pb-8">
          <div className="flex items-center gap-3">
            <p className="flex-1 text-[13px] text-muted">Treinos, peso e cargas num só lugar. Cada registro conta, no seu ritmo.</p>
            <Illustration name="fitness-module" height={72} decorative />
          </div>

          <dl className="grid grid-cols-3 gap-2">
            <Stat value={String(week.count)} label={plural(week.count, 'treino na semana', 'treinos na semana')} />
            <Stat value={week.minutes ? minutesLabel(week.minutes) : '0 min'} label="tempo na semana" />
            <Stat value={lastWeight ? `${num(lastWeight.kg, 1)} kg` : 'sem registro'} label="peso atual" />
          </dl>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setForm('workout')}>
              <Plus size={20} strokeWidth={1.75} aria-hidden />
              Registrar treino
            </Button>
            <Button variant="outline" onClick={() => setForm('weight')}>
              <Scale size={20} strokeWidth={1.75} aria-hidden />
              Peso
            </Button>
          </div>

          <section className="card p-4" aria-labelledby="fit-peso">
            <h2 id="fit-peso" className="text-[15px] font-medium">
              Peso
            </h2>
            {body.length < 2 ? (
              <p className="mt-2 text-[13px] text-muted">
                {body.length
                  ? `${num(body[0].kg, 1)} kg em ${shortDay(body[0].date)}. O gráfico aparece a partir da segunda medição.`
                  : 'Registre o peso para acompanhar a evolução.'}
              </p>
            ) : (
              <figure className="mt-2">
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={body} margin={chartMargin}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} minTickGap={28} />
                    <YAxis
                      tick={tick}
                      tickLine={false}
                      axisLine={false}
                      width={36}
                      domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]}
                    />
                    <Tooltip {...tooltipStyle} formatter={value => [`${num(Number(value), 1)} kg`, 'Peso']} />
                    <Line
                      type="monotone"
                      dataKey="kg"
                      stroke={areaVerde}
                      strokeWidth={2}
                      dot={{ r: 2.5, fill: areaVerde, strokeWidth: 0 }}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <figcaption className="mt-1 text-[12px] text-muted">
                  De {num(body[0].kg, 1)} kg em {shortDay(body[0].date)} para {num(body.at(-1)!.kg, 1)} kg em {shortDay(body.at(-1)!.date)}.
                </figcaption>
              </figure>
            )}
            {lastWeight && (
              <button
                type="button"
                className="mt-1 min-h-11 text-[13px] text-primary"
                onClick={() => {
                  const last = [...weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1)
                  if (!last) return
                  removeWeight(last.id)
                  toast('Última medição removida')
                }}
              >
                Remover a última medição
              </button>
            )}
          </section>

          <section className="card p-4" aria-labelledby="fit-carga">
            <h2 id="fit-carga" className="text-[15px] font-medium">
              Progressão de carga
            </h2>
            {!load ? (
              <p className="mt-2 text-[13px] text-muted">Quando um exercício tiver carga em dois treinos, a evolução aparece aqui.</p>
            ) : (
              <>
                <div className="-mx-4 mt-2">
                  <ScrollRow className="px-4 pb-1" label="Escolher exercício" fade="var(--surface)">
                    {loads.map(series => (
                      <Chip key={series.exercise} selected={series.exercise === load.exercise} onClick={() => setExercise(series.exercise)}>
                        {series.exercise}
                      </Chip>
                    ))}
                  </ScrollRow>
                </div>
                <figure className="mt-2">
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={load.points} margin={chartMargin}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} minTickGap={28} />
                      <YAxis
                        tick={tick}
                        tickLine={false}
                        axisLine={false}
                        width={36}
                        domain={[(min: number) => Math.floor(min - 5), (max: number) => Math.ceil(max + 5)]}
                      />
                      <Tooltip {...tooltipStyle} formatter={value => [`${num1(Number(value))} kg`, 'Carga']} />
                      <Line
                        type="stepAfter"
                        dataKey="weight"
                        stroke={areaMar}
                        strokeWidth={2}
                        dot={{ r: 2.5, fill: areaMar, strokeWidth: 0 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <figcaption className="mt-1 text-[12px] text-muted">
                    {load.exercise}: de {num1(load.points[0].weight)} kg para {num1(load.points.at(-1)!.weight)} kg em {load.points.length} treinos.
                  </figcaption>
                </figure>
              </>
            )}
          </section>

          <section className="card p-4" aria-labelledby="fit-tipos">
            <h2 id="fit-tipos" className="text-[15px] font-medium">
              Tipos de treino
            </h2>
            <p className="text-[12px] text-muted">Últimos 30 dias</p>
            {breakdown.length === 0 ? (
              <p className="mt-2 text-[13px] text-muted">Nenhum treino neste período.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-3">
                {breakdown.map(item => {
                  const kind = kindOf(item.kind)
                  return (
                    <li key={item.kind}>
                      <div className="mb-1.5 flex items-center gap-2 text-[14px]">
                        <kind.icon size={20} strokeWidth={1.75} aria-hidden className="text-muted" />
                        <span className="flex-1">{kind.label}</span>
                        <span className="text-[12px] text-muted tabular-nums">
                          {item.count} {plural(item.count, 'vez', 'vezes')}
                          {item.minutes ? ` · ${minutesLabel(item.minutes)}` : ''}
                        </span>
                      </div>
                      <ProgressBar value={item.count / maxCount} color={areaMar} label={`${kind.label}: ${item.count}`} />
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="fit-historico">
            <h2 id="fit-historico" className="mb-2 text-[15px] font-medium">
              Histórico
            </h2>
            {history.length === 0 ? (
              <p className="card p-4 text-[13px] text-muted">Os treinos registrados aparecem aqui.</p>
            ) : (
              <ul className="card divide-y-[0.5px] divide-line">
                {history.slice(0, shown).map(item => {
                  const kind = kindOf(item.kind)
                  return (
                    <li key={item.id}>
                      <button type="button" className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left" onClick={() => setDetail(item)}>
                        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-ink">
                          <kind.icon size={20} strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px]">{item.note || kind.label}</span>
                          <span className="block truncate text-[12px] text-muted">
                            {[item.note ? kind.label : '', workoutMeta(item)].filter(Boolean).join(' · ') || 'Presença registrada'}
                          </span>
                        </span>
                        <span className="shrink-0 text-[12px] text-muted">{shortDay(item.date)}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            {history.length > shown && (
              <Button variant="ghost" size="sm" className="mt-1" onClick={() => setShown(shown + 10)}>
                Ver mais
              </Button>
            )}
          </section>
        </div>
      )}

      <WorkoutForm open={form === 'workout'} onClose={() => setForm(null)} />
      <WeightForm open={form === 'weight'} onClose={() => setForm(null)} />

      <Sheet
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? detail.note || kindOf(detail.kind).label : ''}
        description={detail ? [longDay(detail.date), detail.note ? kindOf(detail.kind).label : '', workoutMeta(detail)].filter(Boolean).join(' · ') : undefined}
      >
        {detail && (
          <div className="flex flex-col gap-4">
            {detail.exercises?.length ? (
              <ul className="card divide-y-[0.5px] divide-line">
                {detail.exercises.map((set, index) => (
                  <li key={index} className="px-3 py-2.5 text-[14px]">
                    {setText(set)}
                  </li>
                ))}
              </ul>
            ) : null}
            {detail.logId && <p className="text-[12px] text-muted">Este treino também conta para uma meta. Ao excluir, o registro da meta sai junto.</p>}
            <Button
              variant="outline"
              onClick={() => {
                removeWorkout(detail.id)
                setDetail(null)
                toast('Treino excluído')
              }}
            >
              <Trash2 size={18} strokeWidth={1.75} aria-hidden />
              Excluir treino
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}

// ---------- Registrar treino ----------

type Row = { exercise: string; sets: string; reps: string; weight: string }
const emptyRow = (): Row => ({ exercise: '', sets: '', reps: '', weight: '' })
const toRow = (set: WorkoutSet): Row => ({
  exercise: set.exercise,
  sets: set.sets ? String(set.sets) : '',
  reps: set.reps ? String(set.reps) : '',
  weight: set.weight ? num1(set.weight) : '',
})
const positive = (text: string) => {
  const value = parseNum(text)
  return Number.isFinite(value) && value > 0 ? value : undefined
}

function WorkoutForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { today } = useClock()
  const { toast } = useShell()
  const workouts = useStore(state => state.workouts)
  const goals = useStore(state => state.goals)
  const addWorkout = useStore(state => state.addWorkout)

  const [kind, setKind] = useState<WorkoutKind>('musculacao')
  const [date, setDate] = useState('')
  const [minutes, setMinutes] = useState('')
  const [distance, setDistance] = useState('')
  const [rows, setRows] = useState<Row[]>([emptyRow()])
  const [note, setNote] = useState('')
  const [goalId, setGoalId] = useState<string | undefined>()

  const def = kindOf(kind)
  const frequencyGoals = goals.filter(goal => goal.metric.type === 'frequency')
  const last = [...workouts].sort((a, b) => b.date.localeCompare(a.date)).find(item => item.kind === kind && item.exercises?.length)
  const day = date || today

  const setRow = (index: number, patch: Partial<Row>) => setRows(previous => previous.map((row, i) => (i === index ? { ...row, ...patch } : row)))

  const close = () => {
    onClose()
    setDate('')
    setMinutes('')
    setDistance('')
    setRows([emptyRow()])
    setNote('')
  }

  const save = () => {
    const exercises = def.exercises
      ? rows
          .filter(row => row.exercise.trim())
          .map(row => ({ exercise: row.exercise.trim(), sets: positive(row.sets), reps: positive(row.reps), weight: positive(row.weight) }))
      : []
    addWorkout(
      {
        date: day > today ? today : day,
        kind,
        minutes: positive(minutes),
        distanceKm: def.distance ? positive(distance) : undefined,
        exercises: exercises.length ? exercises : undefined,
        note: note.trim() || undefined,
      },
      goalId,
    )
    toast(goalId ? 'Treino registrado e contado na meta' : 'Treino registrado')
    close()
  }

  return (
    <Sheet open={open} onClose={close} title="Registrar treino">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de treino">
          {WORKOUT_KINDS.map(item => (
            <Chip key={item.value} selected={item.value === kind} onClick={() => setKind(item.value)} className="pl-3">
              <item.icon size={16} strokeWidth={1.75} aria-hidden />
              {item.label}
            </Chip>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Dia" htmlFor="treino-dia">
            <input id="treino-dia" type="date" className="field" max={today} value={day} onChange={event => setDate(event.target.value)} />
          </Field>
          <Field label="Duração (min)" htmlFor="treino-min">
            <input id="treino-min" className="field" inputMode="numeric" placeholder="45" value={minutes} onChange={event => setMinutes(event.target.value)} />
          </Field>
        </div>

        {def.distance && (
          <Field label="Distância (km)" htmlFor="treino-km">
            <input
              id="treino-km"
              className="field"
              inputMode="decimal"
              placeholder="3,5"
              value={distance}
              onChange={event => setDistance(event.target.value)}
            />
          </Field>
        )}

        {def.exercises && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <p className="flex-1 text-[13px] text-muted">Exercícios</p>
              {last?.exercises && (
                <Button variant="ghost" size="sm" onClick={() => setRows(last.exercises!.map(toRow))}>
                  Repetir o último treino
                </Button>
              )}
            </div>
            {rows.map((row, index) => (
              <div key={index} className="card flex flex-col gap-2 p-2.5">
                <div className="flex gap-1">
                  <input
                    className="field min-w-0 flex-1"
                    aria-label={`Exercício ${index + 1}`}
                    placeholder="Exercício"
                    value={row.exercise}
                    onChange={event => setRow(index, { exercise: event.target.value })}
                  />
                  {rows.length > 1 && (
                    <button
                      type="button"
                      className="icon-btn h-12"
                      aria-label={`Remover exercício ${index + 1}`}
                      onClick={() => setRows(rows.filter((_, i) => i !== index))}
                    >
                      <X size={18} strokeWidth={1.75} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    className="field px-2 text-center"
                    inputMode="numeric"
                    aria-label={`Séries do exercício ${index + 1}`}
                    placeholder="Séries"
                    value={row.sets}
                    onChange={event => setRow(index, { sets: event.target.value })}
                  />
                  <input
                    className="field px-2 text-center"
                    inputMode="numeric"
                    aria-label={`Repetições do exercício ${index + 1}`}
                    placeholder="Reps"
                    value={row.reps}
                    onChange={event => setRow(index, { reps: event.target.value })}
                  />
                  <input
                    className="field px-2 text-center"
                    inputMode="decimal"
                    aria-label={`Carga em kg do exercício ${index + 1}`}
                    placeholder="Carga kg"
                    value={row.weight}
                    onChange={event => setRow(index, { weight: event.target.value })}
                  />
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" className="self-start" onClick={() => setRows([...rows, emptyRow()])}>
              <Plus size={18} strokeWidth={1.75} aria-hidden />
              Adicionar exercício
            </Button>
          </div>
        )}

        <Field label="Observação (opcional)" htmlFor="treino-nota">
          <input id="treino-nota" className="field" placeholder="Como foi, onde, com quem" value={note} onChange={event => setNote(event.target.value)} />
        </Field>

        {frequencyGoals.length > 0 && (
          <div>
            <p className="mb-1.5 text-[13px] text-muted">Contar para uma meta</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Contar para uma meta">
              <Chip selected={!goalId} onClick={() => setGoalId(undefined)}>
                Não contar
              </Chip>
              {frequencyGoals.map(goal => (
                <Chip key={goal.id} selected={goalId === goal.id} onClick={() => setGoalId(goal.id)}>
                  {goal.title}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <Button block onClick={save}>
          Registrar
        </Button>
      </div>
    </Sheet>
  )
}

// ---------- Registrar peso ----------

function WeightForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { today } = useClock()
  const { toast } = useShell()
  const weights = useStore(state => state.weights)
  const goal = useStore(state => state.goals.find(item => item.metric.type === 'value' && item.metric.unit.trim().toLowerCase() === 'kg'))
  const addWeight = useStore(state => state.addWeight)

  const [text, setText] = useState('')
  const [date, setDate] = useState('')
  const [link, setLink] = useState(true)
  const [error, setError] = useState('')

  const last = [...weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1)
  const day = date || today

  const close = () => {
    onClose()
    setText('')
    setDate('')
    setError('')
  }

  const save = () => {
    const kg = parseNum(text)
    if (!Number.isFinite(kg) || kg < 20 || kg > 400) {
      setError('Informe o peso em kg, como 80,4.')
      return
    }
    addWeight(day > today ? today : day, Math.round(kg * 10) / 10, goal && link ? goal.id : undefined)
    toast('Peso registrado')
    close()
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Registrar peso"
      description={last ? `Última medição: ${num(last.kg, 1)} kg em ${shortDay(last.date)}.` : undefined}
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Peso (kg)" htmlFor="peso-kg">
            <input
              id="peso-kg"
              className="field"
              inputMode="decimal"
              placeholder={last ? num(last.kg, 1) : '80,0'}
              value={text}
              onChange={event => setText(event.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? 'peso-erro' : undefined}
            />
          </Field>
          <Field label="Dia" htmlFor="peso-dia">
            <input id="peso-dia" type="date" className="field" max={today} value={day} onChange={event => setDate(event.target.value)} />
          </Field>
        </div>
        {error && (
          <p id="peso-erro" role="alert" className="-mt-2 text-[12px]">
            {error}
          </p>
        )}
        {goal && (
          <div className="flex min-h-11 items-center gap-3">
            <span className="flex-1 text-[14px]">Atualizar a meta “{goal.title}”</span>
            <Switch label={`Atualizar a meta ${goal.title}`} checked={link} onChange={setLink} />
          </div>
        )}
        <Button block onClick={save}>
          Registrar
        </Button>
      </div>
    </Sheet>
  )
}
