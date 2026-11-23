import { differenceInCalendarMonths, parseISO } from 'date-fns'
import { brl, cap, daysBetween, fmt, minutesLabel, mondayOf, num, num1, plural, shift } from '@/shared/format'
import { PERIOD, periodEnd, periodLength, periodStart, previousPeriod } from '@/domain/periods'
import type { FrequencyPeriod, Goal, JournalEntry, LogEntry, Metric, MetricType, Task } from '@/domain/types'

export const METRIC_LABEL: Record<MetricType, { name: string; hint: string }> = {
  frequency: { name: 'Frequência', hint: 'Vezes ou horas por semana, mês, bimestre, trimestre ou ano. Ex.: academia 3 a 4x por semana.' },
  sum: { name: 'Soma até um alvo', hint: 'Valores que se acumulam. Ex.: guardar R$ 5.000.' },
  value: { name: 'Valor ao longo do tempo', hint: 'De um número a outro. Ex.: 85 kg para 78 kg.' },
  milestones: { name: 'Etapas', hint: 'Uma lista de passos. Ex.: concluir um projeto.' },
  days: { name: 'Dias ou tempo', hint: 'Dias feitos ou horas dedicadas. Ex.: estudar todo dia.' },
}

export const inRange = (date: string, start: string, end: string) => date >= start && date <= end
const clamp = (value: number) => Math.max(0, Math.min(1, value))

export const logsOf = (logs: LogEntry[], goalId: string) => logs.filter(log => log.goalId === goalId).sort((a, b) => a.date.localeCompare(b.date))

export function amount(metric: Metric, value: number) {
  if (metric.type === 'sum') return metric.currency ? brl(value) : `${num1(value)} ${metric.unit}`
  if (metric.type === 'value') return `${num(value, 1)} ${metric.unit}`
  return num1(value)
}

/** id da etapa -> data em que foi concluída */
export function milestoneDates(goal: Goal, logs: LogEntry[]) {
  const done = new Map<string, string>()
  for (const log of logsOf(logs, goal.id)) if (log.milestoneId) done.set(log.milestoneId, log.date)
  return done
}

export function nextMilestone(goal: Goal, logs: LogEntry[]) {
  if (goal.metric.type !== 'milestones') return undefined
  const done = milestoneDates(goal, logs)
  return goal.metric.items.find(item => !done.has(item.id))
}

const uniqueDays = (logs: LogEntry[]) => new Set(logs.map(log => log.date)).size

type Frequency = Extract<Metric, { type: 'frequency' }>

/** Período da meta de frequência (as antigas, sem período, são por semana). */
export const freqPeriod = (m: Frequency): FrequencyPeriod => m.period ?? 'week'
export const inHours = (m: Frequency) => m.count === 'horas'

/**
 * Quanto a meta de frequência somou no intervalo: dias com registro, ou horas registradas.
 * Contando vezes, valem dias, não registros: fitdance e calistenia no mesmo dia são 1 treino.
 * Os dois registros continuam guardados (e aparecem no módulo Fitness).
 */
function freqAmount(m: Frequency, logs: LogEntry[], start: string, end: string) {
  const inside = logs.filter(log => inRange(log.date, start, end))
  return inHours(m) ? inside.reduce((sum, log) => sum + (log.value ?? 0), 0) / 60 : uniqueDays(inside)
}

/** "3 a 4 treinos", "20 horas" */
export function freqRange(m: Frequency) {
  const range = m.min === m.max ? num1(m.min) : `${num1(m.min)} a ${num1(m.max)}`
  return `${range} ${inHours(m) ? 'horas' : m.noun}`
}

/** "3 a 4 treinos por semana", "20 a 30 horas por mês" */
export const describeFrequency = (m: Frequency) => `${freqRange(m)} ${PERIOD[freqPeriod(m)].per}`

export interface Progress {
  /** 0 a 1 */
  ratio: number
  label: string
  current: number
  /** meta encerrada pelo marco: o indicador aparece cheio, seja qual for a medida */
  concluded?: boolean
}

