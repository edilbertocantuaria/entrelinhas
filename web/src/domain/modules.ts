import { brl, fmt, minutesLabel, mondayOf, num1, shift } from '@/shared/format'
import type { AppModule, ColorKey, FieldType, FieldValue, ModuleEntry, ModuleField } from '@/domain/types'

export const MAX_MODULE_NAME = 24
export const MAX_FIELDS = 8

export const FIELD_TYPES: { value: FieldType; label: string; hint: string }[] = [
  { value: 'number', label: 'Número', hint: 'Páginas, copos, R$, km. Soma na semana.' },
  { value: 'duration', label: 'Tempo', hint: 'Em minutos. Soma na semana.' },
  { value: 'scale', label: 'Nota de 1 a 5', hint: 'Como foi, qualidade, energia. Mostra a média.' },
  { value: 'choice', label: 'Lista de opções', hint: 'Uma opção por registro, como tipo ou categoria.' },
  { value: 'check', label: 'Sim ou não', hint: 'Algo que aconteceu ou não.' },
  { value: 'text', label: 'Texto', hint: 'Anotação livre: título, ideia, observação.' },
]

export const fieldTypeLabel = (type: FieldType) => FIELD_TYPES.find(item => item.value === type)?.label ?? type

/** Onde fica a tela de cada módulo. */
export const moduleHref = (mod: Pick<AppModule, 'id' | 'kind'>) =>
  mod.kind === 'fitness' ? '/fitness' : mod.kind === 'study' ? '/estudos' : `/modulos/${mod.id}`

export const BUILTIN_MODULES: AppModule[] = [
  { id: 'fitness', kind: 'fitness', name: 'Fitness', icon: 'dumbbell', color: 'mar', order: 0, fields: [] },
  { id: 'estudos', kind: 'study', name: 'Estudos', icon: 'graduation-cap', color: 'periwinkle', order: 1, fields: [] },
]

export interface ModuleTemplate {
  key: string
  name: string
  icon: string
  color: ColorKey
  description: string
  fields: Omit<ModuleField, 'id'>[]
}

export const TEMPLATES: ModuleTemplate[] = [
  {
    key: 'leitura',
    name: 'Leitura',
    icon: 'book-open',
    color: 'lavanda',
    description: 'Livros, páginas lidas e o que ficou de cada leitura.',
    fields: [
      { label: 'Livro', type: 'text' },
      { label: 'Páginas', type: 'number', unit: 'páginas' },
      { label: 'Tempo', type: 'duration' },
      { label: 'Gostei', type: 'scale' },
    ],
  },
  {
    key: 'sono',
    name: 'Sono',
    icon: 'moon',
    color: 'periwinkle',
    description: 'Horas dormidas e como você acordou.',
    fields: [
      { label: 'Horas dormidas', type: 'number', unit: 'h' },
      { label: 'Qualidade', type: 'scale' },
      { label: 'Acordei descansado', type: 'check' },
    ],
  },
  {
    key: 'meditacao',
    name: 'Meditação',
    icon: 'leaf',
    color: 'musgo',
    description: 'Tempo de prática, tipo e como você ficou depois.',
    fields: [
      { label: 'Tempo', type: 'duration' },
      { label: 'Tipo', type: 'choice', options: ['Respiração', 'Guiada', 'Silêncio', 'Caminhando'] },
      { label: 'Como fiquei', type: 'scale' },
    ],
  },
  {
    key: 'alimentacao',
    name: 'Alimentação',
    icon: 'apple',
    color: 'verde',
    description: 'Refeições, água e pequenas escolhas do dia.',
    fields: [
      { label: 'Refeição', type: 'choice', options: ['Café da manhã', 'Almoço', 'Lanche', 'Jantar'] },
      { label: 'Teve fruta ou verdura', type: 'check' },
      { label: 'Água', type: 'number', unit: 'copos' },
      { label: 'Observação', type: 'text' },
    ],
  },
  {
    key: 'gastos',
    name: 'Gastos',
    icon: 'wallet',
    color: 'tijolo',
    description: 'Para onde o dinheiro vai, sem julgamento.',
    fields: [
      { label: 'Valor', type: 'number', unit: 'R$' },
      { label: 'Categoria', type: 'choice', options: ['Mercado', 'Casa', 'Transporte', 'Lazer', 'Outros'] },
      { label: 'Era necessário', type: 'check' },
      { label: 'Nota', type: 'text' },
    ],
  },
  {
    key: 'idiomas',
    name: 'Idiomas',
    icon: 'languages',
    color: 'celeste',
    description: 'Tempo de prática, atividade e palavras novas.',
    fields: [
      { label: 'Idioma', type: 'choice', options: ['Inglês', 'Espanhol', 'Francês'] },
      { label: 'Tempo', type: 'duration' },
      { label: 'Atividade', type: 'choice', options: ['Aplicativo', 'Aula', 'Série ou filme', 'Conversa'] },
      { label: 'Palavras novas', type: 'number', unit: 'palavras' },
    ],
  },
]

// ---------- Leitura dos valores ----------

const asNumber = (value: FieldValue | undefined) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined)

