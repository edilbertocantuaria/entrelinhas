import type { CampoMeta, MetaProposta } from '@/utils/prompts'
import { cap, fmt, shift, uid } from '@/shared/format'
import { amount, describeFrequency, untilText, type Pace, type Progress } from '@/domain/goals'
import { PERIOD } from '@/domain/periods'
import { describe, repeatEndFor } from '@/domain/recurrence'
import type { Area, Goal, GoalUntil, Metric, RecurringTask, Repeat } from '@/domain/types'

/**
 * Rascunho de meta: tudo o que o passo a passo precisa para abrir já preenchido.
 * Vem do chat com a IA ("Editar campos") e é guardado na aba do navegador até ser usado.
 */
export interface GoalDraft extends Pick<
  Goal,
  'title' | 'areaId' | 'description' | 'metric' | 'startingPoint' | 'achievableNote' | 'why' | 'deadline' | 'until' | 'taskTitle' | 'reminder'
> {
  art?: string
  /** quando a meta começa (só em metas novas; sem ele, começa hoje) */
  startDate?: string
  /** null = sem repetição; undefined = deixar a sugestão automática */
  repeat?: Repeat | null
}

const KEY = 'entrelinhas-rascunho-meta'

export function saveDraft(draft: GoalDraft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    // sem armazenamento da aba (modo privado): o passo a passo abre em branco
  }
}

export function readDraft(): GoalDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as GoalDraft) : null
  } catch {
    return null
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY)
    // a meta saiu do rascunho: a conversa que o gerou também pode ir embora
    sessionStorage.removeItem('entrelinhas-chat-meta')
  } catch {
    // nada a limpar
  }
}

/** "3 a 4 treinos por semana", "Somar até R$ 5.000,00"... */
export function describeMetric(metric: Metric) {
  if (metric.type === 'frequency') return describeFrequency(metric)
  if (metric.type === 'sum') return `Somar até ${amount(metric, metric.target)}`
  if (metric.type === 'value') return `De ${amount(metric, metric.from)} para ${amount(metric, metric.to)}`
  if (metric.type === 'milestones') return `${metric.items.length} etapas: ${metric.items.map(item => item.title).join(', ')}`
  return metric.sessionMinutes ? `${metric.target} ${metric.unit}, em sessões de ${metric.sessionMinutes} min` : `${metric.target} ${metric.unit}`
}

const clampInt = (value: number | undefined, min: number, max: number, fallback: number) =>
  value === undefined || !Number.isFinite(value) ? fallback : Math.min(max, Math.max(min, Math.round(value)))

/** Converte a medida proposta pela IA numa métrica válida do app (com valores seguros quando falta algo). */
function toMetric(m: MetaProposta['medida']): Metric {
  if (m.tipo === 'frequency') {
    const period = m.periodo ?? 'week'
    const hours = m.contarEm === 'horas'
    // vezes/dias: no máximo um por dia do período; horas: até 24 por dia
    const limit = hours ? PERIOD[period].maxDays * 24 : PERIOD[period].maxDays
    const min = clampInt(m.min, 1, limit, 3)
    const max = clampInt(m.max, min, limit, min)
    const periodPart = period !== 'week' ? { period } : {}
    if (hours) return { type: 'frequency', min, max, noun: 'horas', ...periodPart, count: 'horas' }
    if (m.contarEm === 'diasEHoras') {
      const rule = m.horas?.modo === 'total' ? 'total' : m.horas?.modo === 'referencia' ? 'reference' : 'per-day'
      const hoursLimit = rule === 'total' ? PERIOD[period].maxDays * 24 : 24
      const clampHours = (value: number | undefined, low: number, fallback: number) =>
        value === undefined || !Number.isFinite(value) || value <= 0 ? fallback : Math.min(hoursLimit, Math.max(low, Math.round(value * 10) / 10))
      const hMin = clampHours(m.horas?.min, 0.5, rule === 'total' ? 10 : 2)
      return {
        type: 'frequency',
        min,
        max,
        noun: 'dias',
        ...periodPart,
        count: 'dias-horas',
        hours: { rule, min: hMin, max: clampHours(m.horas?.max, hMin, hMin) },
      }
    }
    return { type: 'frequency', min, max, noun: m.nome || 'vezes', ...periodPart }
  }
  if (m.tipo === 'sum' && m.alvo && m.alvo > 0)
    return { type: 'sum', target: m.alvo, currency: !!m.emReais || !m.unidade, unit: m.emReais || !m.unidade ? 'R$' : m.unidade }
  if (m.tipo === 'value' && m.de !== undefined && m.para !== undefined && m.de !== m.para)
    return { type: 'value', from: m.de, to: m.para, unit: m.unidade ?? '' }
  if (m.tipo === 'milestones' && m.etapas?.length) return { type: 'milestones', items: m.etapas.map(title => ({ id: `m-${uid()}`, title })) }
  if (m.tipo === 'days') {
    const unit = m.contarEm === 'horas' ? 'horas' : 'dias'
    return {
      type: 'days',
      target: clampInt(m.alvo, 1, 1000, unit === 'horas' ? 50 : 30),
      unit,
      sessionMinutes: m.minutosPorSessao ? clampInt(m.minutosPorSessao, 5, 240, 30) : undefined,
    }
  }
  return { type: 'frequency', min: 3, max: 3, noun: 'vezes' }
}

