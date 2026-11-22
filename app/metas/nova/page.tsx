'use client'

import { ChevronLeft, Plus, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AreaEditor } from '@/components/area-editor'
import { TopBar, useShell } from '@/components/app-shell'
import { AreaChip, AreaIcon, BackButton } from '@/components/common'
import { Illustration, type IllustrationName } from '@/components/illustration'
import { ArtPicker, METRIC_ART } from '@/components/goal-visuals'
import { Button } from '@/components/ui/button'
import { Chip, Field, Segmented, Stepper, Switch } from '@/components/ui/controls'
import { cap, fmt, parseNum, uid } from '@/lib/format'
import { amount, METRIC_LABEL } from '@/lib/goals'
import { useStore } from '@/lib/store'
import { useClock } from '@/lib/time'
import type { Metric, MetricType } from '@/lib/types'
import { cn } from '@/lib/utils'

const STEPS: { name: string; question: string; art: IllustrationName }[] = [
  { name: 'Específica', question: 'O que você quer alcançar?', art: 'wizard-specific' },
  { name: 'Mensurável', question: 'Como você vai medir?', art: 'wizard-measurable' },
  { name: 'Alcançável', question: 'De onde você parte?', art: 'wizard-achievable' },
  { name: 'Relevante', question: 'Por que isso importa?', art: 'wizard-relevant' },
  { name: 'Prazo', question: 'Até quando?', art: 'wizard-deadline' },
  { name: 'Resumo', question: 'Tudo certo?', art: 'wizard-specific' },
]

const TYPES: MetricType[] = ['frequency', 'sum', 'value', 'milestones', 'days']