/**
 * Progresso da meta no dia. Meta com marco que já aconteceu está concluída: 100%,
 * com a data do marco no texto. `goals` é preciso para o marco que é outra meta.
 */
export function progressOf(goal: Goal, allLogs: LogEntry[], today: string, goals: Goal[] = []): Progress {
  const base = metricProgress(goal, allLogs, today)
  if (!goal.until) return base
  const reached = finishedOn(goal, goals, allLogs)
  if (!reached || reached > today) return base
  return { ratio: 1, current: base.current, label: `Concluída: marco atingido em ${fmt(reached, "d 'de' MMM 'de' yyyy")}`, concluded: true }
}

/** Progresso só pela medida (sem olhar o marco). */
function metricProgress(goal: Goal, allLogs: LogEntry[], today: string): Progress {
  const logs = logsOf(allLogs, goal.id).filter(log => log.date <= today)
  const m = goal.metric
  switch (m.type) {
    case 'frequency': {
      const period = freqPeriod(m)
      const count = freqAmount(m, logs, periodStart(today, period), today)
      const range = m.min === m.max ? num1(m.min) : `${num1(m.min)} a ${num1(m.max)}`
      const unit = inHours(m) ? ' horas' : ''
      return { ratio: clamp(count / m.min), current: count, label: `${num1(count)} de ${range}${unit} ${PERIOD[period].current}` }
    }
    case 'sum': {
      const total = logs.reduce((sum, log) => sum + (log.value ?? 0), 0)
      return { ratio: clamp(total / m.target), current: total, label: `${amount(m, total)} de ${amount(m, m.target)}` }
    }
    case 'value': {
      const latest = [...logs].reverse().find(log => log.value !== undefined)?.value ?? m.from
      const span = m.from - m.to
      return {
        ratio: span === 0 ? 1 : clamp((m.from - latest) / span),
        current: latest,
        label: `${amount(m, latest)} agora, rumo a ${amount(m, m.to)}`,
      }
    }
    case 'milestones': {
      const done = milestoneDates(goal, logs).size
      const total = m.items.length
      return { ratio: total ? clamp(done / total) : 0, current: done, label: `${done} de ${total} etapas` }
    }
    case 'days': {
      if (m.unit === 'horas') {
        const hours = logs.reduce((sum, log) => sum + (log.value ?? 0), 0) / 60
        return { ratio: clamp(hours / m.target), current: hours, label: `${num1(hours)} de ${m.target} horas` }
      }
      const days = uniqueDays(logs)
      return { ratio: clamp(days / m.target), current: days, label: `${days} de ${m.target} dias` }
    }
  }
}

// ---------- Até quando a meta vale ----------

/** Dia em que a medida chegou a 100%. Metas de frequência não terminam sozinhas. */
export function completedOn(goal: Goal, allLogs: LogEntry[]): string | undefined {
  if (goal.metric.type === 'frequency') return undefined
  const dates = [...new Set(logsOf(allLogs, goal.id).map(log => log.date))]
  return dates.find(date => metricProgress(goal, allLogs, date).ratio >= 1)
}

/**
 * Dia em que a meta terminou. Com marco: quando ele aconteceu (marcado à mão, ou a meta ligada
 * foi concluída). Sem marco: quando a medida chegou a 100%.
 */
export function finishedOn(goal: Goal, goals: Goal[], allLogs: LogEntry[], seen: Set<string> = new Set()): string | undefined {
  const until = goal.until
  if (!until) return completedOn(goal, allLogs)
  if (until.type === 'event') return until.reachedOn
  // uma meta ligada a outra que volta a ela mesma nunca termina sozinha
  if (seen.has(goal.id)) return undefined
  const linked = goals.find(item => item.id === until.goalId)
  return linked ? finishedOn(linked, goals, allLogs, new Set(seen).add(goal.id)) : undefined
}

/** Dia em que o marco da meta aconteceu (só para metas com marco). */
export const marcoReachedOn = (goal: Goal, goals: Goal[], allLogs: LogEntry[]) => (goal.until ? finishedOn(goal, goals, allLogs) : undefined)

