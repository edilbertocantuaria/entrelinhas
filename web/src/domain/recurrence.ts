import { differenceInCalendarMonths, getDaysInMonth, parseISO } from 'date-fns'
import { daysBetween, fmt, mondayOf, shift } from './format'
import type { Goal, RecurringTask, Repeat, Task } from './types'

export const WEEKDAYS = [
  { value: 1, short: 'seg', long: 'segunda' },
  { value: 2, short: 'ter', long: 'terça' },
  { value: 3, short: 'qua', long: 'quarta' },
  { value: 4, short: 'qui', long: 'quinta' },
  { value: 5, short: 'sex', long: 'sexta' },
  { value: 6, short: 'sáb', long: 'sábado' },
  { value: 0, short: 'dom', long: 'domingo' },
]

const weekday = (date: string) => parseISO(date).getDay()
const BUSINESS = [1, 2, 3, 4, 5]

/** O dia cai no padrão (sem olhar início, fim ou dias pulados)? */
function matches(repeat: Repeat, date: string) {
  const interval = Math.max(1, repeat.interval)
  if (repeat.freq === 'daily') return daysBetween(repeat.start, date) % interval === 0
  if (repeat.freq === 'weekly') {
    const days = repeat.weekdays?.length ? repeat.weekdays : [weekday(repeat.start)]
    if (!days.includes(weekday(date))) return false
    return Math.round(daysBetween(mondayOf(repeat.start), mondayOf(date)) / 7) % interval === 0
  }
  const d = parseISO(date)
  const wanted = repeat.monthDay ?? parseISO(repeat.start).getDate()
  const day = Math.min(wanted, getDaysInMonth(d))
  if (d.getDate() !== day) return false
  return differenceInCalendarMonths(d, parseISO(repeat.start)) % interval === 0
}

/** Quantas ocorrências houve do início até o dia, contando ele (para "depois de N vezes"). */
function indexOf(repeat: Repeat, date: string) {
  let count = 0
  // limite de segurança: até 3 anos de dias
  for (let day = repeat.start, i = 0; day <= date && i < 1100; day = shift(day, 1), i++) if (matches(repeat, day)) count++
  return count
}

export function occursOn(repeat: Repeat, date: string) {
  if (date < repeat.start) return false
  if (repeat.end.type === 'date' && date > repeat.end.date) return false
  if (!matches(repeat, date)) return false
  if (repeat.end.type === 'count' && indexOf(repeat, date) > repeat.end.count) return false
  return true
}

/** Regras ativas (com meta existente, se tiver) que acontecem no dia e não foram puladas. */
export function rulesOn(rules: RecurringTask[], goals: Goal[], date: string) {
  return rules.filter(rule => (!rule.goalId || goals.some(goal => goal.id === rule.goalId)) && !rule.skipped.includes(date) && occursOn(rule.repeat, date))
}

/**
 * Ocorrências planejadas para um dia que ainda não viraram tarefa.
 * Uma tarefa da mesma meta no mesmo dia já conta como a ocorrência.
 */
export function plannedOn(rules: RecurringTask[], goals: Goal[], tasks: Task[], date: string) {
  return rulesOn(rules, goals, date).filter(
    rule => !tasks.some(task => (task.ruleId === rule.id && task.occurrence === date) || (rule.goalId && task.goalId === rule.goalId && task.date === date)),
  )
}

const join = (items: string[]) => (items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`)

/** "Toda seg, qua e sex, até 31 de dez." */
export function describe(repeat: Repeat) {
  const n = Math.max(1, repeat.interval)
  let text: string
  if (repeat.freq === 'daily') text = n === 1 ? 'Todos os dias' : `A cada ${n} dias`
  else if (repeat.freq === 'weekly') {
    const days = [...(repeat.weekdays?.length ? repeat.weekdays : [weekday(repeat.start)])]
    const ordered = WEEKDAYS.filter(item => days.includes(item.value))
    if (n === 1 && days.length === 7) text = 'Todos os dias'
    else if (n === 1 && days.length === 5 && BUSINESS.every(day => days.includes(day))) text = 'Dias úteis (seg a sex)'
    else {
      const names = join(ordered.map(item => item.short))
      text = n === 1 ? `Toda ${names}` : `A cada ${n} semanas: ${names}`
    }
  } else {
    const day = repeat.monthDay ?? parseISO(repeat.start).getDate()
    text = n === 1 ? `Todo mês no dia ${day}` : `A cada ${n} meses no dia ${day}`
  }
  if (repeat.end.type === 'date') text += `, até ${fmt(repeat.end.date, "d 'de' MMM")}`
  if (repeat.end.type === 'count') text += `, ${repeat.end.count} ${repeat.end.count === 1 ? 'vez' : 'vezes'}`
  return text
}

/** Próximos dias em que a regra acontece, a partir de `from`. */
export function nextDates(rule: RecurringTask, from: string, limit = 3) {
  const out: string[] = []
  for (let day = from, i = 0; out.length < limit && i < 400; day = shift(day, 1), i++) if (!rule.skipped.includes(day) && occursOn(rule.repeat, day)) out.push(day)
  return out
}

/** Dias da semana sugeridos para "N vezes por semana", espalhados para dar descanso. */
const SPREAD: Record<number, number[]> = { 1: [1], 2: [2, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: BUSINESS, 6: [1, 2, 3, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6] }

/**
 * Repetição sugerida para a tarefa de uma meta nova. Nula quando a meta não pede tarefa fixa
 * (etapas de projeto e metas de soma, que têm só um lembrete mensal).
 */
export function suggestRepeat(goal: Pick<Goal, 'metric' | 'startDate' | 'deadline'>): Repeat | null {
  const base = { start: goal.startDate, end: { type: 'date' as const, date: goal.deadline }, interval: 1 }
  const m = goal.metric
  if (m.type === 'frequency') return { ...base, freq: 'weekly', weekdays: SPREAD[Math.min(7, Math.max(1, m.min))] }
  if (m.type === 'days') return { ...base, freq: 'weekly', weekdays: [1, 2, 3, 4, 5, 6] }
  if (m.type === 'value') return { ...base, freq: 'weekly', weekdays: [1] }
  return null
}

/** Metas com tarefa que se repete: não entram nas sugestões da abertura do dia. */
export const scheduledGoals = (rules: RecurringTask[]) => new Set(rules.map(rule => rule.goalId).filter((id): id is string => !!id))

/** Repetição padrão quando não há sugestão: toda segunda, para a pessoa ajustar. */
export const defaultRepeat = (start: string): Repeat => ({ freq: 'weekly', interval: 1, weekdays: [1], start, end: { type: 'never' } })
