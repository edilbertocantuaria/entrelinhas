'use client'

import { Pencil, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Missing, TopBar, useShell } from '@/components/app-shell'
import { AreaIcon, BackButton, GoalChip } from '@/components/common'
import { chartMargin, tick, tooltipStyle } from '@/components/goal-visuals'
import { Button } from '@/components/ui/button'
import { Chip, Field, ProgressBar, Switch } from '@/components/ui/controls'
import { Sheet } from '@/components/ui/sheet'
import { areaColor } from '@/domain/areas'
import { longDay, num1, parseNum, plural, shortDay } from '@/shared/format'
import {
  aggregate,
  aggregateText,
  chartFields,
  checkStats,
  choiceBreakdown,
  entrySummary,
  entryTitle,
  isFilled,
  recentEntries,
  textNotes,
  valueText,
  weekEntries,
  weeklyCount,
  weeklyField,
} from '@/domain/modules'
import { useStore } from '@/shared/store'
import { useClock } from '@/shared/time'
import type { AppModule, FieldValue, ModuleEntry, ModuleField } from '@/domain/types'
import { cn } from '@/shared/utils'

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="card flex flex-col-reverse p-3 text-center">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="text-[18px] leading-tight font-medium tabular-nums">{value}</dd>
    </div>
  )
}

export default function CustomModulePage() {
  const { id } = useParams<{ id: string }>()
  const mod = useStore(state => state.modules.find(item => item.id === id && item.kind === 'custom'))
  if (!mod) return <Missing title="Módulo não encontrado" description="Ele pode ter sido excluído." href="/modulos" action="Ver módulos" />
  return <ModuleView mod={mod} />
}