/** A meta vale neste dia? Já começou e não passou do prazo nem do marco. */
export function isActiveOn(goal: Goal, goals: Goal[], allLogs: LogEntry[], date: string) {
  if (date < goal.startDate) return false
  if (goal.until) {
    const reached = finishedOn(goal, goals, allLogs)
    return !reached || date < reached
  }
  return !goal.deadline || date <= goal.deadline
}

/** O marco em texto, para "Até ...": "passar no concurso", "concluir “Chegar a 78 kg”". */
export function untilText(goal: Pick<Goal, 'until'>, goals: Goal[]) {
  const until = goal.until
  if (!until) return ''
  if (until.type === 'event') return until.text
  const linked = goals.find(item => item.id === until.goalId)
  return linked ? `concluir “${linked.title}”` : 'concluir a meta ligada'
}

/** Metas que podem servir de marco para `goalId`: têm um fim (não são de frequência) e não voltam a ela. */
export function marcoCandidates(goals: Goal[], goalId?: string) {
  const leadsBack = (goal: Goal, seen = new Set<string>()): boolean => {
    if (!goalId || goal.until?.type !== 'goal' || seen.has(goal.id)) return false
    if (goal.until.goalId === goalId) return true
    const next = goals.find(item => item.id === (goal.until as { goalId: string }).goalId)
    return next ? leadsBack(next, new Set(seen).add(goal.id)) : false
  }
  return goals.filter(goal => goal.id !== goalId && (goal.until || goal.metric.type !== 'frequency') && !leadsBack(goal))
}

export type PaceStatus = 'ontrack' | 'ahead' | 'behind' | 'done'
export const PACE_LABEL: Record<PaceStatus, string> = {
  ontrack: 'no ritmo',
  ahead: 'adiantado',
  behind: 'um pouco atrás',
  done: 'concluída',
}

export interface Pace {
  status: PaceStatus
  label: string
  explanation: string
}

/**
 * Progresso comparado com o tempo passado. Na primeira semana da meta, sempre "no ritmo":
 * antes, uma meta de um mês ficava "atrás" já no segundo dia sem registro.
 */
const byRatio = (progress: number, time: number, elapsedDays: number): PaceStatus => {
  if (progress >= 1) return 'done'
  if (time <= 0.02 || elapsedDays < 7) return 'ontrack'
  const ratio = progress / time
  return ratio >= 1.1 ? 'ahead' : ratio >= 0.8 ? 'ontrack' : 'behind'
}

/**
 * Ritmo das metas de frequência, em qualquer período e contando vezes ou horas.
 * - Olha os últimos períodos completos (4 semanas, 3 meses, 2 bimestres ou trimestres, 1 ano).
 * - O primeiro período, se a meta começou no meio dele, cobra só a parte proporcional.
 * - O período atual só entra a favor: quando já chegou ao mínimo.
 * - Fica "no ritmo" quem cumpriu em 3 de cada 4 períodos OU teve média de pelo menos 90% do mínimo
 *   (antes, média igual ao combinado podia aparecer como "atrás").
 */