/** Transforma a proposta da IA num rascunho válido: área existente, prazo futuro, repetição e lembrete conferidos. */
export function fromProposal(p: MetaProposta, areas: Area[], today: string): GoalDraft {
  const active = areas.filter(area => !area.archived).sort((a, b) => a.order - b.order)
  const wanted = p.area.toLocaleLowerCase('pt-BR')
  const area =
    active.find(item => item.name.toLocaleLowerCase('pt-BR') === wanted) ??
    active.find(item => wanted && item.name.toLocaleLowerCase('pt-BR').includes(wanted)) ??
    active[0]
  const yearEnd = `${today.slice(0, 4)}-12-31`
  const marco = p.ate.trim()
  // com marco, a data é opcional: só entra se a pessoa disse uma
  const deadline = p.prazo && p.prazo > today ? p.prazo : marco ? undefined : yearEnd > today ? yearEnd : shift(today, 90)
  const until = marco ? { type: 'event' as const, text: marco } : undefined
  // começo dito pela pessoa: de hoje em diante, e nunca depois da data final
  const startDate = p.inicio && p.inicio > today && (!deadline || p.inicio <= deadline) ? p.inicio : undefined
  const metric = toMetric(p.medida)
  return {
    title: p.titulo,
    areaId: area?.id ?? '',
    // se a IA escapar uma data aaaa-mm-dd no texto, ela vira "31 de março de 2027"
    description: p.descricao.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, date => fmt(date, "d 'de' MMMM 'de' yyyy")),
    metric,
    startingPoint: p.pontoDePartida === 'A definir' ? '' : p.pontoDePartida,
    achievableNote: p.alcancavel,
    why: p.porQue,
    deadline,
    until,
    startDate,
    taskTitle: p.tarefa || p.titulo,
    reminder: p.lembrete ? { on: true, time: p.lembrete } : { on: false, time: '08:00' },
    repeat: p.diasDaTarefa.length
      ? { freq: 'weekly', interval: 1, weekdays: p.diasDaTarefa, start: startDate ?? today, end: repeatEndFor({ deadline, until }) }
      : null,
  }
}

export const deadlineText = (date: string) => fmt(date, "d 'de' MMMM 'de' yyyy")

/**
 * "Até quando", em texto: a data, ou o marco (com a data estimada, se houver).
 * Ex.: "31 de dezembro de 2026", "Até passar no concurso (estimativa: 30 de junho de 2027)".
 */
export function untilLabel(goal: Pick<Goal, 'deadline' | 'until'>, goals: Goal[]) {
  if (!goal.until) return goal.deadline ? cap(deadlineText(goal.deadline)) : ''
  const marco = `Até ${untilText(goal, goals)}`
  return goal.deadline ? `${marco} (estimativa: ${deadlineText(goal.deadline)})` : marco
}

/** A meta salva no formato de rascunho (para comparar com a proposta de ajuste). */
export function goalToDraft(goal: Goal, rule?: RecurringTask): GoalDraft {
  return {
    title: goal.title,
    areaId: goal.areaId,
    description: goal.description,
    metric: goal.metric,
    startingPoint: goal.startingPoint,
    achievableNote: goal.achievableNote,
    why: goal.why,
    deadline: goal.deadline,
    until: goal.until,
    taskTitle: goal.taskTitle,
    reminder: goal.reminder,
    art: goal.art,
    repeat: rule?.repeat ?? null,
  }
}

/**
 * A meta em texto, para a Esther saber o que existe antes de ajustar.
 * Com `status`, inclui como ela está indo: progresso, ritmo e o que falta para voltar ao ritmo.
 */
