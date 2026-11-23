export type ColorKey =
  | 'verde'
  | 'mar'
  | 'tijolo'
  | 'celeste'
  | 'periwinkle'
  | 'azul-cinza'
  | 'ambar'
  | 'lavanda'
  | 'musgo'
  | 'areia'

export interface Area {
  id: string
  name: string
  /** nome do ícone lucide em kebab-case */
  icon: string
  color: ColorKey
  order: number
  archived: boolean
}

export type MetricType = 'frequency' | 'sum' | 'value' | 'milestones' | 'days'

export type Metric =
  /** contagem por semana, ex.: academia 3 a 4x */
  | { type: 'frequency'; min: number; max: number; noun: string }
  /** soma acumulada até um alvo, ex.: guardar R$ 5.000 */
  | { type: 'sum'; target: number; unit: string; currency: boolean }
  /** valor ao longo do tempo, de X para Y, ex.: peso */
  | { type: 'value'; from: number; to: number; unit: string }
  /** etapas de um projeto */
  | { type: 'milestones'; items: { id: string; title: string }[] }
  /** dias feitos ou tempo dedicado */
  | { type: 'days'; target: number; unit: 'dias' | 'horas'; sessionMinutes: number }

export interface Goal {
  id: string
  title: string
  areaId: string
  /** Específica */
  description: string
  /** Mensurável */
  metric: Metric
  /** Alcançável */
  startingPoint: string
  achievableNote: string
  /** Relevante */
  why: string
  /** Prazo */
  startDate: string
  deadline: string
  /** título da tarefa gerada pela meta */
  taskTitle: string
  reminder: { on: boolean; time: string }
  /** ilustração escolhida para a meta; sem ela, vale a do tipo de medida */
  art?: string
}

export interface WorkoutSet {
  exercise: string
  sets?: number
  reps?: number
  weight?: number
}

export interface LogEntry {
  id: string
  date: string
  goalId: string
  /** soma: valor; valor: medição; dias: minutos */
  value?: number
  note?: string
  workout?: WorkoutSet[]
  /** metas de treino: tipo de atividade, duração e distância */
  activity?: { kind: WorkoutKind; minutes?: number; distanceKm?: number }
  milestoneId?: string
  taskId?: string
}

export type TaskStatus = 'pending' | 'done' | 'dismissed' | 'not_done'

export interface Task {
  id: string
  title: string
  goalId?: string
  milestoneId?: string
  date: string
  status: TaskStatus
  origin: 'recurring' | 'standalone'
  /** guardada em "Depois" */
  later: boolean
  dismissReason?: string
  /** tarefa criada por uma repetição: id da regra e dia original da ocorrência */
  ruleId?: string
  occurrence?: string
}

// ---------- Repetição (estilo agenda) ----------

export interface Repeat {
  /** a cada `interval` dias, semanas ou meses */
  freq: 'daily' | 'weekly' | 'monthly'
  interval: number
  /** semanal: dias da semana, 0 = domingo */
  weekdays?: number[]
  /** mensal: dia do mês (no mês sem esse dia, vale o último) */
  monthDay?: number
  /** primeiro dia possível */
  start: string
  end: { type: 'never' } | { type: 'date'; date: string } | { type: 'count'; count: number }
}

export interface RecurringTask {
  id: string
  title: string
  goalId?: string
  repeat: Repeat
  /** dias pulados (excluir só aquela ocorrência) */
  skipped: string[]
}

export interface JournalEntry {
  id: string
  date: string
  text: string
  mood?: number
  goalIds: string[]
}

export type SummaryKind = 'monthly' | 'quarterly' | 'annual'

export interface Summary {
  id: string
  kind: 'monthly' | 'quarterly'
  start: string
  end: string
  title: string
  narrative: string
  generatedAt: string
  pinned: boolean
  edited: boolean
  /** falso enquanto o aviso "está pronto" ainda não foi visto */
  seen: boolean
  usedAI: boolean
  /** "pending": esperando o texto da IA; ausente = texto pronto */
  aiStatus?: 'pending'
  variant: number
  reflections: Record<string, string>
}