function frequencyPace(goal: Goal, m: Frequency, logs: LogEntry[], dismissed: Task[], today: string): { status: PaceStatus; explanation: string } {
  const period = freqPeriod(m)
  const info = PERIOD[period]
  const hours = inHours(m)
  const unit = hours ? 'horas' : m.noun
  const show = (value: number) => num1(value)
  const current = periodStart(today, period)
  const nowFrom = current < goal.startDate ? goal.startDate : current
  const nowAmount = freqAmount(m, logs, nowFrom, today)

  const samples: { amount: number; required: number; share: number; skipped: number }[] = []
  for (let start = previousPeriod(current, period), i = 0; i < info.lookback; start = previousPeriod(start, period), i++) {
    const end = periodEnd(start, period)
    if (end < goal.startDate) break
    const from = start < goal.startDate ? goal.startDate : start
    const share = (daysBetween(from, end) + 1) / periodLength(start, period)
    const skipped = hours ? 0 : dismissed.filter(task => inRange(task.date, from, end)).length
    samples.push({ amount: freqAmount(m, logs, from, end), required: Math.max(0, m.min * share - skipped), share, skipped })
  }

  if (!samples.length) {
    const end = periodEnd(current, period)
    const elapsed = (daysBetween(nowFrom, today) + 1) / (daysBetween(nowFrom, end) + 1)
    const share = (daysBetween(nowFrom, end) + 1) / periodLength(current, period)
    const expected = m.min * share * elapsed
    // semana: a primeira é sempre de adaptação; nos períodos longos, compara com o esperado até hoje
    const status: PaceStatus = nowAmount >= m.max * share ? 'ahead' : period === 'week' || elapsed < 0.25 || nowAmount >= expected * 0.8 ? 'ontrack' : 'behind'
    const sofar =
      period === 'week' ? '' : ` Até agora: ${show(nowAmount)} ${unit}; o esperado para este ponto é cerca de ${show(Math.ceil(expected * 10) / 10)}.`
    return { status, explanation: `${info.first} da meta. O combinado é de ${freqRange(m)} ${info.per}.${sofar}` }
  }

  const currentMet = nowAmount >= m.min
  const judged = currentMet ? [...samples, { amount: nowAmount, required: m.min, share: 1, skipped: 0 }] : samples
  const met = judged.filter(sample => sample.amount >= sample.required - 1e-9).length
  // a média usa só os períodos em que a meta valeu pelo menos metade do tempo, ajustados ao período inteiro
  const full = samples.filter(sample => sample.share >= 0.5)
  const average = full.length ? full.reduce((sum, sample) => sum + sample.amount / sample.share, 0) / full.length : undefined
  const status: PaceStatus =
    average !== undefined && average >= m.max
      ? 'ahead'
      : met / judged.length >= 0.75 || (average !== undefined && average >= m.min * 0.9)
        ? 'ontrack'
        : 'behind'

  const skipped = samples.reduce((sum, sample) => sum + sample.skipped, 0)
  const parts = [
    average !== undefined
      ? `${info.last(full.length)}, a média foi de ${show(average)} ${unit} ${info.per}.`
      : `${info.last(samples.length)}: ${show(samples[0].amount)} ${unit}, num período que a meta pegou só em parte.`,
    `O combinado é de ${freqRange(m)}.`,
    skipped ? `${skipped} ${plural(skipped, 'dispensa não entra', 'dispensas não entram')} na conta.` : '',
    currentMet ? `${cap(info.current)} você já chegou ao mínimo.` : `${cap(info.current)}: ${show(nowAmount)} ${unit} até agora.`,
  ]
  return { status, explanation: parts.filter(Boolean).join(' ') }
}

/**
 * Ritmo da meta. Tarefas dispensadas nunca contam contra o ritmo.
 * Metas com marco: encerram quando ele acontece; sem data estimada, o ritmo de quem
 * não é de frequência não tem relógio para comparar.
 */
