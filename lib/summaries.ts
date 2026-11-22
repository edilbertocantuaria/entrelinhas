import { endOfMonth, endOfQuarter, getQuarter, parseISO, startOfMonth, startOfQuarter, subMonths, subQuarters } from 'date-fns'
import { cap, fmt, iso, num, plural } from './format'
import { inRange, periodStats, type PeriodStats } from './goals'
import type { AppData, Summary } from './types'

type Data = Pick<AppData, 'goals' | 'logs' | 'tasks' | 'journal'>

export function periodLabel(summary: { kind: string; start: string }) {
  if (summary.kind === 'quarterly') return `${getQuarter(parseISO(summary.start))}º trimestre de ${summary.start.slice(0, 4)}`
  return cap(fmt(summary.start, "MMMM 'de' yyyy"))
}

/** "outubro" ou "3º trimestre", para o aviso em Hoje */
export function periodShort(summary: { kind: string; start: string }) {
  if (summary.kind === 'quarterly') return `${getQuarter(parseISO(summary.start))}º trimestre`
  return fmt(summary.start, 'MMMM')
}

export const KIND_LABEL = { monthly: 'Mensal', quarterly: 'Trimestral', annual: 'Anual' } as const

const TITLES = {
  monthly: ['Um mês de passos possíveis', 'Um mês no seu ritmo', 'Um mês de continuidade'],
  quarterly: ['Um trimestre de caminho feito', 'Três meses no seu ritmo', 'Um trimestre de continuidade'],
}

