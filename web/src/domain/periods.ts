import { addMonths, parseISO } from 'date-fns'
import { daysBetween, iso, mondayOf, shift } from '@/shared/format'
import type { FrequencyPeriod } from '@/domain/types'

/**
 * Períodos das metas de frequência ("3 a 4 vezes por semana", "10 horas por mês"...).
 * Semana começa na segunda; os demais seguem o calendário (bimestre jan-fev, trimestre jan-mar).
 */
export const PERIODS: FrequencyPeriod[] = ['week', 'month', 'bimester', 'quarter', 'year']

interface PeriodInfo {
  /** meses do período (0 = semana) */
  months: number
  /** dias de um período típico, para comparar intervalos de tamanho diferente */
  avgDays: number
  /** quantos períodos completos o ritmo olha para trás */
  lookback: number
  /** maior quantidade de dias com registro num período */
  maxDays: number
  name: string
  per: string
  current: string
  plural: string
  first: string
  /** "Na última semana", "Nas últimas 3 semanas", "No último mês"... */
  last: (count: number) => string
}

const masc = (one: string, many: string) => (count: number) => (count === 1 ? `No último ${one}` : `Nos últimos ${count} ${many}`)

export const PERIOD: Record<FrequencyPeriod, PeriodInfo> = {
  week: {
    months: 0,
    avgDays: 7,
    lookback: 4,
    maxDays: 7,
    name: 'Semana',
    per: 'por semana',
    current: 'nesta semana',
    plural: 'semanas',
    first: 'Primeira semana',
    last: count => (count === 1 ? 'Na última semana' : `Nas últimas ${count} semanas`),
  },
  month: {
    months: 1,
    avgDays: 30.44,
    lookback: 3,
    maxDays: 31,
    name: 'Mês',
    per: 'por mês',
    current: 'neste mês',
    plural: 'meses',
    first: 'Primeiro mês',
    last: masc('mês', 'meses'),
  },
  bimester: {
    months: 2,
    avgDays: 60.88,
    lookback: 2,
    maxDays: 62,
    name: 'Bimestre',
    per: 'por bimestre',
    current: 'neste bimestre',
    plural: 'bimestres',
    first: 'Primeiro bimestre',
    last: masc('bimestre', 'bimestres'),
  },
  quarter: {
    months: 3,
    avgDays: 91.31,
    lookback: 2,
    maxDays: 92,
    name: 'Trimestre',
    per: 'por trimestre',
    current: 'neste trimestre',
    plural: 'trimestres',
    first: 'Primeiro trimestre',
    last: masc('trimestre', 'trimestres'),
  },
  year: {
    months: 12,
    avgDays: 365.25,
    lookback: 1,
    maxDays: 366,
    name: 'Ano',
    per: 'por ano',
    current: 'neste ano',
    plural: 'anos',
    first: 'Primeiro ano',
    last: masc('ano', 'anos'),
  },
}

/** Primeiro dia do período que contém a data. */
export function periodStart(date: string, period: FrequencyPeriod) {
  if (period === 'week') return mondayOf(date)
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(5, 7)) - 1
  const first = month - (month % PERIOD[period].months)
  return `${year}-${String(first + 1).padStart(2, '0')}-01`
}

/** Último dia do período que começa em `start`. */
export function periodEnd(start: string, period: FrequencyPeriod) {
  if (period === 'week') return shift(start, 6)
  return shift(iso(addMonths(parseISO(start), PERIOD[period].months)), -1)
}

/** Início do período anterior. */
export function previousPeriod(start: string, period: FrequencyPeriod) {
  if (period === 'week') return shift(start, -7)
  return iso(addMonths(parseISO(start), -PERIOD[period].months))
}

/** Quantos dias tem o período que começa em `start`. */
export const periodLength = (start: string, period: FrequencyPeriod) => daysBetween(start, periodEnd(start, period)) + 1