function ModuleView({ mod }: { mod: AppModule }) {
  const { today } = useClock()
  const { toast } = useShell()
  const all = useStore(state => state.moduleEntries)
  const removeEntry = useStore(state => state.removeModuleEntry)
  const restoreModule = useStore(state => state.restoreModule)
  const entries = useMemo(() => all.filter(entry => entry.moduleId === mod.id), [all, mod.id])
  const color = areaColor(mod.color)

  const [form, setForm] = useState(false)
  const [detail, setDetail] = useState<ModuleEntry | null>(null)
  const [chartId, setChartId] = useState<string | null>(null)
  const [shown, setShown] = useState(6)
  const [notesShown, setNotesShown] = useState(4)

  const week = weekEntries(entries, today)
  const recent = recentEntries(entries, today)
  const charts = chartFields(mod)
  const chart = charts.find(field => field.id === chartId) ?? charts[0]
  const series = chart ? weeklyField(chart, entries, today) : weeklyCount(entries, today)
  const choices = mod.fields.filter(field => field.type === 'choice')
  const checks = mod.fields.filter(field => field.type === 'check')
  const notes = textNotes(mod, entries)
  const history = [...entries].sort((a, b) => b.date.localeCompare(a.date))
  const sumField = mod.fields.find(field => field.type === 'number' || field.type === 'duration')
  const scaleField = mod.fields.find(field => field.type === 'scale')

  const stats: { value: string; label: string }[] = [{ value: String(week.length), label: plural(week.length, 'registro na semana', 'registros na semana') }]
  if (sumField) stats.push({ value: aggregateText(sumField, aggregate(sumField, week)), label: `${sumField.label.toLocaleLowerCase('pt-BR')} na semana` })
  if (scaleField)
    stats.push({ value: aggregateText(scaleField, aggregate(scaleField, recent)), label: `${scaleField.label.toLocaleLowerCase('pt-BR')}, média 30 dias` })
  if (stats.length < 3) stats.push({ value: String(recent.length), label: 'registros em 30 dias' })

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title={mod.name}
        back={<BackButton href="/metas" label="Voltar para Metas" />}
        right={
          <Link href={`/modulos/editor?id=${mod.id}`} className="icon-btn" aria-label={`Editar ${mod.name}`}>
            <Pencil size={20} strokeWidth={1.75} />
          </Link>
        }
      />

      <div className="flex flex-col gap-4 px-5 pb-8">
        {mod.hidden && (
          <div className="card flex items-center gap-3 p-3 text-[13px]">
            <span className="flex-1 text-muted">Este módulo está fora da aba Metas.</span>
            <Button variant="ghost" size="sm" onClick={() => restoreModule(mod.id)}>
              Trazer de volta
            </Button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <AreaIcon area={mod} size={44} />
          <p className="flex-1 text-[13px] text-muted">
            {mod.goal ? 'Cada registro também conta para a meta abaixo.' : 'Registre do seu jeito. Os números se organizam sozinhos.'}
          </p>
        </div>
        {mod.goal && <GoalChip goalId={mod.goal.goalId} className="self-start" />}

        <dl className="grid grid-cols-3 gap-2">
          {stats.slice(0, 3).map(stat => (
            <Stat key={stat.label} {...stat} />
          ))}
        </dl>

        <Button block onClick={() => setForm(true)}>
          <Plus size={20} strokeWidth={1.75} aria-hidden />
          Registrar
        </Button>

        {entries.length === 0 ? (
          <div className="card flex flex-col items-center gap-3 px-6 py-8 text-center">
            <AreaIcon area={mod} size={56} />
            <p className="text-[15px] font-medium">Nenhum registro ainda</p>
            <p className="text-[13px] text-muted">O primeiro registro já começa a desenhar os gráficos daqui.</p>
          </div>
        ) : (
          <>
            <section className="card p-4" aria-labelledby="mod-grafico">
              <h2 id="mod-grafico" className="text-[15px] font-medium">
                {chart ? (chart.type === 'scale' ? `${chart.label}, média por semana` : `${chart.label} por semana`) : 'Registros por semana'}
              </h2>
              {charts.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Escolher campo do gráfico">
                  {charts.map(field => (
                    <Chip key={field.id} selected={field.id === chart?.id} onClick={() => setChartId(field.id)}>
                      {field.label}
                    </Chip>
                  ))}
                </div>
              )}
              <figure className="mt-2">
                <ResponsiveContainer width="100%" height={150}>
                  {chart?.type === 'scale' ? (
                    <LineChart data={series} margin={chartMargin}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="week" tick={tick} tickLine={false} axisLine={false} minTickGap={12} />
                      <YAxis tick={tick} tickLine={false} axisLine={false} width={24} domain={[1, 5]} ticks={[1, 3, 5]} />
                      <Tooltip
                        {...tooltipStyle}
                        formatter={value => [`${num1(Number(value))} de 5`, chart.label]}
                        labelFormatter={label => `Semana de ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        connectNulls
                        stroke={color}
                        strokeWidth={2}
                        dot={{ r: 3, fill: color, strokeWidth: 0 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  ) : (
                    <BarChart data={series} margin={chartMargin}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="week" tick={tick} tickLine={false} axisLine={false} minTickGap={12} />
                      <YAxis tick={tick} tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                      <Tooltip
                        {...tooltipStyle}
                        cursor={{ fill: 'var(--primary-soft)' }}
                        formatter={value => [chart ? aggregateText(chart, Number(value)) : `${value}`, chart?.label ?? 'Registros']}
                        labelFormatter={label => `Semana de ${label}`}
                      />
                      <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
                <figcaption className="mt-1 text-[12px] text-muted">Últimas 8 semanas.</figcaption>
              </figure>
            </section>

            {choices.map(field => {
              const rows = choiceBreakdown(field, recent)
              const max = Math.max(1, ...rows.map(row => row.count))
              return (
                <section key={field.id} className="card p-4" aria-label={field.label}>
                  <h2 className="text-[15px] font-medium">{field.label}</h2>
                  <p className="text-[12px] text-muted">Últimos 30 dias</p>
                  {rows.length === 0 ? (
                    <p className="mt-2 text-[13px] text-muted">Nada marcado neste período.</p>
                  ) : (
                    <ul className="mt-3 flex flex-col gap-3">
                      {rows.map(row => (
                        <li key={row.option}>
                          <div className="mb-1.5 flex justify-between text-[14px]">
                            <span>{row.option}</span>
                            <span className="text-[12px] text-muted tabular-nums">
                              {row.count} {plural(row.count, 'vez', 'vezes')}
                            </span>
                          </div>
                          <ProgressBar value={row.count / max} color={color} label={`${row.option}: ${row.count}`} />
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )
            })}

            {checks.length > 0 && (
              <section className="card p-4" aria-label="Sim ou não">
                <ul className="flex flex-col gap-3">
                  {checks.map(field => {
                    const { yes, total } = checkStats(field, recent)
                    return (
                      <li key={field.id}>
                        <div className="mb-1.5 flex justify-between gap-2 text-[14px]">
                          <span>{field.label}</span>
                          <span className="shrink-0 text-[12px] text-muted tabular-nums">{total ? `${yes} de ${total} registros` : 'sem respostas'}</span>
                        </div>
                        <ProgressBar value={total ? yes / total : 0} color={color} label={field.label} />
                      </li>
                    )
                  })}
                </ul>
                <p className="mt-2 text-[12px] text-muted">Últimos 30 dias.</p>
              </section>
            )}

            {notes.length > 0 && (
              <section aria-labelledby="mod-notas">
                <h2 id="mod-notas" className="mb-2 text-[15px] font-medium">
                  Anotações
                </h2>
                <ul className="flex flex-col gap-2">
                  {notes.slice(0, notesShown).map(note => (
                    <li key={note.id} className="card p-3">
                      <p className="text-[14px] leading-relaxed">{note.text}</p>
                      <p className="mt-1 text-[12px] text-muted">
                        {note.label} · {shortDay(note.date)}
                      </p>
                    </li>
                  ))}
                </ul>
                {notes.length > notesShown && (
                  <Button variant="ghost" size="sm" className="mt-1" onClick={() => setNotesShown(notesShown + 8)}>
                    Ver mais
                  </Button>
                )}
              </section>
            )}

            <section aria-labelledby="mod-historico">
              <h2 id="mod-historico" className="mb-2 text-[15px] font-medium">
                Histórico
              </h2>
              <ul className="card divide-y-[0.5px] divide-line">
                {history.slice(0, shown).map(entry => {
                  const title = entryTitle(mod, entry)
                  // sem título nem números, mostra o começo da primeira anotação
                  const summary =
                    entrySummary(mod, entry) ||
                    mod.fields
                      .filter(field => field.type === 'text')
                      .map(field => entry.values[field.id])
                      .find((value): value is string => typeof value === 'string' && !!value.trim()) ||
                    ''
                  return (
                    <li key={entry.id}>
                      <button type="button" className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left" onClick={() => setDetail(entry)}>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px]">{title || summary || 'Registro'}</span>
                          {title && summary && <span className="block truncate text-[12px] text-muted">{summary}</span>}
                        </span>
                        <span className="shrink-0 text-[12px] text-muted">{shortDay(entry.date)}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              {history.length > shown && (
                <Button variant="ghost" size="sm" className="mt-1" onClick={() => setShown(shown + 10)}>
                  Ver mais
                </Button>
              )}
            </section>
          </>
        )}
      </div>

      <EntryForm mod={mod} open={form} onClose={() => setForm(false)} />

      <Sheet
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? entryTitle(mod, detail) || mod.name : ''}
        description={detail ? longDay(detail.date) : undefined}
      >
        {detail && (
          <div className="flex flex-col gap-4">
            <dl className="card divide-y-[0.5px] divide-line">
              {mod.fields
                .filter(field => isFilled(detail.values[field.id]))
                .map(field => (
                  <div key={field.id} className="flex justify-between gap-3 px-3 py-2.5 text-[14px]">
                    <dt className="text-muted">{field.label}</dt>
                    <dd className="text-right">
                      {field.type === 'check'
                        ? detail.values[field.id]
                          ? 'Sim'
                          : 'Não'
                        : field.type === 'scale'
                          ? `${detail.values[field.id]} de 5`
                          : valueText(field, detail.values[field.id])}
                    </dd>
                  </div>
                ))}
            </dl>
            {detail.logId && <p className="text-[12px] text-muted">Este registro também conta para uma meta. Ao excluir, o registro da meta sai junto.</p>}
            <Button
              variant="outline"
              onClick={() => {
                removeEntry(detail.id)
                setDetail(null)
                toast('Registro excluído')
              }}
            >
              <Trash2 size={18} strokeWidth={1.75} aria-hidden />
              Excluir registro
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}

// ---------- Registrar ----------

type Draft = Record<string, string | number | boolean | undefined>

const QUICK_MINUTES = [15, 30, 45, 60]

function toDraft(mod: AppModule, values: Record<string, FieldValue>): Draft {
  const draft: Draft = {}
  for (const field of mod.fields) {
    const value = values[field.id]
    if (value === undefined) continue
    draft[field.id] =
      field.type === 'number' && typeof value === 'number' ? num1(value) : field.type === 'duration' && typeof value === 'number' ? String(value) : value
  }
  return draft
}

function EntryForm({ mod, open, onClose }: { mod: AppModule; open: boolean; onClose: () => void }) {
  const { today } = useClock()
  const { toast } = useShell()
  const addEntry = useStore(state => state.addModuleEntry)
  const last = useStore(state => [...state.moduleEntries].filter(entry => entry.moduleId === mod.id).sort((a, b) => b.date.localeCompare(a.date))[0])
  const [draft, setDraft] = useState<Draft>({})
  const [date, setDate] = useState('')
  const [error, setError] = useState('')
  const day = date || today

  const set = (field: ModuleField, value: Draft[string]) => {
    setDraft(previous => ({ ...previous, [field.id]: value }))
    setError('')
  }

  const close = () => {
    onClose()
    setDraft({})
    setDate('')
    setError('')
  }

  const save = () => {
    const values: Record<string, FieldValue> = {}
    for (const field of mod.fields) {
      const raw = draft[field.id]
      if (raw === undefined || raw === '') continue
      if (field.type === 'number' || field.type === 'duration') {
        const value = typeof raw === 'number' ? raw : parseNum(String(raw))
        if (!Number.isFinite(value) || value < 0) return setError(`Confira o valor de ${field.label}.`)
        values[field.id] = field.type === 'duration' ? Math.round(value) : value
      } else if (field.type === 'text') {
        const text = String(raw).trim()
        if (text) values[field.id] = text
      } else values[field.id] = raw
    }
    if (Object.keys(values).length === 0) return setError('Preencha pelo menos um campo.')
    addEntry({ moduleId: mod.id, date: day > today ? today : day, values })
    toast(mod.goal ? 'Registrado e contado na meta' : 'Registrado')
    close()
  }

  return (
    <Sheet open={open} onClose={close} title={`Registrar em ${mod.name}`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="Dia" htmlFor="registro-dia">
              <input id="registro-dia" type="date" className="field" max={today} value={day} onChange={event => setDate(event.target.value)} />
            </Field>
          </div>
          {last && (
            <Button variant="ghost" size="sm" className="h-12" onClick={() => setDraft(toDraft(mod, last.values))}>
              Repetir o último
            </Button>
          )}
        </div>

        {mod.fields.map(field => {
          const id = `campo-${field.id}`
          const value = draft[field.id]
          if (field.type === 'number')
            return (
              <Field key={field.id} label={field.unit ? `${field.label} (${field.unit})` : field.label} htmlFor={id}>
                <input
                  id={id}
                  className="field"
                  inputMode="decimal"
                  value={typeof value === 'string' || typeof value === 'number' ? value : ''}
                  onChange={event => set(field, event.target.value)}
                />
              </Field>
            )
          if (field.type === 'duration')
            return (
              <div key={field.id} className="flex flex-col gap-1.5">
                <Field label={`${field.label} (min)`} htmlFor={id}>
                  <input
                    id={id}
                    className="field"
                    inputMode="numeric"
                    value={typeof value === 'string' || typeof value === 'number' ? value : ''}
                    onChange={event => set(field, event.target.value)}
                  />
                </Field>
                <div className="flex gap-2" role="group" aria-label={`Tempos rápidos para ${field.label}`}>
                  {QUICK_MINUTES.map(minutes => (
                    <Chip
                      key={minutes}
                      selected={String(value) === String(minutes)}
                      onClick={() => set(field, String(minutes))}
                      aria-label={`${minutes} minutos`}
                    >
                      {minutes} min
                    </Chip>
                  ))}
                </div>
              </div>
            )
          if (field.type === 'scale')
            return (
              <div key={field.id} className="flex flex-col gap-1.5">
                <span className="text-[13px] text-muted">{field.label}</span>
                <div role="radiogroup" aria-label={field.label} className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={value === n}
                      aria-label={`${n} de 5`}
                      onClick={() => set(field, value === n ? undefined : n)}
                      className={cn(
                        'h-11 rounded-ctl border-[0.5px] text-[15px] tabular-nums transition-colors',
                        value === n ? 'border-primary bg-primary-soft font-medium text-ink' : 'border-line bg-surface text-muted',
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )
          if (field.type === 'choice')
            return (
              <div key={field.id} className="flex flex-col gap-1.5">
                <span className="text-[13px] text-muted">{field.label}</span>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={field.label}>
                  {(field.options ?? []).map(option => (
                    <Chip key={option} selected={value === option} onClick={() => set(field, value === option ? undefined : option)}>
                      {option}
                    </Chip>
                  ))}
                </div>
              </div>
            )
          if (field.type === 'check')
            return (
              <div key={field.id} className="flex min-h-11 items-center gap-3">
                <span className="flex-1 text-[14px]">{field.label}</span>
                <Switch label={field.label} checked={value === true} onChange={checked => set(field, checked)} />
              </div>
            )
          return (
            <Field key={field.id} label={field.label} htmlFor={id}>
              <textarea id={id} rows={2} className="field" value={typeof value === 'string' ? value : ''} onChange={event => set(field, event.target.value)} />
            </Field>
          )
        })}

        {error && (
          <p role="alert" className="text-[12px]">
            {error}
          </p>
        )}
        <Button block onClick={save}>
          Registrar
        </Button>
      </div>
    </Sheet>
  )
}
