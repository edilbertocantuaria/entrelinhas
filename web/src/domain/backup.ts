import type { AppData } from './types'

/**
 * Backup em JSON ("Exportar dados" / "Importar dados" em Ajustes).
 * O arquivo leva tudo, menos a conta (login), que é de cada aparelho.
 */

const APP = 'entrelinhas'
const VERSION = 2

/** Listas do backup: precisam ser arrays. */
const LIST_KEYS = ['areas', 'goals', 'logs', 'tasks', 'rules', 'journal', 'summaries', 'workouts', 'weights', 'subjects', 'studySessions', 'modules', 'moduleEntries'] as const
/** Objetos do backup: precisam ser objetos simples. */
const OBJECT_KEYS = ['retros', 'reviews', 'settings', 'day'] as const

export type BackupData = Partial<Omit<AppData, 'session'>>

export interface Backup {
  app: typeof APP
  version: number
  exportedAt: string
  data: BackupData
}

/** Monta o arquivo com todos os dados do aparelho. */
export function buildBackup(state: AppData): Backup {
  const { session: _session, ...data } = state
  void _session
  // só dados, sem as funções do store
  const plain = Object.fromEntries(Object.entries(data).filter(([, value]) => typeof value !== 'function')) as BackupData
  return { app: APP, version: VERSION, exportedAt: new Date().toISOString(), data: plain }
}

export type ParsedBackup = { ok: true; data: BackupData; exportedAt?: string; counts: { label: string; count: number }[] } | { ok: false; error: string }

const isPlainObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Lê e confere um backup. Aceita o formato novo ({ app, version, data }) e o antigo,
 * em que as listas vinham soltas na raiz do arquivo.
 */
export function parseBackup(text: string): ParsedBackup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'O arquivo não é um JSON válido.' }
  }
  if (!isPlainObject(raw)) return { ok: false, error: 'Este arquivo não parece um backup do Entrelinhas.' }
  if (raw.app !== undefined && raw.app !== APP) return { ok: false, error: 'Este arquivo é de outro app.' }
  if (typeof raw.version === 'number' && raw.version > VERSION) return { ok: false, error: 'Este backup veio de uma versão mais nova do app. Atualize o app e tente de novo.' }

  const source = isPlainObject(raw.data) ? raw.data : raw
  const data: Record<string, unknown> = {}
  for (const key of LIST_KEYS) {
    if (source[key] === undefined) continue
    if (!Array.isArray(source[key])) return { ok: false, error: `O campo “${key}” do arquivo está num formato inesperado.` }
    data[key] = source[key]
  }
  for (const key of OBJECT_KEYS) {
    if (source[key] === undefined) continue
    if (!isPlainObject(source[key])) return { ok: false, error: `O campo “${key}” do arquivo está num formato inesperado.` }
    data[key] = source[key]
  }
  for (const key of ['onboarded', 'startedAt'] as const) if (source[key] !== undefined) data[key] = source[key]

  // o mínimo para ser um backup: áreas e metas, ou pelo menos o diário
  if (!Array.isArray(data.areas) && !Array.isArray(data.goals) && !Array.isArray(data.journal))
    return { ok: false, error: 'Este arquivo não parece um backup do Entrelinhas.' }
  // listas com itens sem id quebrariam o app (todo item de lista tem id)
  for (const key of LIST_KEYS) {
    const list = data[key] as unknown[] | undefined
    if (list?.some(item => !isPlainObject(item) || typeof item.id !== 'string')) return { ok: false, error: `Há itens incompletos em “${key}”.` }
  }

  const count = (key: (typeof LIST_KEYS)[number]) => (Array.isArray(data[key]) ? (data[key] as unknown[]).length : 0)
  const counts = [
    { label: 'metas', count: count('goals') },
    { label: 'registros', count: count('logs') },
    { label: 'tarefas', count: count('tasks') },
    { label: 'entradas do diário', count: count('journal') },
    { label: 'resumos', count: count('summaries') },
    { label: 'treinos', count: count('workouts') },
    { label: 'sessões de estudo', count: count('studySessions') },
    { label: 'registros de módulos', count: count('moduleEntries') },
  ].filter(item => item.count > 0)

  return { ok: true, data: data as BackupData, exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : undefined, counts }
}
