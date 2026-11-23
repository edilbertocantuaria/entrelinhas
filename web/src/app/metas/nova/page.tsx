'use client'

import { ChevronLeft, ChevronRight, Plus, Trash2, X } from 'lucide-react'
import { clearDraft, keepMilestoneIds, readDraft, untilLabel, type GoalDraft } from '@/domain/goal-draft'
import { ESTHER, EstherAvatar } from '@/components/esther'
import Link from 'next/link'
import { useRouter, useSearchParams, type ReadonlyURLSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { AreaEditor } from '@/components/area-editor'
import { TopBar, useShell } from '@/components/app-shell'
import { AreaChip, AreaIcon, BackButton } from '@/components/common'
import { Illustration, type IllustrationName } from '@/components/illustration'
import { ArtPicker, METRIC_ART } from '@/components/goal-visuals'
import { Button } from '@/components/ui/button'
import { Chip, Field, Segmented, Stepper, Switch } from '@/components/ui/controls'
import { parseNum, uid } from '@/shared/format'
import { amount, describeFrequency, marcoCandidates, METRIC_LABEL } from '@/domain/goals'
import { PERIOD, PERIODS } from '@/domain/periods'
import { useStore } from '@/shared/store'
import { useClock } from '@/shared/time'
import { describe, repeatEndFor, suggestRepeat } from '@/domain/recurrence'
import type { FrequencyPeriod, GoalUntil, HoursRule, Metric, MetricType, Repeat } from '@/domain/types'
import { RepeatPicker } from '@/components/repeat-picker'
import { cn } from '@/shared/utils'

const STEPS: { name: string; question: string; art: IllustrationName }[] = [
  { name: 'Específica', question: 'O que você quer alcançar?', art: 'wizard-specific' },
  { name: 'Mensurável', question: 'Como você vai medir?', art: 'wizard-measurable' },
  { name: 'Alcançável', question: 'De onde você parte?', art: 'wizard-achievable' },
  { name: 'Relevante', question: 'Por que isso importa?', art: 'wizard-relevant' },
  { name: 'Prazo', question: 'Até quando?', art: 'wizard-deadline' },
  { name: 'Resumo', question: 'Tudo certo?', art: 'wizard-specific' },
]

const TYPES: MetricType[] = ['frequency', 'sum', 'value', 'milestones', 'days']

/** frequência sendo montada no passo "Mensurável" */
interface FreqDraft {
  min: number
  max: number
  noun: string
  period: FrequencyPeriod
  count: 'vezes' | 'horas' | 'dias-horas'
  /** dias e horas: como o tempo entra na conta */
  rule: HoursRule
}

const HOURS_RULES: { value: HoursRule; label: string; hint: string }[] = [
  { value: 'per-day', label: 'Mínimo por dia', hint: 'O dia só conta quando chega a esse tempo.' },
  { value: 'total', label: 'Total no período', hint: 'Dias e horas somadas, as duas contas lado a lado.' },
  { value: 'reference', label: 'Só referência', hint: 'Conta qualquer dia com registro; as horas aparecem como referência.' },
]

/** atalhos de duração da sessão; "Outra" aceita qualquer valor nesse intervalo (o mesmo que a Esther usa) */
const SESSION_PRESETS = [15, 30, 45, 60]
const MIN_SESSION = 5
const MAX_SESSION = 240

/**
 * Nova meta, passo a passo (SMART), com um cartão de resumo antes de salvar.
 * - ?editar=<id>: abre a meta para edição
 * - ?rascunho=1: abre o que veio do chat com a IA
 * - ?ano=2027: "Criar metas de 2027" na retrospectiva
 * Os parâmetros vêm do useSearchParams (o window.location ainda mostra a página anterior
 * durante a navegação), e o formulário recomeça quando eles mudam.
 */
export default function NewGoalPage() {
  return (
    <Suspense fallback={null}>
      <NewGoalRoute />
    </Suspense>
  )
}

function NewGoalRoute() {
  const params = useSearchParams()
  return <NewGoalForm key={params.toString()} params={params} />
}

function NewGoalForm({ params }: { params: URLSearchParams | ReadonlyURLSearchParams }) {
  const router = useRouter()
  const { today } = useClock()
  const { toast } = useShell()
  const areas = useStore(state => state.areas)
  const addGoal = useStore(state => state.addGoal)
  const addRule = useStore(state => state.addRule)
  const active = areas.filter(area => !area.archived).sort((a, b) => a.order - b.order)

  const [year] = useState(() => {
    const param = params.get('ano')
    return param && /^\d{4}$/.test(param) ? Number(param) : Number(today.slice(0, 4))
  })

  const [mode] = useState(() => {
    const editing = useStore.getState().goals.find(goal => goal.id === params.get('editar'))
    // ?rascunho=1 traz o que veio da conversa com a Esther (nova meta ou ajuste de uma existente)
    const fromChat = params.get('rascunho') ? readDraft() : null
    const draft: GoalDraft | null = fromChat ?? editing ?? null
    return { editing, draft, fromChat: !!fromChat }
  })
  const { editing, draft, fromChat } = mode
  const dm = draft?.metric
  const decimal = (n: number | undefined) => (n === undefined ? '' : String(n).replace('.', ','))

  const [step, setStep] = useState(0)
  const [editorOpen, setEditorOpen] = useState(false)
  const [title, setTitle] = useState(draft?.title ?? '')
  const [areaId, setAreaId] = useState(draft?.areaId && areas.some(item => item.id === draft.areaId) ? draft.areaId : (active[0]?.id ?? ''))
  const [description, setDescription] = useState(draft?.description ?? '')
  const [type, setType] = useState<MetricType>(dm?.type ?? 'frequency')
  const [freq, setFreq] = useState<FreqDraft>(() =>
    dm?.type === 'frequency'
      ? {
          min: dm.min,
          max: dm.max,
          noun: dm.count && dm.count !== 'vezes' ? 'vezes' : dm.noun,
          period: dm.period ?? 'week',
          count: dm.count ?? 'vezes',
          rule: dm.hours?.rule ?? 'per-day',
        }
      : { min: 3, max: 4, noun: 'vezes', period: 'week', count: 'vezes', rule: 'per-day' },
  )
  // fora de "vezes por semana" os números são digitados (podem ser altos, e horas aceitam decimais)
  const decimalText = (n: number) => String(n).replace('.', ',')
  const [freqText, setFreqText] = useState({ min: decimalText(freq.min), max: freq.max === freq.min ? '' : decimalText(freq.max) })
  // dias e horas: o tempo (por dia, total ou referência), sempre digitado
  const dh = dm?.type === 'frequency' ? dm.hours : undefined
  const [hoursText, setHoursText] = useState({ min: dh ? decimalText(dh.min) : '', max: dh && dh.max !== dh.min ? decimalText(dh.max) : '' })
  const freqStepper = freq.period === 'week' && freq.count !== 'horas'
  const changeFreq = (patch: Partial<FreqDraft>) => {
    const next = { ...freq, ...patch }
    if (next.period === 'week' && next.count !== 'horas') {
      next.min = Math.min(7, Math.max(1, Math.round(next.min)))
      next.max = Math.min(7, Math.max(next.min, Math.round(next.max)))
    }
    setFreq(next)
    // os campos de texto partem dos números atuais quando o modo muda
    if (patch.period || patch.count) setFreqText({ min: decimalText(next.min), max: next.max === next.min ? '' : decimalText(next.max) })
  }
  const freqLimit = freq.count === 'horas' ? PERIOD[freq.period].maxDays * 24 : PERIOD[freq.period].maxDays
  const freqNumbers = () => {
    if (freqStepper) return { min: freq.min, max: Math.max(freq.min, freq.max) }
    const min = parseNum(freqText.min)
    const max = freqText.max.trim() ? parseNum(freqText.max) : min
    return { min, max }
  }
  const freqError = (() => {
    if (type !== 'frequency' || freqStepper) return ''
    const { min, max } = freqNumbers()
    if (!freqText.min.trim()) return ''
    const whole = freq.count !== 'horas'
    const word = freq.count === 'dias-horas' ? 'dias' : 'vezes'
    if (!(min > 0) || (whole && !Number.isInteger(min))) return whole ? `Use um número inteiro de ${word}.` : 'Informe as horas.'
    if (!(max >= min)) return 'O máximo precisa ser igual ou maior que o mínimo.'
    if (max > freqLimit)
      return whole
        ? `Contando ${word}, o limite é de ${freqLimit} (um por dia do ${PERIOD[freq.period].name.toLocaleLowerCase('pt-BR')}).`
        : `O limite é de ${freqLimit} horas ${PERIOD[freq.period].per}.`
    if (whole && !Number.isInteger(max)) return `Use um número inteiro de ${word}.`
    return ''
  })()
  // horas de "dias e horas": por dia (até 24) ou no período inteiro
  const hoursLimit = freq.rule === 'total' ? PERIOD[freq.period].maxDays * 24 : 24
  const hoursNumbers = () => {
    const min = parseNum(hoursText.min)
    return { min, max: hoursText.max.trim() ? parseNum(hoursText.max) : min }
  }
  const hoursError = (() => {
    if (type !== 'frequency' || freq.count !== 'dias-horas' || !hoursText.min.trim()) return ''
    const { min, max } = hoursNumbers()
    if (!(min > 0)) return 'Informe as horas.'
    if (!(max >= min)) return 'O máximo de horas precisa ser igual ou maior que o mínimo.'
    if (max > hoursLimit) return freq.rule === 'total' ? `O limite é de ${hoursLimit} horas ${PERIOD[freq.period].per}.` : 'Um dia tem até 24 horas.'
    return ''
  })()
  const [sum, setSum] = useState(
    dm?.type === 'sum' ? { target: decimal(dm.target), currency: dm.currency, unit: dm.currency ? '' : dm.unit } : { target: '', currency: true, unit: '' },
  )
  const [value, setValue] = useState(dm?.type === 'value' ? { from: decimal(dm.from), to: decimal(dm.to), unit: dm.unit } : { from: '', to: '', unit: 'kg' })
  const [items, setItems] = useState(dm?.type === 'milestones' ? dm.items.map(item => item.title) : ['', '', ''])
  // as etapas existentes guardam o id, para os registros já feitos continuarem ligados a elas
  const [itemIds, setItemIds] = useState<(string | undefined)[]>(dm?.type === 'milestones' ? dm.items.map(item => item.id) : [])
  const [days, setDays] = useState(
    dm?.type === 'days'
      ? { target: String(dm.target), unit: dm.unit, session: dm.sessionMinutes ?? null }
      : { target: '30', unit: 'dias' as 'dias' | 'horas', session: null as number | null },
  )
  // duração da sessão (opcional) fora dos atalhos: a pessoa digita os minutos
  const [customSession, setCustomSession] = useState(() => (days.session === null || SESSION_PRESETS.includes(days.session) ? null : String(days.session)))
  const sessionMinutes = customSession === null ? (days.session ?? undefined) : Number(customSession)
  const sessionOk = sessionMinutes === undefined || (Number.isInteger(sessionMinutes) && sessionMinutes >= MIN_SESSION && sessionMinutes <= MAX_SESSION)
  const [startingPoint, setStartingPoint] = useState(draft?.startingPoint ?? '')
  const [achievableNote, setAchievableNote] = useState(draft?.achievableNote ?? '')
  const [why, setWhy] = useState(draft?.why ?? '')
  const [deadline, setDeadline] = useState(draft?.deadline ?? `${year}-12-31`)
  // "até [um marco]": um acontecimento em texto ou outra meta; com marco, a data vira estimativa opcional
  const [endKind, setEndKind] = useState<'date' | 'marco'>(draft?.until ? 'marco' : 'date')
  const [marcoKind, setMarcoKind] = useState<'event' | 'goal'>(draft?.until?.type ?? 'event')
  const [marcoText, setMarcoText] = useState(draft?.until?.type === 'event' ? draft.until.text : '')
  const [marcoGoalId, setMarcoGoalId] = useState(draft?.until?.type === 'goal' ? draft.until.goalId : '')
  const [estimate, setEstimate] = useState(!!draft?.until && !!draft.deadline)
  const goals = useStore(state => state.goals)
  const candidates = marcoCandidates(goals, editing?.id)
  const [reminder, setReminder] = useState(draft?.reminder ?? { on: false, time: '08:00' })
  const [art, setArt] = useState<IllustrationName | null>((draft?.art as IllustrationName | undefined) ?? null)
  // undefined = automático (sugestão pelo tipo de medida); null = sem repetição
  const [repeatChoice, setRepeatChoice] = useState<Repeat | null | undefined>(editing ? undefined : draft?.repeat)
  const goalLogs = useStore(state => (editing ? state.logs.filter(log => log.goalId === editing.id).length : 0))
  const updateGoal = useStore(state => state.updateGoal)
  const rules = useStore(state => state.rules)
  const updateRule = useStore(state => state.updateRule)

  const area = areas.find(item => item.id === areaId)

  const metric = (): Metric | null => {
    if (type === 'frequency') {
      const { min, max } = freqNumbers()
      if (freqError || !(min > 0) || !(max >= min)) return null
      const period = freq.period !== 'week' ? { period: freq.period } : {}
      if (freq.count === 'horas') return { type, min, max, noun: 'horas', ...period, count: 'horas' }
      if (freq.count === 'dias-horas') {
        const hours = hoursNumbers()
        if (hoursError || !(hours.min > 0) || !(hours.max >= hours.min)) return null
        return { type, min, max, noun: 'dias', ...period, count: 'dias-horas', hours: { rule: freq.rule, min: hours.min, max: hours.max } }
      }
      return { type, min, max, noun: freq.noun.trim() || 'vezes', ...period }
    }
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
      const list = items.map((text, index) => ({ id: itemIds[index] ?? `m-${uid()}`, title: text.trim() })).filter(item => item.title)
      return list.length ? { type, items: list } : null
    }
    const target = parseNum(days.target)
    return target > 0 && sessionOk ? { type, target, unit: days.unit, ...(sessionMinutes ? { sessionMinutes } : {}) } : null
  }

  const built = metric()
  const startDate = editing?.startDate ?? (today > `${year}-01-01` ? today : `${year}-01-01`)
  const previousReached = editing?.until?.type === 'event' ? editing.until.reachedOn : undefined
  const until: GoalUntil | undefined =
    endKind === 'date'
      ? undefined
      : marcoKind === 'event'
        ? { type: 'event', text: marcoText.trim(), ...(previousReached ? { reachedOn: previousReached } : {}) }
        : { type: 'goal', goalId: marcoGoalId }
  const finalDeadline = endKind === 'date' || estimate ? deadline : undefined
  const suggested = built ? suggestRepeat({ metric: built, startDate, deadline: finalDeadline, until }) : null
  const repeat = repeatChoice === undefined ? suggested : repeatChoice
  // ao editar, o prazo pode ficar no passado do jeito que estava, mas não antes do início
  const deadlineOk = !finalDeadline || (editing ? finalDeadline >= editing.startDate : finalDeadline >= today)
  const marcoOk = !until || (until.type === 'event' ? until.text.length > 0 : candidates.some(goal => goal.id === until.goalId))
  const valid = [title.trim().length > 0 && !!area, !!built, true, true, deadlineOk && marcoOk, true][step]

  const metricText = () => {
    if (!built) return ''
    if (built.type === 'frequency') return describeFrequency(built)
    if (built.type === 'sum') return `Somar até ${amount(built, built.target)}`
    if (built.type === 'value') return `De ${built.from} para ${built.to} ${built.unit}`
    if (built.type === 'milestones') return `${built.items.length} etapas`
    return built.sessionMinutes ? `${built.target} ${built.unit}, em sessões de ${built.sessionMinutes} min` : `${built.target} ${built.unit}`
  }

  const save = () => {
    if (!built || !area) return
    if (editing) {
      const nextTitle = title.trim()
      // a tarefa do dia vem do ajuste da Esther, ou acompanha o título quando ainda tinha o nome antigo
      const taskTitle = fromChat && draft?.taskTitle ? draft.taskTitle : editing.taskTitle === editing.title ? nextTitle : editing.taskTitle
      updateGoal(editing.id, {
        title: nextTitle,
        areaId: area.id,
        description: description.trim(),
        metric: keepMilestoneIds(built, editing.metric),
        startingPoint: startingPoint.trim(),
        achievableNote: achievableNote.trim(),
        why: why.trim(),
        deadline: finalDeadline,
        until,
        taskTitle,
        reminder,
        art: art ?? editing.art,
      })
      const rule = rules.find(item => item.goalId === editing.id)
      if (rule) {
        const patch: { title?: string; repeat?: Repeat } = {}
        if (rule.title === editing.taskTitle && taskTitle !== editing.taskTitle) patch.title = taskTitle
        // a agenda que acompanhava o fim da meta (data ou marco) continua acompanhando
        const oldEnd = JSON.stringify(repeatEndFor(editing))
        const newEnd = repeatEndFor({ deadline: finalDeadline, until })
        if (JSON.stringify(rule.repeat.end) === oldEnd && oldEnd !== JSON.stringify(newEnd)) patch.repeat = { ...rule.repeat, end: newEnd }
        if (patch.title || patch.repeat) updateRule(rule.id, patch)
      }
      if (fromChat) clearDraft()
      toast('Meta atualizada')
      router.replace(`/metas/${editing.id}`)
      return
    }
    clearDraft()
    const id = addGoal({
      title: title.trim(),
      areaId: area.id,
      description: description.trim(),
      metric: built,
      startingPoint: startingPoint.trim(),
      achievableNote: achievableNote.trim(),
      why: why.trim(),
      startDate,
      deadline: finalDeadline,
      until,
      taskTitle: draft?.taskTitle?.trim() || title.trim(),
      reminder,
      art: art ?? undefined,
    })
    if (repeat) addRule({ title: draft?.taskTitle?.trim() || title.trim(), goalId: id, repeat: { ...repeat, start: startDate } })
    toast(repeat ? 'Meta criada e tarefa na agenda' : 'Meta criada')
    router.replace(`/metas/${id}`)
  }

  const current = STEPS[step]

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title={editing ? 'Editar meta' : 'Nova meta'}
        back={
          step > 0 ? (
            <button type="button" className="icon-btn" aria-label="Passo anterior" onClick={() => setStep(step - 1)}>
              <ChevronLeft size={20} strokeWidth={1.75} />
            </button>
          ) : (
            <BackButton href={editing ? `/metas/${editing.id}` : '/metas'} label={editing ? 'Cancelar e voltar para a meta' : 'Cancelar e voltar para Metas'} />
          )
        }
        right={
          <Link href={editing ? `/metas/${editing.id}` : '/metas'} className="icon-btn" aria-label="Cancelar">
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
        {step === 0 && !editing && (
          <div className="mb-2 flex justify-center">
            <Illustration name="new-goal" height={132} />
          </div>
        )}
        {step === 0 && !editing && !draft && (
          <Link href="/metas/ia" className="card mb-5 flex min-h-14 items-center gap-3 p-3">
            <EstherAvatar size={40} />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-medium">Prefere conversar com a {ESTHER}?</span>
              <span className="block text-[12px] text-muted">Conte com suas palavras e ela monta a meta com você.</span>
            </span>
            <ChevronRight size={20} strokeWidth={1.75} aria-hidden className="text-muted" />
          </Link>
        )}
        {step === 0 && fromChat && (
          <p className="mb-4 flex items-center gap-2.5 rounded-ctl bg-primary-soft p-3 text-[12px] leading-relaxed">
            <EstherAvatar size={28} />
            {editing
              ? `Ajuste sugerido pela ${ESTHER}. Confira cada passo antes de salvar.`
              : `Rascunho da conversa com a ${ESTHER}. Confira cada passo e ajuste o que quiser antes de salvar.`}
          </p>
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
              <textarea
                id="meta-descricao"
                className="field"
                rows={2}
                placeholder="O que exatamente, e como."
                value={description}
                onChange={event => setDescription(event.target.value)}
              />
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
                <button
                  type="button"
                  onClick={() => setEditorOpen(true)}
                  className="inline-flex h-11 items-center gap-1.5 rounded-full px-3.5 text-[13px] text-primary"
                >
                  <Plus size={16} strokeWidth={1.75} aria-hidden />
                  Criar nova área
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] text-muted">Ícone</span>
              <ArtPicker value={art} auto={METRIC_ART[type]} onChange={setArt} />
              <p className="text-[12px] text-muted">
                {art ? 'Você pode trocar depois, na página da meta.' : 'No automático, o ícone acompanha o jeito de medir que você escolher.'}
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            {editing && goalLogs > 0 && type !== editing.metric.type && (
              <p className="rounded-ctl bg-primary-soft p-3 text-[12px] leading-relaxed">
                Esta meta já tem {goalLogs} {goalLogs === 1 ? 'registro' : 'registros'}. Eles continuam guardados, mas podem não fazer sentido no novo jeito de
                medir.
              </p>
            )}
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
                    className={cn(
                      'flex min-h-14 flex-col justify-center rounded-card border-[0.5px] px-4 py-2 text-left',
                      on ? 'border-primary bg-primary-soft' : 'border-line bg-surface',
                    )}
                  >
                    <span className="text-[14px] font-medium">{METRIC_LABEL[option].name}</span>
                    <span className="text-[12px] text-muted">{METRIC_LABEL[option].hint}</span>
                  </button>
                )
              })}
            </div>

            {type === 'frequency' && (
              <div className="card flex flex-col gap-3 p-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[13px] text-muted">A cada</span>
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Período do combinado">
                    {PERIODS.map(period => (
                      <Chip key={period} selected={freq.period === period} onClick={() => changeFreq({ period })}>
                        {PERIOD[period].name}
                      </Chip>
                    ))}
                  </div>
                </div>
                <Segmented
                  label="Contar"
                  value={freq.count}
                  onChange={count => changeFreq({ count })}
                  options={[
                    { value: 'vezes', label: 'Vezes' },
                    { value: 'horas', label: 'Horas' },
                    { value: 'dias-horas', label: 'Dias e horas' },
                  ]}
                />
                {freqStepper ? (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[14px]">{freq.count === 'dias-horas' ? 'Mínimo de dias por semana' : 'Mínimo por semana'}</span>
                      <Stepper label="Mínimo por semana" min={1} max={7} value={freq.min} onChange={min => changeFreq({ min, max: Math.max(min, freq.max) })} />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[14px]">{freq.count === 'dias-horas' ? 'Máximo de dias por semana' : 'Máximo por semana'}</span>
                      <Stepper label="Máximo por semana" min={freq.min} max={7} value={Math.max(freq.min, freq.max)} onChange={max => changeFreq({ max })} />
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={`${freq.count === 'dias-horas' ? 'Dias' : 'Mínimo'} ${PERIOD[freq.period].per}`} htmlFor="meta-freq-min">
                      <input
                        id="meta-freq-min"
                        className="field"
                        inputMode={freq.count === 'horas' ? 'decimal' : 'numeric'}
                        placeholder={freq.count === 'horas' ? '10' : freq.count === 'dias-horas' ? '16' : '8'}
                        value={freqText.min}
                        onChange={event => setFreqText({ ...freqText, min: event.target.value })}
                      />
                    </Field>
                    <Field label="Máximo (opcional)" htmlFor="meta-freq-max">
                      <input
                        id="meta-freq-max"
                        className="field"
                        inputMode={freq.count === 'horas' ? 'decimal' : 'numeric'}
                        placeholder={freqText.min || '12'}
                        value={freqText.max}
                        onChange={event => setFreqText({ ...freqText, max: event.target.value })}
                      />
                    </Field>
                  </div>
                )}
                {freqError && <p className="text-[12px] text-muted">{freqError}</p>}
                {freq.count === 'vezes' ? (
                  <>
                    <Field label="Como chamar cada vez" htmlFor="meta-noun">
                      <input
                        id="meta-noun"
                        className="field"
                        placeholder="vezes, treinos, aulas"
                        value={freq.noun}
                        onChange={event => changeFreq({ noun: event.target.value })}
                      />
                    </Field>
                    <p className="text-[12px] text-muted">Conta dias com registro: duas atividades no mesmo dia valem 1.</p>
                  </>
                ) : freq.count === 'horas' ? (
                  <p className="text-[12px] text-muted">Cada registro pede o tempo dedicado, e as horas se somam no período.</p>
                ) : (
                  <div className="flex flex-col gap-3 border-t-[0.5px] border-line pt-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[13px] text-muted">Como as horas contam</span>
                      <div className="flex flex-col gap-2" role="radiogroup" aria-label="Como as horas contam">
                        {HOURS_RULES.map(option => {
                          const on = freq.rule === option.value
                          return (
                            <button
                              key={option.value}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              onClick={() => changeFreq({ rule: option.value })}
                              className={cn(
                                'flex min-h-12 flex-col justify-center rounded-ctl border-[0.5px] px-3 py-2 text-left',
                                on ? 'border-primary bg-primary-soft' : 'border-line bg-surface',
                              )}
                            >
                              <span className="text-[14px] font-medium">{option.label}</span>
                              <span className="text-[12px] text-muted">{option.hint}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field
                        label={freq.rule === 'total' ? `Horas ${PERIOD[freq.period].per}` : freq.rule === 'per-day' ? 'Horas por dia' : 'Horas por sessão'}
                        htmlFor="meta-horas-min"
                      >
                        <input
                          id="meta-horas-min"
                          className="field"
                          inputMode="decimal"
                          placeholder={freq.rule === 'total' ? '10' : '2'}
                          value={hoursText.min}
                          onChange={event => setHoursText({ ...hoursText, min: event.target.value })}
                        />
                      </Field>
                      <Field label="Até (opcional)" htmlFor="meta-horas-max">
                        <input
                          id="meta-horas-max"
                          className="field"
                          inputMode="decimal"
                          placeholder={hoursText.min || (freq.rule === 'total' ? '15' : '3')}
                          value={hoursText.max}
                          onChange={event => setHoursText({ ...hoursText, max: event.target.value })}
                        />
                      </Field>
                    </div>
                    {hoursError && <p className="text-[12px] text-muted">{hoursError}</p>}
                    <p className="text-[12px] text-muted">
                      {freq.rule === 'per-day'
                        ? 'Cada registro pede o tempo; registros do mesmo dia se somam, e o dia conta quando chega ao mínimo.'
                        : freq.rule === 'total'
                          ? 'Cada registro pede o tempo. O ritmo olha os dias e as horas, e fica atrás se qualquer um dos dois ficar.'
                          : 'Cada registro pede o tempo, mas qualquer dia com registro conta. As horas aparecem como referência.'}
                    </p>
                  </div>
                )}
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
                    <input
                      id="meta-unidade"
                      className="field"
                      placeholder="km, páginas, livros"
                      value={sum.unit}
                      onChange={event => setSum({ ...sum, unit: event.target.value })}
                    />
                  </Field>
                )}
                <Field label="Alvo" htmlFor="meta-alvo">
                  <input
                    id="meta-alvo"
                    className="field"
                    inputMode="decimal"
                    placeholder={sum.currency ? '5.000,00' : '100'}
                    value={sum.target}
                    onChange={event => setSum({ ...sum, target: event.target.value })}
                  />
                </Field>
              </div>
            )}

            {type === 'value' && (
              <div className="card grid grid-cols-3 gap-3 p-4">
                <Field label="De" htmlFor="meta-de">
                  <input
                    id="meta-de"
                    className="field"
                    inputMode="decimal"
                    placeholder="85"
                    value={value.from}
                    onChange={event => setValue({ ...value, from: event.target.value })}
                  />
                </Field>
                <Field label="Para" htmlFor="meta-para">
                  <input
                    id="meta-para"
                    className="field"
                    inputMode="decimal"
                    placeholder="78"
                    value={value.to}
                    onChange={event => setValue({ ...value, to: event.target.value })}
                  />
                </Field>
                <Field label="Unidade" htmlFor="meta-valor-unidade">
                  <input
                    id="meta-valor-unidade"
                    className="field"
                    placeholder="kg"
                    value={value.unit}
                    onChange={event => setValue({ ...value, unit: event.target.value })}
                  />
                </Field>
              </div>
            )}

            {type === 'milestones' && (
              <div className="card flex flex-col gap-2 p-4">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-1">
                    <input
                      className="field"
                      aria-label={`Etapa ${index + 1}`}
                      placeholder={`Etapa ${index + 1}`}
                      value={item}
                      onChange={event => setItems(items.map((text, i) => (i === index ? event.target.value : text)))}
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={`Remover etapa ${index + 1}`}
                        onClick={() => {
                          setItems(items.filter((_, i) => i !== index))
                          setItemIds(itemIds.filter((_, i) => i !== index))
                        }}
                      >
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
                  <input
                    id="meta-dias"
                    className="field"
                    inputMode="numeric"
                    value={days.target}
                    onChange={event => setDays({ ...days, target: event.target.value })}
                  />
                </Field>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[13px] text-muted">Duração de cada sessão (opcional)</span>
                  <div className="flex flex-wrap gap-2">
                    <Chip
                      selected={customSession === null && days.session === null}
                      onClick={() => {
                        setDays({ ...days, session: null })
                        setCustomSession(null)
                      }}
                    >
                      Sem duração
                    </Chip>
                    {SESSION_PRESETS.map(minutes => (
                      <Chip
                        key={minutes}
                        selected={customSession === null && days.session === minutes}
                        onClick={() => {
                          setDays({ ...days, session: minutes })
                          setCustomSession(null)
                        }}
                      >
                        {minutes} min
                      </Chip>
                    ))}
                    <Chip
                      selected={customSession !== null}
                      onClick={() => customSession === null && setCustomSession(days.session ? String(days.session) : '')}
                    >
                      Outra
                    </Chip>
                  </div>
                  {customSession !== null && (
                    <Field
                      label="Minutos por sessão"
                      htmlFor="meta-sessao"
                      hint={sessionOk ? undefined : `Use um número inteiro de ${MIN_SESSION} a ${MAX_SESSION} minutos.`}
                    >
                      <input
                        id="meta-sessao"
                        className="field"
                        inputMode="numeric"
                        placeholder="90"
                        autoFocus
                        value={customSession}
                        onChange={event => setCustomSession(event.target.value.replace(/\D/g, ''))}
                      />
                    </Field>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <Field label="Ponto de partida" htmlFor="meta-partida">
              <input
                id="meta-partida"
                className="field"
                placeholder="Como está hoje"
                value={startingPoint}
                onChange={event => setStartingPoint(event.target.value)}
              />
            </Field>
            <Field label="Dá para alcançar? O que ajuda?" htmlFor="meta-alcancavel">
              <textarea
                id="meta-alcancavel"
                className="field voice"
                rows={4}
                placeholder="O que torna essa meta possível para você."
                value={achievableNote}
                onChange={event => setAchievableNote(event.target.value)}
              />
            </Field>
          </div>
        )}

        {step === 3 && (
          <Field label="Escreva para você, sem pressa" htmlFor="meta-porque">
            <textarea
              id="meta-porque"
              className="field voice"
              rows={6}
              placeholder="O que muda na sua vida quando isso acontecer."
              value={why}
              onChange={event => setWhy(event.target.value)}
            />
          </Field>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4">
            <Segmented
              label="A meta termina"
              value={endKind}
              onChange={setEndKind}
              options={[
                { value: 'date', label: 'Numa data' },
                { value: 'marco', label: 'Num marco' },
              ]}
            />
            {endKind === 'marco' && (
              <div className="card flex flex-col gap-3 p-4">
                <p className="text-[12px] text-muted">A meta vale até o marco acontecer. As tarefas e o ritmo param nesse dia.</p>
                <Segmented
                  label="O marco é"
                  value={marcoKind}
                  onChange={setMarcoKind}
                  options={[
                    { value: 'event', label: 'Um acontecimento' },
                    { value: 'goal', label: 'Outra meta' },
                  ]}
                />
                {marcoKind === 'event' ? (
                  <Field
                    label="Até…"
                    htmlFor="meta-marco"
                    hint={marcoText.trim() ? 'Quando acontecer, toque em “Marco atingido” na página da meta.' : 'Descreva o marco.'}
                  >
                    <input
                      id="meta-marco"
                      className="field"
                      placeholder="passar no concurso"
                      value={marcoText}
                      onChange={event => setMarcoText(event.target.value.replace(/^até\s+/i, ''))}
                    />
                  </Field>
                ) : candidates.length === 0 ? (
                  <p className="text-[13px] text-muted">
                    Nenhuma outra meta pode servir de marco ainda. Metas de frequência não terminam sozinhas: use um acontecimento em texto.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] text-muted">Até concluir a meta</span>
                    <div className="flex flex-col gap-2" role="radiogroup" aria-label="Meta que serve de marco">
                      {candidates.map(goal => (
                        <Chip key={goal.id} selected={goal.id === marcoGoalId} onClick={() => setMarcoGoalId(goal.id)} className="justify-start">
                          {goal.title}
                        </Chip>
                      ))}
                    </div>
                    <p className="text-[12px] text-muted">Esta meta termina sozinha quando a escolhida for concluída.</p>
                  </div>
                )}
                <div className="flex min-h-11 items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[14px]">Data estimada</p>
                    <p className="text-[12px] text-muted">Opcional. Serve só para calcular o ritmo.</p>
                  </div>
                  <Switch checked={estimate} onChange={setEstimate} label="Usar data estimada" />
                </div>
              </div>
            )}
            {(endKind === 'date' || estimate) && (
              <Field
                label={endKind === 'date' ? 'Data final' : 'Data estimada'}
                htmlFor="meta-prazo"
                hint={!deadlineOk ? (editing ? 'Escolha uma data depois do início da meta.' : 'Escolha uma data a partir de hoje.') : undefined}
              >
                <input
                  id="meta-prazo"
                  type="date"
                  className="field"
                  min={editing ? editing.startDate : today}
                  value={deadline}
                  onChange={event => setDeadline(event.target.value)}
                />
              </Field>
            )}
            <div className="card flex min-h-14 items-center gap-3 px-4">
              <div className="flex-1">
                <p className="text-[14px]">Lembrete</p>
                <p className="text-[12px] text-muted">Um aviso discreto, fora do horário de silêncio.</p>
              </div>
              {reminder.on && (
                <input
                  type="time"
                  aria-label="Horário do lembrete"
                  className="field w-28"
                  value={reminder.time}
                  onChange={event => setReminder({ ...reminder, time: event.target.value })}
                />
              )}
              <Switch checked={reminder.on} onChange={on => setReminder({ ...reminder, on })} label="Ativar lembrete" />
            </div>
            {editing ? (
              <p className="card p-4 text-[13px] text-muted">A tarefa na agenda e a repetição ficam na página da meta, no cartão “Na agenda”.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] text-muted">Tarefa na agenda</span>
                <p className="text-[12px] text-muted">
                  {draft?.repeat !== undefined
                    ? 'Sugestão da conversa com a IA. Ajuste os dias se quiser.'
                    : suggested
                      ? `Sugestão para ${METRIC_LABEL[type].name.toLocaleLowerCase('pt-BR')}: a tarefa “${title.trim() || 'da meta'}” entra sozinha nesses dias, até ${until ? 'o marco' : 'o prazo'}.`
                      : 'Esta meta não precisa de tarefa fixa, mas você pode agendar uma.'}
                </p>
                <RepeatPicker value={repeat} onChange={setRepeatChoice} start={startDate} suggestedEnd={until ? undefined : finalDeadline} />
              </div>
            )}
            {type === 'sum' && (
              <p className="text-[12px] text-muted">Metas de soma não criam tarefas diárias. Você registra quando houver um valor, e há um lembrete por mês.</p>
            )}
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
                  ['Prazo', untilLabel({ deadline: finalDeadline, until }, goals)],
                  ...(editing ? [] : [['Na agenda', repeat ? describe(repeat) : 'Sem tarefa fixa'] as const]),
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
          {step === 5 ? (editing ? 'Salvar alterações' : 'Salvar meta') : 'Continuar'}
        </Button>
      </div>

      <AreaEditor open={editorOpen} onClose={() => setEditorOpen(false)} onSaved={setAreaId} />
    </div>
  )
}
