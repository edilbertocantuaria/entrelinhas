'use client'

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { areaColor } from '@/lib/areas'
import { brl, fmt, minutesLabel, num, num1 } from '@/lib/format'
import { amount, cumulativeSeries, heatmap, valueSeries, weeklyCounts, type Progress } from '@/lib/goals'
import { useStore } from '@/lib/store'
import type { Goal, LogEntry } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Illustration, type IllustrationName } from './illustration'
import { SCENES } from './illustrations/scenes'
import { ProgressBar } from './ui/controls'

export const METRIC_ART: Record<Goal['metric']['type'], IllustrationName> = {
  frequency: 'metric-frequency',
  sum: 'metric-sum',
  value: 'metric-value',
  milestones: 'metric-milestones',
  days: 'metric-days',
}

/** Ícones que a pessoa pode escolher para uma meta. */
export const GOAL_ART: IllustrationName[] = [
  'metric-frequency',
  'metric-sum',
  'metric-value',
  'metric-milestones',
  'metric-days',
  'goal-target',
  'goal-heart',
  'goal-run',
  'goal-plant',
  'goal-leaf',
  'goal-trophy',
  'goal-mountain',
  'goal-compass',
  'goal-notebook',
  'goal-puzzle',
  'goal-coffee',
  'goal-sun',
  'goal-moon',
  'goal-cloud',
  'goal-shield',
]

const isArt = (name: string | undefined): name is IllustrationName => !!name && (GOAL_ART as string[]).includes(name)

/** Ícone da meta: o escolhido ou, sem escolha, o do tipo de medida. */
export const goalArt = (goal: Pick<Goal, 'art' | 'metric'>): IllustrationName => (isArt(goal.art) ? goal.art : METRIC_ART[goal.metric.type])

/** Grade de ícones para escolher. `value` nulo = automático (segue o tipo de medida). */
export function ArtPicker({ value, auto, onChange }: { value: IllustrationName | null; auto?: IllustrationName; onChange: (value: IllustrationName | null) => void }) {
  const options: (IllustrationName | null)[] = auto ? [null, ...GOAL_ART.filter(name => name !== auto)] : GOAL_ART
  return (
    <div role="radiogroup" aria-label="Ícone da meta" className="grid grid-cols-4 gap-2">
      {options.map(name => {
        const art = name ?? auto!
        const selected = name === value
        return (
          <button
            key={name ?? 'auto'}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={name ? SCENES[name].label : `Automático: ${SCENES[art].label}`}
            onClick={() => onChange(name)}
            className={cn('relative grid aspect-square place-items-center rounded-card border-[0.5px] bg-surface transition-colors', selected ? 'border-primary bg-primary-soft ring-1 ring-primary' : 'border-line hover:bg-primary-soft')}
          >
            <Illustration name={art} height={56} decorative always />
            {!name && <span className="absolute inset-x-0 bottom-1 text-center text-[11px] leading-none text-muted">auto</span>}
          </button>
        )
      })}
    </div>
  )
}

/** Indicador de progresso adequado à métrica: bolinhas, segmentos ou barra. */
export function GoalProgress({ goal, progress, color }: { goal: Goal; progress: Progress; color?: string }) {
  const hidePercent = useStore(state => state.settings.hidePercent)
  const m = goal.metric
  const fill = color ?? 'var(--primary)'

  let indicator
  if (m.type === 'frequency') {
    indicator = (
      <div className="flex gap-1.5" aria-hidden>
        {Array.from({ length: m.max }, (_, index) => (
          <span key={index} className={cn('h-2.5 flex-1 rounded-full', index >= m.min && 'max-w-6')} style={{ background: index < progress.current ? fill : 'var(--primary-soft)' }} />
        ))}
      </div>
    )
  } else if (m.type === 'milestones') {
    indicator = (
      <div className="flex gap-1" aria-hidden>
        {m.items.map((item, index) => (
          <span key={item.id} className="h-1.5 flex-1 rounded-full" style={{ background: index < progress.current ? fill : 'var(--primary-soft)' }} />
        ))}
      </div>
    )
  } else {
    indicator = <ProgressBar value={progress.ratio} color={fill} label={goal.title} />
  }

  return (
    <div>
      {indicator}
      <p className="mt-1.5 flex justify-between gap-2 text-[12px] text-muted">
        <span>{progress.label}</span>
        {!hidePercent && m.type !== 'frequency' && <span className="tabular-nums">{Math.round(progress.ratio * 100)}%</span>}
      </p>
    </div>
  )
}