export function goalSummary(goal: Goal, areaName: string, goals: Goal[], rule?: RecurringTask, status?: { progress: Progress; pace: Pace }) {
  const marco =
    goal.until?.type === 'goal'
      ? ' (marco ligado a outra meta: a meta termina sozinha quando ela for concluída; trocar isso é em "Editar campos")'
      : goal.until
        ? ' (marco em texto: a pessoa toca em "Marco atingido" na página da meta quando acontecer)'
        : ''
  const until = goal.until
    ? `vale até ${untilText(goal, goals)}${goal.deadline ? `, data estimada ${goal.deadline}` : ', sem data'}${marco}`
    : `prazo: ${goal.deadline}`
  const situation = status
    ? [
        `Progresso agora: ${status.progress.label}${status.progress.extra ? `; ${status.progress.extra.label}` : ''}`,
        `Ritmo: ${status.pace.label}. ${status.pace.explanation}`,
        status.pace.catchUp ? `Para ficar no ritmo: ${status.pace.catchUp}` : '',
        status.progress.concluded ? 'A meta já está concluída (o marco aconteceu). As tarefas dela saíram da agenda.' : '',
      ]
    : []
  return [
    `Título: ${goal.title}`,
    `Área: ${areaName}`,
    `Específica: ${goal.description || '(em branco)'}`,
    `Mensurável: ${describeMetric(goal.metric)}`,
    `Ponto de partida: ${goal.startingPoint || '(em branco)'}`,
    `Por que é alcançável: ${goal.achievableNote || '(em branco)'}`,
    `Por que importa: ${goal.why || '(em branco)'}`,
    `Começou em: ${goal.startDate}; ${until}`,
    `Tarefa do dia: ${goal.taskTitle}${rule ? `, na agenda: ${describe(rule.repeat)}` : ', sem dias fixos'}`,
    `Lembrete: ${goal.reminder.on ? goal.reminder.time : 'desligado'}`,
    ...situation,
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * Ajuste da Esther: o que não mudou de verdade fica exatamente como estava na meta.
 * - Campos estruturais (medida, prazo, dias, lembrete, área) entram quando mudaram de fato.
 * - Os textos de "Específica" e "Alcançável" descrevem a medida e o prazo: acompanham quando eles mudam.
 * - Título, motivo, ponto de partida e nome da tarefa só mudam se a Esther disser que mudou de propósito
 *   (o modelo costuma reescrever com outras palavras sem a pessoa ter pedido).
 */
export function onlyChanged(proposal: GoalDraft, before: GoalDraft, listed: CampoMeta[]): GoalDraft {
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
  const weekdays = (draft: GoalDraft) => (draft.repeat ? [...(draft.repeat.weekdays ?? [])].sort().join(',') + draft.repeat.freq + draft.repeat.interval : '')
  const structural: CampoMeta[] = [
    ...(!same(
      proposal.metric.type === before.metric.type && proposal.metric.type === 'milestones' ? proposal.metric.items.map(item => item.title) : proposal.metric,
      before.metric.type === 'milestones' ? before.metric.items.map(item => item.title) : before.metric,
    )
      ? (['medida'] as const)
      : []),
    ...(proposal.deadline !== before.deadline || !same(proposal.until, before.until) ? (['prazo'] as const) : []),
    ...(weekdays(proposal) !== weekdays(before) ? (['diasDaTarefa'] as const) : []),
    ...(!same(proposal.reminder, before.reminder) ? (['lembrete'] as const) : []),
    ...(proposal.areaId !== before.areaId ? (['area'] as const) : []),
  ]
  const changed = new Set<CampoMeta>([...structural, ...listed])
  if (changed.has('medida') || changed.has('prazo')) {
    changed.add('descricao')
    changed.add('alcancavel')
  }
  const has = (campo: CampoMeta) => changed.has(campo)
  return {
    ...before,
    title: has('titulo') ? proposal.title : before.title,
    areaId: has('area') ? proposal.areaId : before.areaId,
    description: has('descricao') ? proposal.description : before.description,
    metric: has('medida') ? proposal.metric : before.metric,
    startingPoint: has('pontoDePartida') ? proposal.startingPoint : before.startingPoint,
    achievableNote: has('alcancavel') ? proposal.achievableNote : before.achievableNote,
    why: has('porQue') ? proposal.why : before.why,
    deadline: has('prazo') ? proposal.deadline : before.deadline,
    until: has('prazo') ? keepReached(proposal.until, before.until) : before.until,
    taskTitle: has('tarefa') ? proposal.taskTitle : before.taskTitle,
    reminder: has('lembrete') ? proposal.reminder : before.reminder,
    // a agenda acompanha o novo prazo (ou o marco), mesmo quando os dias não mudam
    repeat: has('diasDaTarefa')
      ? proposal.repeat
      : before.repeat && has('prazo') && before.repeat.end.type !== 'count'
        ? { ...before.repeat, end: repeatEndFor(proposal) }
        : before.repeat,
  }
}

/** O marco em texto não perde a data em que foi atingido só porque a Esther reescreveu a meta. */
function keepReached(next: GoalUntil | undefined, previous: GoalUntil | undefined): GoalUntil | undefined {
  if (next?.type !== 'event' || previous?.type !== 'event' || next.reachedOn || !previous.reachedOn) return next
  return next.text.trim().toLocaleLowerCase('pt-BR') === previous.text.trim().toLocaleLowerCase('pt-BR') ? { ...next, reachedOn: previous.reachedOn } : next
}

/**
 * Ajuste aceito: as etapas com o mesmo nome mantêm o id antigo,
 * para as que já foram concluídas continuarem marcadas.
 */
export function keepMilestoneIds(next: Metric, previous: Metric): Metric {
  if (next.type !== 'milestones' || previous.type !== 'milestones') return next
  const byTitle = new Map(previous.items.map(item => [item.title.trim().toLocaleLowerCase('pt-BR'), item.id]))
  return { ...next, items: next.items.map(item => ({ ...item, id: byTitle.get(item.title.trim().toLocaleLowerCase('pt-BR')) ?? item.id })) }
}