/** Valor formatado de um campo, ou vazio quando não foi preenchido. */
export function valueText(field: ModuleField, value: FieldValue | undefined): string {
  if (value === undefined || value === '') return ''
  if (field.type === 'number') {
    const n = asNumber(value)
    if (n === undefined) return ''
    if (field.unit?.trim() === 'R$') return brl(n)
    return field.unit ? `${num1(n)} ${field.unit}` : num1(n)
  }
  if (field.type === 'duration') {
    const n = asNumber(value)
    return n ? minutesLabel(n) : ''
  }
  if (field.type === 'scale') {
    const n = asNumber(value)
    return n ? `${field.label}: ${n} de 5` : ''
  }
  if (field.type === 'check') return typeof value === 'boolean' ? (value ? field.label : `${field.label}: não`) : ''
  return String(value)
}

/** Resumo de um registro em uma linha: "32 páginas · 40 min · Gostei: 4 de 5". Texto longo fica de fora. */
export function entrySummary(mod: AppModule, entry: ModuleEntry) {
  return mod.fields
    .filter(field => field.type !== 'text')
    .map(field => valueText(field, entry.values[field.id]))
    .filter(Boolean)
    .join(' · ')
}

/** Um campo de texto no topo da lista funciona como título do registro (ex.: o nome do livro). */
const titleField = (mod: AppModule) => (mod.fields[0]?.type === 'text' ? mod.fields[0] : undefined)

export function entryTitle(mod: AppModule, entry: ModuleEntry) {
  const field = titleField(mod)
  const value = field ? entry.values[field.id] : undefined
  return typeof value === 'string' ? value.trim() : ''
}

export const isFilled = (value: FieldValue | undefined) => value !== undefined && value !== '' && !(typeof value === 'number' && !Number.isFinite(value))

// ---------- Números do módulo ----------

const inRange = (entry: ModuleEntry, from: string, to: string) => entry.date >= from && entry.date <= to

/** Total (número, tempo) ou média (nota) de um campo num intervalo. */
export function aggregate(field: ModuleField, entries: ModuleEntry[]) {
  const values = entries.map(entry => asNumber(entry.values[field.id])).filter((value): value is number => value !== undefined)
  if (!values.length) return null
  const total = values.reduce((sum, value) => sum + value, 0)
  return field.type === 'scale' ? total / values.length : total
}

export function aggregateText(field: ModuleField, value: number | null) {
  if (value === null && field.type === 'scale') return '–'
  value ??= 0
  if (field.type === 'scale') return `${num1(value)} de 5`
  if (field.type === 'duration') return minutesLabel(Math.round(value))
  if (field.unit?.trim() === 'R$') return brl(value)
  return field.unit ? `${num1(value)} ${field.unit}` : num1(value)
}

export const chartFields = (mod: AppModule) => mod.fields.filter(field => field.type === 'number' || field.type === 'duration' || field.type === 'scale')

export function weekEntries(entries: ModuleEntry[], today: string) {
  return entries.filter(entry => inRange(entry, mondayOf(today), today))
}

export function recentEntries(entries: ModuleEntry[], today: string, days = 30) {
  return entries.filter(entry => inRange(entry, shift(today, -(days - 1)), today))
}

/** Total ou média por semana nas últimas `weeks` semanas. */
export function weeklyField(field: ModuleField, entries: ModuleEntry[], today: string, weeks = 8) {
  const first = shift(mondayOf(today), -(weeks - 1) * 7)
  return Array.from({ length: weeks }, (_, index) => {
    const start = shift(first, index * 7)
    const value = aggregate(
      field,
      entries.filter(entry => inRange(entry, start, shift(start, 6))),
    )
    return { week: fmt(start, 'd/M'), value: value === null ? (field.type === 'scale' ? null : 0) : Math.round(value * 10) / 10 }
  })
}

export function weeklyCount(entries: ModuleEntry[], today: string, weeks = 8) {
  const first = shift(mondayOf(today), -(weeks - 1) * 7)
  return Array.from({ length: weeks }, (_, index) => {
    const start = shift(first, index * 7)
    return { week: fmt(start, 'd/M'), value: entries.filter(entry => inRange(entry, start, shift(start, 6))).length }
  })
}

/** Quantas vezes cada opção apareceu. */
export function choiceBreakdown(field: ModuleField, entries: ModuleEntry[]) {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    const value = entry.values[field.id]
    if (typeof value === 'string' && value) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts].map(([option, count]) => ({ option, count })).sort((a, b) => b.count - a.count)
}

export function checkStats(field: ModuleField, entries: ModuleEntry[]) {
  const answered = entries.filter(entry => typeof entry.values[field.id] === 'boolean')
  return { yes: answered.filter(entry => entry.values[field.id] === true).length, total: answered.length }
}

/** Anotações dos campos de texto, da mais recente para a mais antiga. */
export function textNotes(mod: AppModule, entries: ModuleEntry[]) {
  const title = titleField(mod)
  const fields = mod.fields.filter(field => field.type === 'text' && field !== title)
  return entries
    .flatMap(entry =>
      fields.map(field => ({
        id: `${entry.id}-${field.id}`,
        label: field.label,
        text: typeof entry.values[field.id] === 'string' ? String(entry.values[field.id]).trim() : '',
        date: entry.date,
      })),
    )
    .filter(note => note.text)
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** Frase curta do cartão do módulo em Metas. */
export function moduleCardText(mod: AppModule, entries: ModuleEntry[], today: string) {
  const week = weekEntries(entries, today)
  const sumField = mod.fields.find(field => field.type === 'number' || field.type === 'duration')
  if (sumField && week.length) return `${aggregateText(sumField, aggregate(sumField, week))} na semana`
  return `${week.length} ${week.length === 1 ? 'registro' : 'registros'} na semana`
}