export const tick = { fontSize: 12, fill: 'var(--text-muted)' }
export const tooltipStyle = {
  contentStyle: { background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text)', boxShadow: 'none' },
  labelStyle: { color: 'var(--text-muted)' },
  itemStyle: { color: 'var(--text)' },
  cursor: { stroke: 'var(--border)' },
}
export const chartMargin ={ top: 12, right: 12, left: 0, bottom: 0 }

/** Gráfico de evolução conforme a métrica, na cor da área da meta. */
export function GoalChart({ goal, logs, today, height = 180 }: { goal: Goal; logs: LogEntry[]; today: string; height?: number }) {
  const area = useStore(state => state.areas.find(item => item.id === goal.areaId))
  const color = areaColor(area?.color)
  const m = goal.metric

  if (m.type === 'sum') {
    const data = cumulativeSeries(goal, logs)
    const last = data.at(-1)?.total ?? 0
    return (
      <figure>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={chartMargin}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} minTickGap={28} />
            <YAxis tick={tick} tickLine={false} axisLine={false} width={44} domain={[0, Math.max(m.target, last)]} tickFormatter={value => (m.currency && value >= 1000 ? `${num1(value / 1000)} mil` : num1(value))} />
            <Tooltip {...tooltipStyle} formatter={value => [amount(m, Number(value)), 'Acumulado']} />
            <ReferenceLine y={m.target} stroke="var(--text-muted)" strokeDasharray="4 4" />
            <Area type="monotone" dataKey="total" stroke={color} strokeWidth={2} fill={color} fillOpacity={0.16} dot={{ r: 3, fill: color, strokeWidth: 0 }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
        <figcaption className="mt-1 text-[12px] text-muted">
          Acumulado: {amount(m, last)}. A linha tracejada é o alvo de {amount(m, m.target)}.
        </figcaption>
      </figure>
    )
  }

  if (m.type === 'value') {
    const data = valueSeries(goal, logs)
    const values = data.map(point => point.value).concat(m.from, m.to)
    return (
      <figure>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={chartMargin}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} minTickGap={28} />
            <YAxis tick={tick} tickLine={false} axisLine={false} width={36} domain={[Math.floor(Math.min(...values) - 1), Math.ceil(Math.max(...values) + 1)]} />
            <Tooltip {...tooltipStyle} formatter={value => [`${num(Number(value), 1)} ${m.unit}`, 'Medição']} />
            <ReferenceLine y={m.to} stroke="var(--text-muted)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 2.5, fill: color, strokeWidth: 0 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        <figcaption className="mt-1 text-[12px] text-muted">
          De {num(m.from, 1)} para {num(data.at(-1)?.value ?? m.from, 1)} {m.unit}. A linha tracejada é o alvo de {num(m.to, 1)} {m.unit}.
        </figcaption>
      </figure>
    )
  }

  if (m.type === 'frequency') {
    const data = weeklyCounts(goal, logs, today)
    return (
      <figure>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={chartMargin}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis dataKey="week" tick={tick} tickLine={false} axisLine={false} minTickGap={12} />
            <YAxis tick={tick} tickLine={false} axisLine={false} width={24} allowDecimals={false} domain={[0, Math.max(m.max, ...data.map(point => point.count))]} />
            <Tooltip {...tooltipStyle} cursor={{ fill: 'var(--primary-soft)' }} formatter={value => [`${value} ${m.noun}`, 'Semana']} labelFormatter={label => `Semana de ${label}`} />
            <ReferenceLine y={m.min} stroke="var(--text-muted)" strokeDasharray="4 4" />
            <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
        <figcaption className="mt-1 text-[12px] text-muted">
          {m.noun.charAt(0).toUpperCase() + m.noun.slice(1)} por semana. A linha tracejada é o combinado de {m.min}.
        </figcaption>
      </figure>
    )
  }

  if (m.type === 'days') {
    const weeks = heatmap(goal, logs, today)
    const level = (minutes: number) => (minutes <= 0 ? 0 : minutes < 25 ? 40 : minutes < 40 ? 70 : 100)
    const done = weeks.flat().filter(day => day.minutes > 0).length
    return (
      <figure>
        <div className="flex gap-2">
          <div className="flex flex-col justify-between py-0.5 text-[12px] leading-none text-muted" aria-hidden>
            <span>seg</span>
            <span>qui</span>
            <span>dom</span>
          </div>
          <div className="grid flex-1 grid-flow-col grid-rows-7 gap-1" role="img" aria-label={`${done} dias com registro nas últimas ${weeks.length} semanas`}>
            {weeks.flat().map(day => (
              <span
                key={day.date}
                title={`${fmt(day.date, "d 'de' MMM")}${day.minutes ? `: ${minutesLabel(day.minutes)}` : ''}`}
                className={cn('aspect-square rounded-[4px]', day.future && 'opacity-0')}
                style={{ background: day.minutes ? `color-mix(in srgb, ${color} ${level(day.minutes)}%, var(--surface))` : 'var(--primary-soft)' }}
              />
            ))}
          </div>
        </div>
        <figcaption className="mt-2 flex items-center gap-1.5 text-[12px] text-muted">
          Últimas {weeks.length} semanas
          <span className="flex-1" />
          menos
          {[40, 70, 100].map(value => (
            <span key={value} aria-hidden className="size-3 rounded-[3px]" style={{ background: `color-mix(in srgb, ${color} ${value}%, var(--surface))` }} />
          ))}
          mais
        </figcaption>
      </figure>
    )
  }

  return null
}