/** Nova meta, passo a passo (SMART), com um cartão de resumo antes de salvar. */
export default function NewGoalPage() {
  const router = useRouter()
  const { today } = useClock()
  const { toast } = useShell()
  const areas = useStore(state => state.areas)
  const addGoal = useStore(state => state.addGoal)
  const active = areas.filter(area => !area.archived).sort((a, b) => a.order - b.order)

  // "Criar metas de 2027" na retrospectiva chega aqui com ?ano=2027
  const [year] = useState(() => {
    const param = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('ano')
    return param && /^\d{4}$/.test(param) ? Number(param) : Number(today.slice(0, 4))
  })

  const [step, setStep] = useState(0)
  const [editorOpen, setEditorOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [areaId, setAreaId] = useState(active[0]?.id ?? '')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<MetricType>('frequency')
  const [freq, setFreq] = useState({ min: 3, max: 4, noun: 'vezes' })
  const [sum, setSum] = useState({ target: '', currency: true, unit: '' })
  const [value, setValue] = useState({ from: '', to: '', unit: 'kg' })
  const [items, setItems] = useState(['', '', ''])
  const [days, setDays] = useState({ target: '30', unit: 'dias' as 'dias' | 'horas', session: 30 })
  const [startingPoint, setStartingPoint] = useState('')
  const [achievableNote, setAchievableNote] = useState('')
  const [why, setWhy] = useState('')
  const [deadline, setDeadline] = useState(`${year}-12-31`)
  const [reminder, setReminder] = useState({ on: false, time: '08:00' })
  const [art, setArt] = useState<IllustrationName | null>(null)

  const area = areas.find(item => item.id === areaId)

  const metric = (): Metric | null => {
    if (type === 'frequency') return { type, min: freq.min, max: Math.max(freq.min, freq.max), noun: freq.noun.trim() || 'vezes' }
    if (type === 'sum') {
      const target = parseNum(sum.target)
      return target > 0 && (sum.currency || sum.unit.trim()) ? { type, target, currency: sum.currency, unit: sum.currency ? 'R$' : sum.unit.trim() } : null
    }
    if (type === 'value') {
      const from = parseNum(value.from)
      const to = parseNum(value.to)
      return !Number.isNaN(from) && !Number.isNaN(to) && from !== to ? { type, from, to, unit: value.unit.trim() } : null
    }
    if (type === 'milestones') {
      const list = items.map(item => item.trim()).filter(Boolean)
      return list.length ? { type, items: list.map(text => ({ id: `m-${uid()}`, title: text })) } : null
    }
    const target = parseNum(days.target)
    return target > 0 ? { type, target, unit: days.unit, sessionMinutes: days.session } : null
  }

  const built = metric()
  const valid = [title.trim().length > 0 && !!area, !!built, true, true, deadline >= today, true][step]

  const metricText = () => {
    if (!built) return ''
    if (built.type === 'frequency') return `${built.min} a ${built.max} ${built.noun} por semana`
    if (built.type === 'sum') return `Somar até ${amount(built, built.target)}`
    if (built.type === 'value') return `De ${built.from} para ${built.to} ${built.unit}`
    if (built.type === 'milestones') return `${built.items.length} etapas`
    return `${built.target} ${built.unit}, em sessões de ${built.sessionMinutes} min`
  }

  const save = () => {
    if (!built || !area) return
    const startDate = today > `${year}-01-01` ? today : `${year}-01-01`
    const id = addGoal({
      title: title.trim(),
      areaId: area.id,
      description: description.trim(),
      metric: built,
      startingPoint: startingPoint.trim(),
      achievableNote: achievableNote.trim(),
      why: why.trim(),
      startDate,
      deadline,
      taskTitle: title.trim(),
      reminder,
      art: art ?? undefined,
    })
    toast('Meta criada')
    router.replace(`/metas/${id}`)
  }

  const current = STEPS[step]

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title="Nova meta"
        back={step > 0 ? <button type="button" className="icon-btn" aria-label="Passo anterior" onClick={() => setStep(step - 1)}><ChevronLeft size={20} strokeWidth={1.75} /></button> : <BackButton href="/metas" label="Cancelar e voltar para Metas" />}
        right={
          <Link href="/metas" className="icon-btn" aria-label="Cancelar">
            <X size={20} strokeWidth={1.75} />
          </Link>
        }
      />
      <div className="flex gap-1.5 px-5" role="img" aria-label={`Passo ${step + 1} de ${STEPS.length}: ${current.name}`}>
        {STEPS.map((item, index) => (
          <span key={item.name} className={cn('h-1 flex-1 rounded-full', index <= step ? 'bg-primary' : 'bg-primary-soft')} />
        ))}
      </div>

      <div className="fade-in flex-1 px-5 pt-4 pb-4" key={step}>
        {step === 0 && (
          <div className="mb-2 flex justify-center">
            <Illustration name="new-goal" height={132} />
          </div>
        )}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[12px] text-muted">{current.name}</p>
            <h2 className="text-[20px] leading-snug font-medium">{current.question}</h2>
          </div>
          {step > 0 && step < 5 && <Illustration name={current.art} height={72} decorative />}
        </div>

        {step === 0 && (
          <div className="flex flex-col gap-4">
            <Field label="Título da meta" htmlFor="meta-titulo">
              <input id="meta-titulo" className="field" placeholder="Ex.: correr 5 km" value={title} onChange={event => setTitle(event.target.value)} />
            </Field>
            <Field label="Descreva em uma frase (opcional)" htmlFor="meta-descricao">
              <textarea id="meta-descricao" className="field" rows={2} placeholder="O que exatamente, e como." value={description} onChange={event => setDescription(event.target.value)} />
            </Field>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] text-muted">Área da vida</span>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Área da vida">
                {active.map(item => (
                  <Chip key={item.id} selected={item.id === areaId} onClick={() => setAreaId(item.id)} className="pl-2">
                    <AreaIcon area={item} />
                    {item.name}
                  </Chip>
                ))}
                <button type="button" onClick={() => setEditorOpen(true)} className="inline-flex h-11 items-center gap-1.5 rounded-full px-3.5 text-[13px] text-primary">
                  <Plus size={16} strokeWidth={1.75} aria-hidden />
                  Criar nova área
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] text-muted">Ícone</span>
              <ArtPicker value={art} auto={METRIC_ART[type]} onChange={setArt} />
              <p className="text-[12px] text-muted">{art ? 'Você pode trocar depois, na página da meta.' : 'No automático, o ícone acompanha o jeito de medir que você escolher.'}</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2" role="radiogroup" aria-label="Tipo de métrica">
              {TYPES.map(option => {
                const on = option === type
                return (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setType(option)}
                    className={cn('flex min-h-14 flex-col justify-center rounded-card border-[0.5px] px-4 py-2 text-left', on ? 'border-primary bg-primary-soft' : 'border-line bg-surface')}
                  >
                    <span className="text-[14px] font-medium">{METRIC_LABEL[option].name}</span>
                    <span className="text-[12px] text-muted">{METRIC_LABEL[option].hint}</span>
                  </button>
                )
              })}
            </div>

            {type === 'frequency' && (
              <div className="card flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[14px]">Mínimo por semana</span>
                  <Stepper label="Mínimo por semana" min={1} max={7} value={freq.min} onChange={min => setFreq({ ...freq, min, max: Math.max(min, freq.max) })} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[14px]">Máximo por semana</span>
                  <Stepper label="Máximo por semana" min={freq.min} max={7} value={Math.max(freq.min, freq.max)} onChange={max => setFreq({ ...freq, max })} />
                </div>
                <Field label="Como chamar cada vez" htmlFor="meta-noun">
                  <input id="meta-noun" className="field" placeholder="vezes, treinos, aulas" value={freq.noun} onChange={event => setFreq({ ...freq, noun: event.target.value })} />
                </Field>
              </div>
            )}

            {type === 'sum' && (
              <div className="card flex flex-col gap-3 p-4">
                <Segmented
                  label="Unidade"
                  value={sum.currency ? 'brl' : 'other'}
                  onChange={next => setSum({ ...sum, currency: next === 'brl' })}
                  options={[
                    { value: 'brl', label: 'Reais (R$)' },
                    { value: 'other', label: 'Outra unidade' },
                  ]}
                />
                {!sum.currency && (
                  <Field label="Unidade" htmlFor="meta-unidade">
                    <input id="meta-unidade" className="field" placeholder="km, páginas, livros" value={sum.unit} onChange={event => setSum({ ...sum, unit: event.target.value })} />
                  </Field>
                )}
                <Field label="Alvo" htmlFor="meta-alvo">
                  <input id="meta-alvo" className="field" inputMode="decimal" placeholder={sum.currency ? '5.000,00' : '100'} value={sum.target} onChange={event => setSum({ ...sum, target: event.target.value })} />
                </Field>
              </div>
            )}

            {type === 'value' && (
              <div className="card grid grid-cols-3 gap-3 p-4">
                <Field label="De" htmlFor="meta-de">
                  <input id="meta-de" className="field" inputMode="decimal" placeholder="85" value={value.from} onChange={event => setValue({ ...value, from: event.target.value })} />
                </Field>
                <Field label="Para" htmlFor="meta-para">
                  <input id="meta-para" className="field" inputMode="decimal" placeholder="78" value={value.to} onChange={event => setValue({ ...value, to: event.target.value })} />
                </Field>
                <Field label="Unidade" htmlFor="meta-valor-unidade">
                  <input id="meta-valor-unidade" className="field" placeholder="kg" value={value.unit} onChange={event => setValue({ ...value, unit: event.target.value })} />
                </Field>
              </div>
            )}

            {type === 'milestones' && (
              <div className="card flex flex-col gap-2 p-4">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-1">
                    <input className="field" aria-label={`Etapa ${index + 1}`} placeholder={`Etapa ${index + 1}`} value={item} onChange={event => setItems(items.map((text, i) => (i === index ? event.target.value : text)))} />
                    {items.length > 1 && (
                      <button type="button" className="icon-btn" aria-label={`Remover etapa ${index + 1}`} onClick={() => setItems(items.filter((_, i) => i !== index))}>
                        <Trash2 size={18} strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="self-start" onClick={() => setItems([...items, ''])}>
                  <Plus size={16} strokeWidth={1.75} aria-hidden />
                  Adicionar etapa
                </Button>
              </div>
            )}

            {type === 'days' && (
              <div className="card flex flex-col gap-3 p-4">
                <Segmented
                  label="Contar em"
                  value={days.unit}
                  onChange={unit => setDays({ ...days, unit })}
                  options={[
                    { value: 'dias', label: 'Dias feitos' },
                    { value: 'horas', label: 'Horas' },
                  ]}
                />
                <Field label={days.unit === 'dias' ? 'Quantos dias' : 'Quantas horas'} htmlFor="meta-dias">
                  <input id="meta-dias" className="field" inputMode="numeric" value={days.target} onChange={event => setDays({ ...days, target: event.target.value })} />
                </Field>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[13px] text-muted">Duração de cada sessão</span>
                  <div className="flex flex-wrap gap-2">
                    {[15, 30, 45, 60].map(minutes => (
                      <Chip key={minutes} selected={days.session === minutes} onClick={() => setDays({ ...days, session: minutes })}>
                        {minutes} min
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <Field label="Ponto de partida" htmlFor="meta-partida">
              <input id="meta-partida" className="field" placeholder="Como está hoje" value={startingPoint} onChange={event => setStartingPoint(event.target.value)} />
            </Field>
            <Field label="Dá para alcançar? O que ajuda?" htmlFor="meta-alcancavel">
              <textarea id="meta-alcancavel" className="field voice" rows={4} placeholder="O que torna essa meta possível para você." value={achievableNote} onChange={event => setAchievableNote(event.target.value)} />
            </Field>
          </div>
        )}

        {step === 3 && (
          <Field label="Escreva para você, sem pressa" htmlFor="meta-porque">
            <textarea id="meta-porque" className="field voice" rows={6} placeholder="O que muda na sua vida quando isso acontecer." value={why} onChange={event => setWhy(event.target.value)} />
          </Field>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4">
            <Field label="Data final" htmlFor="meta-prazo" hint={deadline < today ? 'Escolha uma data a partir de hoje.' : undefined}>
              <input id="meta-prazo" type="date" className="field" min={today} value={deadline} onChange={event => setDeadline(event.target.value)} />
            </Field>
            <div className="card flex min-h-14 items-center gap-3 px-4">
              <div className="flex-1">
                <p className="text-[14px]">Lembrete</p>
                <p className="text-[12px] text-muted">Um aviso discreto, fora do horário de silêncio.</p>
              </div>
              {reminder.on && <input type="time" aria-label="Horário do lembrete" className="field w-28" value={reminder.time} onChange={event => setReminder({ ...reminder, time: event.target.value })} />}
              <Switch checked={reminder.on} onChange={on => setReminder({ ...reminder, on })} label="Ativar lembrete" />
            </div>
            {type === 'sum' && <p className="text-[12px] text-muted">Metas de soma não criam tarefas diárias. Você registra quando houver um valor, e há um lembrete por mês.</p>}
          </div>
        )}

        {step === 5 && (
          <div className="card p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-[17px] font-medium">{title}</h3>
                <div className="mt-2">
                  <AreaChip area={area} />
                </div>
              </div>
              <Illustration name={art ?? METRIC_ART[type]} height={64} decorative always />
            </div>
            <dl className="mt-4 flex flex-col gap-3 text-[14px]">
              {(
                [
                  ['Específica', description.trim()],
                  ['Mensurável', metricText()],
                  ['Alcançável', [startingPoint.trim(), achievableNote.trim()].filter(Boolean).join(' ')],
                  ['Relevante', why.trim()],
                  ['Prazo', cap(fmt(deadline, "d 'de' MMMM 'de' yyyy"))],
                ] as const
              ).map(([label, text]) => (
                <div key={label}>
                  <dt className="text-[12px] text-muted">{label}</dt>
                  <dd className={text ? undefined : 'text-muted'}>{text || 'Em branco'}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 border-t-[0.5px] border-line bg-bg px-5 py-3">
        <Button block disabled={!valid} onClick={() => (step === 5 ? save() : setStep(step + 1))}>
          {step === 5 ? 'Salvar meta' : 'Continuar'}
        </Button>
      </div>

      <AreaEditor open={editorOpen} onClose={() => setEditorOpen(false)} onSaved={setAreaId} />
    </div>
  )
}