const list = (items: string[]) =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`

/**
 * Texto de exemplo no lugar da chamada de IA. Usa os mesmos insumos que a geração real usaria:
 * diário, humor, registros das metas, estados das tarefas e ritmo.
 */
export function mockNarrative(kind: 'monthly' | 'quarterly', start: string, stats: PeriodStats, variant: number, useAI: boolean) {
  const period = kind === 'monthly' ? cap(fmt(start, 'MMMM')) : 'O trimestre'
  const advanced = stats.advanced.map(item => `${item.goal.title.toLocaleLowerCase('pt-BR')} (${item.text})`)
  const stalled = stats.stalled.map(goal => goal.title.toLocaleLowerCase('pt-BR'))
  const mood = stats.moodAverage ? num(stats.moodAverage, 1) : null
  const days = `${stats.journalDays} ${plural(stats.journalDays, 'dia', 'dias')}`
  const done = `${stats.tasks.done} ${plural(stats.tasks.done, 'tarefa feita', 'tarefas feitas')}`

  if (!useAI) {
    return [
      `${period} em números: ${days} com diário e ${done}.`,
      advanced.length ? `Avançaram: ${list(advanced)}.` : '',
      stalled.length ? `Sem registros no período: ${list(stalled)}.` : '',
      mood ? `Humor médio de ${mood} em 5.` : '',
    ]
      .filter(Boolean)
      .join(' ')
  }

  const later = stalled.length
    ? `${cap(list(stalled))} ${plural(stalled.length, 'ficou', 'ficaram')} para depois, e tudo bem.`
    : 'Nenhuma meta ficou sem movimento.'
  const versions = [
    [
      `${period} teve ${days} com registro no diário e ${done}.`,
      advanced.length ? `O que andou: ${list(advanced)}.` : 'Foi um período mais quieto para as metas.',
      later,
      mood ? `Seu humor ficou, em média, em ${mood} de 5.` : '',
      'O próximo período começa com espaço para escolher de novo.',
    ],
    [
      advanced.length ? `Neste período você cuidou de ${list(advanced)}.` : 'Este foi um período de pausa nas metas.',
      `Você escreveu no diário em ${days} e concluiu ${done}.`,
      stats.tasks.dismissed ? `${stats.tasks.dismissed} ${plural(stats.tasks.dismissed, 'tarefa foi dispensada', 'tarefas foram dispensadas')}, o que também é uma forma de se cuidar.` : '',
      later,
      'Vale levar adiante o que funcionou, do seu jeito.',
    ],
    [
      `${period} foi feito de passos pequenos e seguidos.`,
      advanced.length ? `Entre eles: ${list(advanced)}.` : '',
      mood ? `O humor girou em torno de ${mood} de 5, com dias mais leves e outros mais cheios.` : `Foram ${days} de diário.`,
      later,
    ],
  ]
  return versions[variant % versions.length].filter(Boolean).join(' ')
}

export function buildSummary(data: Data, kind: 'monthly' | 'quarterly', start: string, end: string, today: string, useAI: boolean, variant = 0): Summary {
  const stats = periodStats(data, start, end)
  const id = kind === 'monthly' ? `s-${start.slice(0, 7)}` : `s-${start.slice(0, 4)}-q${getQuarter(parseISO(start))}`
  return {
    id,
    kind,
    start,
    end,
    title: TITLES[kind][variant % 3],
    // com IA ligada, este texto é só o provisório até a resposta chegar (veja components/summary-ai.tsx)
    narrative: mockNarrative(kind, start, stats, variant, false),
    generatedAt: today,
    pinned: false,
    edited: false,
    seen: false,
    usedAI: false,
    aiStatus: useAI ? 'pending' : undefined,
    variant,
    reflections: {},
  }
}

/** Nova versão só com os números, para quando a IA está desligada ou fora do ar. */
export function regenerate(data: Data, summary: Summary, today: string): Partial<Summary> {
  const variant = summary.variant + 1
  const stats = periodStats(data, summary.start, summary.end)
  return {
    variant,
    title: TITLES[summary.kind][variant % 3],
    narrative: mockNarrative(summary.kind, summary.start, stats, variant, false),
    generatedAt: today,
    edited: false,
    usedAI: false,
    aiStatus: undefined,
  }
}

const hasData = (data: Data, start: string, end: string) =>
  data.logs.some(log => inRange(log.date, start, end)) || data.journal.some(entry => inRange(entry.date, start, end))

export const monthRange = (date: string) => {
  const d = parseISO(date)
  return { start: iso(startOfMonth(d)), end: iso(endOfMonth(d)) }
}

/** Penúltima quinta-feira de dezembro: 24/12 em 2026, 23/12 em 2027. */
export function penultimateThursday(year: number) {
  const day = new Date(year, 11, 31)
  while (day.getDay() !== 4) day.setDate(day.getDate() - 1)
  day.setDate(day.getDate() - 7)
  return iso(day)
}

export const retroTrigger = (settings: AppData['settings'], year: number) =>
  settings.retroDate && settings.retroDate.startsWith(String(year)) ? settings.retroDate : penultimateThursday(year)

/** "Gerar agora" do mês fica disponível nos 3 últimos dias. */
export const inLastDaysOfMonth = (today: string) => {
  const d = parseISO(today)
  return endOfMonth(d).getDate() - d.getDate() <= 2
}

/**
 * Roda ao abrir o app. Se o app não foi aberto no dia do gatilho, gera na próxima abertura.
 * - mensal: no 1º dia do mês seguinte
 * - trimestral: depois de março, junho, setembro e dezembro
 * - retrospectiva: na data configurada
 */
export function dueSummaries(data: AppData, today: string, time: string): { summaries: Summary[]; retroYear: number | null } {
  const { settings } = data
  const d = parseISO(today)
  const out: Summary[] = []
  const exists = (id: string) => data.summaries.some(summary => summary.id === id) || out.some(summary => summary.id === id)

  if (settings.monthlyAuto) {
    const start = iso(startOfMonth(subMonths(d, 1)))
    const end = iso(endOfMonth(subMonths(d, 1)))
    if (!exists(`s-${start.slice(0, 7)}`) && hasData(data, start, end)) out.push(buildSummary(data, 'monthly', start, end, today, settings.useAI))
  }
  if (settings.quarterlyAuto) {
    const previous = subQuarters(d, 1)
    const start = iso(startOfQuarter(previous))
    const end = iso(endOfQuarter(previous))
    if (!exists(`s-${start.slice(0, 4)}-q${getQuarter(previous)}`) && hasData(data, start, end))
      out.push(buildSummary(data, 'quarterly', start, end, today, settings.useAI))
  }

  let retroYear: number | null = null
  if (settings.retroEnabled) {
    const year = d.getFullYear()
    const trigger = retroTrigger(settings, year)
    const due = today > trigger || (today === trigger && time >= settings.retroTime)
    if (due && !data.retros[year]?.announced) retroYear = year
  }
  return { summaries: out, retroYear }
}

export const REFLECTION_PROMPTS = [
  { key: 'keep', label: 'O que você quer manter?' },
  { key: 'lighter', label: 'O que pode ficar mais leve?' },
  { key: 'step', label: 'Qual é um primeiro passo pequeno?' },
]