export function paceOf(goal: Goal, allLogs: LogEntry[], tasks: Task[], today: string, goals: Goal[]): Pace {
  // o marco é tratado logo abaixo; a conta do ritmo usa só a medida
  const progress = metricProgress(goal, allLogs, today)
  const logs = logsOf(allLogs, goal.id)
  const m = goal.metric
  const make = (status: PaceStatus, explanation: string): Pace => ({ status, label: PACE_LABEL[status], explanation })

  if (goal.until) {
    const reached = finishedOn(goal, goals, allLogs)
    if (reached && reached <= today)
      return make('done', `O marco chegou em ${fmt(reached, "d 'de' MMMM 'de' yyyy")}: ${untilText(goal, goals)}. A meta está encerrada.`)
  }
  if (!goal.deadline && m.type !== 'frequency') {
    const marco = untilText(goal, goals)
    return make('ontrack', `${cap(progress.label)}. Sem data marcada: a meta segue até ${marco || 'o marco acontecer'}.`)
  }

  // daqui em diante, só metas de frequência podem estar sem data, e elas não usam o prazo
  const deadline = goal.deadline ?? today
  const span = Math.max(1, daysBetween(goal.startDate, deadline))
  const elapsedDays = daysBetween(goal.startDate, today)
  const time = clamp(elapsedDays / span)
  const pace = (ratio: number) => byRatio(ratio, time, elapsedDays)
  const daysLeft = Math.max(0, daysBetween(today, deadline))
  const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7))
  const dismissed = tasks.filter(task => task.goalId === goal.id && task.status === 'dismissed')

  switch (m.type) {
    case 'frequency': {
      const { status, explanation } = frequencyPace(goal, m, logs, dismissed, today)
      return make(status, explanation)
    }
    case 'sum': {
      const remaining = m.target - progress.current
      if (remaining <= 0) return make('done', 'Você chegou ao valor que definiu.')
      const months = Math.max(1, differenceInCalendarMonths(parseISO(deadline), parseISO(today)) + 1)
      return make(pace(progress.ratio), `Faltam ${amount(m, remaining)} em ${months} ${plural(months, 'mês', 'meses')} = ${amount(m, remaining / months)}/mês.`)
    }
    case 'value': {
      const remaining = Math.abs(progress.current - m.to)
      if (progress.ratio >= 1) return make('done', 'Você chegou ao valor que definiu.')
      return make(
        pace(progress.ratio),
        `Faltam ${num(remaining, 1)} ${m.unit} em ${weeksLeft} ${plural(weeksLeft, 'semana', 'semanas')} = ${num(remaining / weeksLeft, 1)} ${m.unit} por semana.`,
      )
    }
    case 'milestones': {
      const remaining = m.items.length - progress.current
      if (remaining <= 0) return make('done', 'Todas as etapas estão concluídas.')
      const next = nextMilestone(goal, allLogs)
      return make(
        pace(progress.ratio),
        `${plural(remaining, 'Falta', 'Faltam')} ${remaining} ${plural(remaining, 'etapa', 'etapas')} em ${weeksLeft} ${plural(weeksLeft, 'semana', 'semanas')}.${next ? ` A próxima é “${next.title}”.` : ''}`,
      )
    }
    case 'days': {
      const remaining = Math.max(0, m.target - progress.current)
      if (remaining <= 0) return make('done', 'Você completou o que definiu.')
      const what =
        m.unit === 'horas' ? `${num1(remaining)} ${plural(Math.ceil(remaining), 'hora', 'horas')}` : `${remaining} ${plural(remaining, 'dia', 'dias')}`
      return make(
        pace(progress.ratio),
        `${plural(Math.ceil(remaining), 'Falta', 'Faltam')} ${what}. ${plural(daysLeft, 'Resta', 'Restam')} ${daysLeft} ${plural(daysLeft, 'dia', 'dias')} no calendário até ${fmt(deadline, "d 'de' MMMM")}.`,
      )
    }
  }
}

/** Dias seguidos com registro, contando até hoje ou ontem. */
export function streakOf(goal: Goal, allLogs: LogEntry[], today: string) {
  const days = new Set(logsOf(allLogs, goal.id).map(log => log.date))
  let cursor = days.has(today) ? today : shift(today, -1)
  let streak = 0
  while (days.has(cursor)) {
    streak++
    cursor = shift(cursor, -1)
  }
  return streak
}

// ---------- Séries para os gráficos ----------

export function cumulativeSeries(goal: Goal, allLogs: LogEntry[]) {
  let total = 0
  const points = [{ date: goal.startDate, label: fmt(goal.startDate, 'd MMM'), total: 0 }]
  for (const log of logsOf(allLogs, goal.id)) {
    total += log.value ?? 0
    points.push({ date: log.date, label: fmt(log.date, 'd MMM'), total })
  }
  return points
}

export function valueSeries(goal: Goal, allLogs: LogEntry[]) {
  return logsOf(allLogs, goal.id)
    .filter(log => log.value !== undefined)
    .map(log => ({ date: log.date, label: fmt(log.date, 'd MMM'), value: log.value as number }))
}

/** Quantos períodos o gráfico de frequência mostra. */
const CHART_PERIODS: Record<FrequencyPeriod, number> = { week: 10, month: 6, bimester: 6, quarter: 4, year: 3 }
const PERIOD_TICK: Record<FrequencyPeriod, string> = { week: 'd/M', month: 'MMM', bimester: 'MMM', quarter: 'MMM yy', year: 'yyyy' }

