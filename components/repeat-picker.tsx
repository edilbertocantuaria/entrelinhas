'use client'

import { Repeat as RepeatIcon } from 'lucide-react'
import { useState } from 'react'
import { describe, WEEKDAYS } from '@/lib/recurrence'
import type { Repeat } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Chip, Segmented, Stepper } from './ui/controls'

type Preset = 'none' | 'daily' | 'business' | 'custom'

const BUSINESS = [1, 2, 3, 4, 5]

/** Qual atalho corresponde à repetição; o resto é "Personalizado". */
function presetOf(value: Repeat | null): Preset {
  if (!value) return 'none'
  if (value.interval !== 1) return 'custom'
  if (value.freq === 'daily') return 'daily'
  const days = value.weekdays ?? []
  if (value.freq === 'weekly' && days.length === 7) return 'daily'
  if (value.freq === 'weekly' && days.length === 5 && BUSINESS.every(day => days.includes(day))) return 'business'
  return 'custom'
}

/**
 * Repetição no estilo agenda: atalhos (todos os dias, dias úteis) e "Personalizado",
 * que abre o ajuste fino (a cada N, dias da semana, dia do mês e quando termina).
 * Nenhum atalho depende do dia de início, para não sugerir um dia da semana sem motivo.
 */
export function RepeatPicker({
  value,
  onChange,
  start,
  allowNone = true,
  suggestedEnd,
}: {
  value: Repeat | null
  onChange: (value: Repeat | null) => void
  /** primeiro dia da repetição */
  start: string
  allowNone?: boolean
  /** data final oferecida em "Termina" (ex.: o prazo da meta) */
  suggestedEnd?: string
}) {
  const end: Repeat['end'] = value?.end ?? (suggestedEnd ? { type: 'date', date: suggestedEnd } : { type: 'never' })
  const make = (patch: Partial<Repeat>): Repeat => ({ freq: 'weekly', interval: 1, weekdays: [1], ...value, ...patch, start, end })
  // "Personalizado" fica aberto mesmo quando os dias escolhidos coincidem com um atalho
  const [customOpen, setCustomOpen] = useState(() => presetOf(value) === 'custom')
  const current: Preset = customOpen && value ? 'custom' : presetOf(value)

  const presets: { key: Preset; label: string; pick: () => void }[] = [
    ...(allowNone ? [{ key: 'none' as const, label: 'Não se repete', pick: () => onChange(null) }] : []),
    { key: 'daily', label: 'Todos os dias', pick: () => onChange(make({ freq: 'daily', interval: 1, weekdays: undefined, monthDay: undefined })) },
    { key: 'business', label: 'Dias úteis', pick: () => onChange(make({ freq: 'weekly', interval: 1, weekdays: BUSINESS, monthDay: undefined })) },
    {
      key: 'custom',
      label: 'Personalizado',
      // parte do que já estiver escolhido; sem nada, começa em "toda segunda" para você ajustar
      pick: () => onChange(value ?? make({ freq: 'weekly', interval: 1, weekdays: [1] })),
    },
  ]

  const toggleDay = (day: number) => {
    if (!value) return
    const days = value.weekdays ?? []
    const next = days.includes(day) ? days.filter(item => item !== day) : [...days, day]
    if (next.length) onChange({ ...value, weekdays: next })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Repetição">
        {presets.map(preset => (
          <Chip
            key={preset.key}
            selected={current === preset.key}
            onClick={() => {
              setCustomOpen(preset.key === 'custom')
              preset.pick()
            }}
          >
            {preset.label}
          </Chip>
        ))}
      </div>

      {value && current !== 'custom' && (
        <p className="flex items-center gap-1.5 text-[12px] text-muted" aria-live="polite">
          <RepeatIcon size={14} strokeWidth={1.75} aria-hidden />
          {describe(value)}
          <button type="button" className="min-h-11 px-1 font-medium text-primary" onClick={() => setCustomOpen(true)}>
            Ajustar
          </button>
        </p>
      )}

      {value && current === 'custom' && (
        <div className="card flex flex-col gap-3 p-3">
          <div className="flex items-center gap-2">
            <span className="text-[14px]">A cada</span>
            <Stepper label="Intervalo da repetição" min={1} max={12} value={value.interval} onChange={interval => onChange({ ...value, interval })} />
            <select
              className="field min-w-0 flex-1 px-2"
              aria-label="Unidade da repetição"
              value={value.freq}
              onChange={event => {
                const freq = event.target.value as Repeat['freq']
                onChange({ ...value, freq, weekdays: freq === 'weekly' ? (value.weekdays?.length ? value.weekdays : [1]) : undefined, monthDay: freq === 'monthly' ? (value.monthDay ?? 1) : undefined })
              }}
            >
              <option value="daily">{value.interval === 1 ? 'dia' : 'dias'}</option>
              <option value="weekly">{value.interval === 1 ? 'semana' : 'semanas'}</option>
              <option value="monthly">{value.interval === 1 ? 'mês' : 'meses'}</option>
            </select>
          </div>

          {value.freq === 'weekly' && (
            <div className="grid grid-cols-7 gap-1" role="group" aria-label="Dias da semana">
              {WEEKDAYS.map(day => {
                const on = value.weekdays?.includes(day.value) ?? false
                return (
                  <button
                    key={day.value}
                    type="button"
                    aria-pressed={on}
                    aria-label={day.long}
                    onClick={() => toggleDay(day.value)}
                    className={cn('h-11 rounded-full border-[0.5px] text-[13px] transition-colors', on ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface text-muted')}
                  >
                    {day.short}
                  </button>
                )
              })}
            </div>
          )}

          {value.freq === 'monthly' && (
            <div className="flex items-center gap-2">
              <span className="flex-1 text-[14px]">No dia</span>
              <Stepper label="Dia do mês" min={1} max={31} value={value.monthDay ?? 1} onChange={monthDay => onChange({ ...value, monthDay })} />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] text-muted">Termina</span>
            <Segmented<Repeat['end']['type']>
              label="Quando termina"
              value={value.end.type}
              onChange={type =>
                onChange({
                  ...value,
                  end: type === 'never' ? { type } : type === 'date' ? { type, date: suggestedEnd ?? `${start.slice(0, 4)}-12-31` } : { type, count: 10 },
                })
              }
              options={[
                { value: 'never', label: 'Nunca' },
                { value: 'date', label: 'Em uma data' },
                { value: 'count', label: 'Após N vezes' },
              ]}
            />
            {value.end.type === 'date' && (
              <input type="date" aria-label="Data em que a repetição termina" className="field" min={start} value={value.end.date} onChange={event => event.target.value && onChange({ ...value, end: { type: 'date', date: event.target.value } })} />
            )}
            {value.end.type === 'count' && (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-[14px]">Quantas vezes</span>
                <Stepper label="Número de vezes" min={1} max={365} value={value.end.count} onChange={count => onChange({ ...value, end: { type: 'count', count } })} />
              </div>
            )}
          </div>

          <p className="flex items-center gap-1.5 text-[12px] text-muted" aria-live="polite">
            <RepeatIcon size={14} strokeWidth={1.75} aria-hidden />
            {describe(value)}
          </p>
        </div>
      )}
    </div>
  )
}