/** Linha ou pontos de humor (1 a 5). */
export function MoodChart({ data, height = 120 }: { data: { label: string; mood: number }[]; height?: number }) {
  if (!data.length) return <p className="text-[13px] text-muted">Sem registros de humor neste período.</p>
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={chartMargin}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} minTickGap={20} />
        <YAxis tick={tick} tickLine={false} axisLine={false} width={20} domain={[1, 5]} ticks={[1, 3, 5]} />
        <Tooltip {...tooltipStyle} formatter={value => [`${num1(Number(value))} de 5`, 'Humor']} />
        <Line type="monotone" dataKey="mood" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3.5, fill: 'var(--primary)', strokeWidth: 0 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function logText(goal: Goal, log: LogEntry) {
  const m = goal.metric
  if (m.type === 'sum') return m.currency ? brl(log.value ?? 0) : `${num1(log.value ?? 0)} ${m.unit}`
  if (m.type === 'value') return `${num(log.value ?? 0, 1)} ${m.unit}`
  if (m.type === 'days') return log.value ? minutesLabel(log.value) : 'Dia feito'
  if (m.type === 'milestones') return log.note ?? 'Etapa concluída'
  return log.note ?? 'Presença registrada'
}

export function workoutText(log: LogEntry) {
  return (log.workout ?? []).map(set => {
    const volume = set.sets && set.reps ? `${set.sets}x${set.reps}` : set.sets ? `${set.sets} ${set.sets === 1 ? 'série' : 'séries'}` : ''
    return [set.exercise, volume, set.weight ? `${num1(set.weight)} kg` : ''].filter(Boolean).join(' · ')
  })
}