/** Total de cada período (semanas, meses...), do mais antigo ao atual, para o gráfico de barras. */
export function periodCounts(goal: Goal, allLogs: LogEntry[], today: string) {
  const logs = logsOf(allLogs, goal.id)
  const m = goal.metric
  const period = m.type === 'frequency' ? freqPeriod(m) : 'week'
  const starts = [periodStart(today, period)]
  while (starts.length < CHART_PERIODS[period]) starts.unshift(previousPeriod(starts[0], period))
  return starts.map(start => {
    const end = periodEnd(start, period)
    return {
      start,
      week: fmt(start, PERIOD_TICK[period]),
      count: m.type === 'frequency' ? Math.round(freqAmount(m, logs, start, end) * 10) / 10 : logs.filter(log => inRange(log.date, start, end)).length,
    }
  })
}

/** Semanas (colunas) x dias (linhas), para o mapa de calor. */
export function heatmap(goal: Goal, allLogs: LogEntry[], today: string, weeks = 12) {
  const minutes = new Map<string, number>()
  for (const log of logsOf(allLogs, goal.id)) minutes.set(log.date, (minutes.get(log.date) ?? 0) + (log.value ?? 1))
  const first = shift(mondayOf(today), -7 * (weeks - 1))
  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = shift(first, week * 7 + day)
      return { date, minutes: minutes.get(date) ?? 0, future: date > today }
    }),
  )
}

// ---------- Sugestões de tarefas a partir das metas ----------

export interface Suggestion {
  key: string
  goalId: string
  milestoneId?: string
  title: string
  hint: string
}

/**
 * Tarefas que as metas recorrentes propõem para hoje.
 * Metas de soma não geram tarefa diária: só um lembrete mensal.
 */
export function suggestTasks(
  goals: Goal[],
  logs: LogEntry[],
  tasks: Task[],
  today: string,
  archivedAreas: Set<string>,
  scheduledGoals: Set<string> = new Set(),
): Suggestion[] {
  const out: Suggestion[] = []
  for (const goal of goals) {
    if (archivedAreas.has(goal.areaId) || !isActiveOn(goal, goals, logs, today)) continue
    // meta com tarefa que se repete: a agenda já cuida dela
    if (scheduledGoals.has(goal.id)) continue
    const open = tasks.some(task => task.goalId === goal.id && ((task.date === today && !task.later) || task.status === 'pending'))
    if (open) continue
    const mine = logsOf(logs, goal.id)
    const m = goal.metric
    const base = { key: goal.id, goalId: goal.id, title: goal.taskTitle || goal.title }
    if (m.type === 'frequency') {
      // já fez hoje: não sugere de novo; e o período conta dias (ou horas)
      if (mine.some(log => log.date === today)) continue
      const period = freqPeriod(m)
      const count = freqAmount(m, mine, periodStart(today, period), today)
      if (count < m.max) out.push({ ...base, hint: `${num1(count)} de ${freqRange(m)} ${PERIOD[period].current}` })
    } else if (m.type === 'days') {
      if (!mine.some(log => log.date === today)) out.push({ ...base, hint: m.sessionMinutes ? `Sessão de ${m.sessionMinutes} min` : 'Sessão de hoje' })
    } else if (m.type === 'value') {
      const last = mine.at(-1)?.date
      if (!last || daysBetween(last, today) >= 7) out.push({ ...base, hint: 'Medição da semana' })
    } else if (m.type === 'milestones') {
      const next = nextMilestone(goal, logs)
      if (next) out.push({ ...base, key: `${goal.id}:${next.id}`, milestoneId: next.id, title: next.title, hint: 'Próxima etapa' })
    } else if (m.type === 'sum') {
      const month = today.slice(0, 7)
      if (Number(today.slice(8)) >= 5 && !mine.some(log => log.date.startsWith(month))) out.push({ ...base, hint: 'Lembrete do mês' })
    }
  }
  return out
}