export interface Retro {
  year: number
  generatedAt: string
  saved: boolean
  /** aviso "sua retrospectiva está pronta" visível em Hoje */
  banner: boolean
  /** o gatilho automático já rodou neste ano */
  announced: boolean
  pinned: boolean
  letter: string
}

export type ThemeSetting = 'light' | 'dark' | 'system'
export type IllustrationDensity = 'many' | 'few' | 'none'

export interface Settings {
  maxTasks: number
  /** tarefas só podem ser marcadas no próprio dia (nem antes, nem depois) */
  onlyOnDay?: boolean
  hideStreaks: boolean
  hidePercent: boolean
  quietFrom: string
  quietTo: string
  rollover: string
  monthlyAuto: boolean
  quarterlyAuto: boolean
  retroEnabled: boolean
  /** null = penúltima quinta de dezembro */
  retroDate: string | null
  retroTime: string
  useAI: boolean
  theme: ThemeSetting
  illustrations: IllustrationDensity
  /** data simulada para testar o protótipo */
  demoDate: string | null
}

export interface DayState {
  openedOn: string | null
  closedOn: string | null
}

// ---------- Módulo Fitness ----------

export type WorkoutKind = 'musculacao' | 'calistenia' | 'alongamento' | 'caminhada' | 'corrida' | 'bicicleta' | 'danca' | 'outro'

export interface Workout {
  id: string
  date: string
  kind: WorkoutKind
  minutes?: number
  distanceKm?: number
  exercises?: WorkoutSet[]
  note?: string
  /** registro de meta criado junto (ou que deu origem a este treino) */
  logId?: string
}

export interface BodyWeight {
  id: string
  date: string
  kg: number
  logId?: string
}

// ---------- Módulo Estudos ----------

export interface Subject {
  id: string
  name: string
  color: ColorKey
  /** meta de dias ou horas que recebe o tempo estudado nesta disciplina */
  goalId?: string
}

export interface StudySession {
  id: string
  date: string
  subjectId: string
  minutes: number
  /** questões feitas e acertos */
  questions?: number
  correct?: number
  difficulty?: string
  progress?: string
  insight?: string
  logId?: string
}

// ---------- Módulos (Fitness, Estudos e os criados pela pessoa) ----------

/**
 * number: quantidade com unidade (páginas, R$, copos); soma por semana
 * duration: minutos; soma por semana
 * scale: nota de 1 a 5; média
 * choice: uma opção de uma lista
 * check: sim ou não
 * text: anotação livre
 */
export type FieldType = 'number' | 'duration' | 'scale' | 'choice' | 'check' | 'text'

export interface ModuleField {
  id: string
  label: string
  type: FieldType
  unit?: string
  options?: string[]
}

export interface AppModule {
  id: string
  /** fitness e study têm telas próprias; custom usa os campos definidos */
  kind: 'fitness' | 'study' | 'custom'
  name: string
  icon: string
  color: ColorKey
  order: number
  /** módulos de fábrica não são apagados, só escondidos (e podem voltar) */
  hidden?: boolean
  fields: ModuleField[]
  /** cada registro do módulo conta para esta meta; `fieldId` dá o valor quando a meta pede um número */
  goal?: { goalId: string; fieldId?: string }
}

export type FieldValue = number | string | boolean

export interface ModuleEntry {
  id: string
  moduleId: string
  date: string
  values: Record<string, FieldValue>
  logId?: string
}

/** Quem está usando o app neste aparelho. A senha nunca é guardada aqui. */
export interface Session {
  name: string
  email: string
}

export interface AppData {
  session: Session | null
  areas: Area[]
  goals: Goal[]
  logs: LogEntry[]
  tasks: Task[]
  /** tarefas que se repetem; as ocorrências viram Task no dia em que acontecem */
  rules: RecurringTask[]
  journal: JournalEntry[]
  summaries: Summary[]
  retros: Record<string, Retro>
  reviews: Record<string, string>
  workouts: Workout[]
  weights: BodyWeight[]
  subjects: Subject[]
  studySessions: StudySession[]
  modules: AppModule[]
  moduleEntries: ModuleEntry[]
  day: DayState
  settings: Settings
  onboarded: boolean
  /** primeiro dia de uso do app */
  startedAt: string
}
