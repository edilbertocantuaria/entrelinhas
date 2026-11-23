import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** R$ 1.234,56 */
export const brl = (value: number) => currency.format(value)

export const num = (value: number, digits = 0) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)

/** Até uma casa decimal, sem zero sobrando: 3 ou 3,5 */
export const num1 = (value: number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)

export const cap = (text: string) => text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1)

export const iso = (date: Date) => format(date, 'yyyy-MM-dd')

export const fmt = (date: string | Date, pattern: string) =>
  format(typeof date === 'string' ? parseISO(date) : date, pattern, { locale: ptBR })

/** "Segunda-feira, 16 de novembro" */
export const longDay = (date: string) => cap(fmt(date, "EEEE, d 'de' MMMM"))
/** "16 de nov." */
export const shortDay = (date: string) => fmt(date, "d 'de' MMM")
/** "Outubro de 2026" */
export const monthYear = (date: string) => cap(fmt(date, "MMMM 'de' yyyy"))

export const shift = (date: string, days: number) => iso(addDays(parseISO(date), days))
export const daysBetween = (from: string, to: string) => differenceInCalendarDays(parseISO(to), parseISO(from))
export const mondayOf = (date: string) => iso(startOfWeek(parseISO(date), { weekStartsOn: 1 }))

/** Aceita "1.234,56", "82,4" e "82.4". Devolve NaN quando não é número. */
export function parseNum(input: string): number {
  let text = input.trim().replace(/[^\d.,-]/g, '')
  if (!text) return NaN
  if (text.includes(',')) text = text.replace(/\./g, '').replace(',', '.')
  else if (!/^-?\d+\.\d{1,2}$/.test(text)) text = text.replace(/\./g, '')
  const value = Number.parseFloat(text)
  return Number.isFinite(value) ? value : NaN
}

export const plural = (count: number, one: string, many: string) => (count === 1 ? one : many)

export function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} h ${rest} min` : `${hours} h`
}

export const uid = () => Math.random().toString(36).slice(2, 10)