export const todayTasks = (tasks: Task[], today: string) =>
  tasks.filter(task => task.date === today && !task.later && (task.status === 'pending' || task.status === 'done'))

// ---------- Estatísticas de um período (resumos, revisão, retrospectiva) ----------

export interface PeriodStats {
  advanced: { goal: Goal; text: string; ratio: number }[]
  stalled: Goal[]
  tasks: { done: number; dismissed: number; notDone: number }
  moods: { date: string; label: string; mood: number }[]
  moodAverage: number | null
  quotes: { text: string; date: string }[]
  journalDays: number
}

const firstSentences = (text: string, max = 150) => {
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const stop = cut.lastIndexOf('. ')
  return stop > 40 ? cut.slice(0, stop + 1) : `${cut.slice(0, cut.lastIndexOf(' '))}…`
}

export function periodStats(data: { goals: Goal[]; logs: LogEntry[]; tasks: Task[]; journal: JournalEntry[] }, start: string, end: string): PeriodStats {
  const advanced: PeriodStats['advanced'] = []
  const stalled: Goal[] = []
  for (const goal of data.goals) {
    if (goal.startDate > end) continue
    const logs = logsOf(data.logs, goal.id).filter(log => inRange(log.date, start, end))
    if (!logs.length) {
      stalled.push(goal)
      continue
    }
    const m = goal.metric
    let text = ''
    let ratio = progressOf(goal, data.logs, end, data.goals).ratio
    if (m.type === 'frequency') {
      // o combinado proporcional ao intervalo (ex.: 3 por semana num mês = ~13)
      const from = start < goal.startDate ? goal.startDate : start
      const periods = (daysBetween(from, end) + 1) / PERIOD[freqPeriod(m)].avgDays
      const total = freqAmount(m, logs, from, end)
      text = `${num1(total)} ${inHours(m) ? plural(total, 'hora', 'horas') : m.noun}`
      ratio = clamp(total / Math.max(m.min * periods, 1e-9))
    } else if (m.type === 'sum') {
      text = `+ ${amount(
        m,
        logs.reduce((sum, log) => sum + (log.value ?? 0), 0),
      )}`
    } else if (m.type === 'value') {
      const first = logs[0].value ?? m.from
      const last = logs.at(-1)?.value ?? first
      text = logs.length > 1 ? `de ${num(first, 1)} para ${num(last, 1)} ${m.unit}` : `${num(last, 1)} ${m.unit}`
    } else if (m.type === 'milestones') {
      text = `${logs.length} ${plural(logs.length, 'etapa concluída', 'etapas concluídas')}`
    } else {
      const days = uniqueDays(logs)
      const minutes = logs.reduce((sum, log) => sum + (log.value ?? 0), 0)
      text = `${days} ${plural(days, 'dia', 'dias')}${minutes ? `, ${minutesLabel(minutes)}` : ''}`
    }
    advanced.push({ goal, text, ratio })
  }

  const tasks = data.tasks.filter(task => inRange(task.date, start, end))
  const entries = data.journal.filter(entry => inRange(entry.date, start, end)).sort((a, b) => a.date.localeCompare(b.date))
  const moods = entries
    .filter(entry => entry.mood !== undefined)
    .map(entry => ({ date: entry.date, label: fmt(entry.date, 'd/M'), mood: entry.mood as number }))
  const quotes = entries
    .filter(entry => entry.text.trim().length > 30)
    .sort((a, b) => (b.mood ?? 3) - (a.mood ?? 3) || b.text.length - a.text.length)
    .slice(0, 3)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(entry => ({ text: firstSentences(entry.text.trim()), date: entry.date }))

  return {
    advanced,
    stalled,
    tasks: {
      done: tasks.filter(task => task.status === 'done').length,
      dismissed: tasks.filter(task => task.status === 'dismissed').length,
      notDone: tasks.filter(task => task.status === 'not_done').length,
    },
    moods,
    moodAverage: moods.length ? moods.reduce((sum, item) => sum + item.mood, 0) / moods.length : null,
    quotes,
    journalDays: new Set(entries.filter(entry => entry.text.trim()).map(entry => entry.date)).size,
  }
}
