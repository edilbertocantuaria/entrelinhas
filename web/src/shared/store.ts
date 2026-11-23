'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { MAX_ACTIVE_AREAS, MAX_AREA_NAME } from '@/domain/areas'
import { STORAGE_KEY } from '@/shared/constants'
import { iso, uid } from '@/shared/format'
import { finishedOn, isActiveOn, marcoReachedOn, todayTasks, tracksTime, type Suggestion } from '@/domain/goals'
import { createSeed, DEFAULT_LETTER } from '@/domain/seed'
import { buildSummary, dueSummaries } from '@/domain/summaries'
import type {
  AppData,
  Area,
  ColorKey,
  Goal,
  JournalEntry,
  LogEntry,
  Retro,
  Session,
  Settings,
  StudySession,
  Summary,
  Task,
  Workout,
  AppModule,
  ModuleEntry,
  RecurringTask,
} from '@/domain/types'
import { MAX_FIELDS, MAX_MODULE_NAME } from '@/domain/modules'
import { rulesOn } from '@/domain/recurrence'
import type { BackupData } from '@/domain/backup'
import { kindOf, workoutMeta } from '@/domain/fitness'

type AreaDraft = { name: string; icon: string; color: ColorKey }
type SaveAreaResult = { ok: true; id: string } | { ok: false; error: string }

interface Actions {
  // áreas
  saveArea: (draft: AreaDraft, id?: string) => SaveAreaResult
  reorderAreas: (orderedIds: string[]) => void
  archiveArea: (id: string) => boolean
  restoreArea: (id: string) => boolean
  deleteArea: (id: string, moveGoalsTo?: string) => boolean
  // metas e registros
  addGoal: (goal: Omit<Goal, 'id'>) => string
  updateGoal: (id: string, patch: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  addLog: (log: Omit<LogEntry, 'id'>) => void
  removeLog: (id: string) => void
  // tarefas
  /** cria a tarefa no dia; se o dia já estiver no limite (contando `reserved` ocorrências planejadas), vai para Depois */
  addTask: (input: { title: string; goalId?: string; milestoneId?: string }, date: string, reserved?: number) => 'today' | 'later'
  // repetições
  addRule: (rule: Omit<RecurringTask, 'id' | 'skipped'>) => string
  updateRule: (id: string, patch: Partial<Omit<RecurringTask, 'id'>>) => void
  /** para de repetir: as tarefas já feitas ficam; as pendentes de hoje em diante saem */
  removeRule: (id: string, today: string) => void
  /** transforma uma ocorrência planejada em tarefa (para concluir antes do dia, por exemplo) e devolve a tarefa */
  materializeOccurrence: (ruleId: string, occurrence: string, date: string) => Task | null
  /** pula só uma ocorrência (e tira a tarefa daquele dia, se já existir e estiver pendente) */
  skipOccurrence: (id: string, date: string) => void
  /** põe em Hoje as ocorrências do dia; as de dias passados que ficaram pendentes viram "não feita" */
  ensureOccurrences: (today: string) => void
  completeTask: (id: string, log: Partial<LogEntry> | null, today: string) => void
  uncompleteTask: (id: string) => void
  moveTask: (id: string, date: string) => void
  /**
   * Renomeia a tarefa. Com `upcoming`, o nome vale também para as próximas da mesma meta:
   * a repetição, as pendentes com o nome antigo e a tarefa que a meta sugere.
   */
  renameTask: (id: string, title: string, upcoming: boolean) => void
  discardTask: (id: string) => void
  dismissTask: (id: string, reason?: string) => void
  sendToLater: (id: string) => void
  bringToToday: (id: string, today: string) => boolean
  deleteTask: (id: string) => void
  // dia
  openDay: (today: string, selection: { taskIds: string[]; suggestions: Suggestion[]; candidateIds: string[] }) => void
  closeDay: (today: string) => void
  reopenDay: () => void
  // diário
  saveJournal: (date: string, patch: Partial<Pick<JournalEntry, 'text' | 'mood' | 'goalIds'>>) => void
  deleteJournal: (id: string) => void
  // resumos e retrospectiva
  runSchedule: (today: string, time: string) => void
  generateSummary: (kind: 'monthly' | 'quarterly', start: string, end: string, today: string) => string
  updateSummary: (id: string, patch: Partial<Summary>) => void
  ensureRetro: (year: number, today: string) => void
  updateRetro: (year: number, patch: Partial<Retro>) => void
  setReview: (key: string, text: string) => void
  // ajustes
  setSettings: (patch: Partial<Settings>) => void
  finishOnboarding: (areaIds: string[]) => void
  resetAll: () => void
  /** substitui os dados pelos de um backup; o que não vier no arquivo continua como está, e a conta não muda */
  importData: (data: BackupData) => void
  /**
   * "goals": tira só as metas (e os registros delas); tarefas avulsas, diário e módulos ficam.
   * "all": começa do zero, mantendo só áreas, ajustes e a conta.
   */
  clearGoals: (mode: 'goals' | 'all', today: string) => void
  // conta
  signIn: (session: Session) => void
  signOut: () => void
  // módulo fitness
  addWorkout: (workout: Omit<Workout, 'id' | 'logId'>, goalId?: string) => void
  removeWorkout: (id: string) => void
  addWeight: (date: string, kg: number, goalId?: string) => void
  removeWeight: (id: string) => void
  // módulo estudos
  saveSubject: (draft: { name: string; color: ColorKey; goalId?: string }, id?: string) => SaveAreaResult
  removeSubject: (id: string) => void
  addStudySession: (session: Omit<StudySession, 'id' | 'logId'>) => void
  removeStudySession: (id: string) => void
  // módulos
  saveModule: (draft: ModuleDraft, id?: string) => SaveAreaResult
  /** Fitness e Estudos ficam escondidos (e podem voltar); os criados são apagados com os registros. */
  removeModule: (id: string, eraseData: boolean) => void
  restoreModule: (id: string) => void
  moveModule: (id: string, direction: -1 | 1) => void
  addModuleEntry: (entry: Omit<ModuleEntry, 'id' | 'logId'>) => void
  removeModuleEntry: (id: string) => void
}

export type ModuleDraft = Pick<AppModule, 'name' | 'icon' | 'color'> & Partial<Pick<AppModule, 'fields' | 'goal'>>

export type Store = AppData & Actions

const activeAreas = (areas: Area[]) => areas.filter(area => !area.archived)

/** A carta de exemplo fala das metas de exemplo; sem elas, a carta começa em branco. */
const letterFor = (state: AppData) => (state.goals.some(goal => goal.id === 'academia') ? DEFAULT_LETTER : '')

type Modules = Pick<AppData, 'workouts' | 'weights' | 'studySessions'>

/**
 * Um registro feito numa meta (em Hoje ou no detalhe da meta) aparece também no módulo:
 * treino com exercícios vira treino, medição em kg vira peso e tempo de uma meta
 * ligada a uma disciplina vira sessão de estudo.
 */
function mirror(state: AppData, log: LogEntry): Partial<Modules> {
  const goal = state.goals.find(item => item.id === log.goalId)
  if (!goal) return {}
  if (log.activity || log.workout?.length)
    return {
      workouts: [
        ...state.workouts,
        {
          id: `treino-${uid()}`,
          date: log.date,
          kind: log.activity?.kind ?? 'musculacao',
          minutes: log.activity?.minutes,
          distanceKm: log.activity?.distanceKm,
          exercises: log.workout,
          note: log.note,
          logId: log.id,
        },
      ],
    }
  if (goal.metric.type === 'value' && goal.metric.unit.trim().toLowerCase() === 'kg' && log.value != null)
    return { weights: [...state.weights, { id: `peso-${uid()}`, date: log.date, kg: log.value, logId: log.id }] }
  if (goal.metric.type === 'days' && log.value) {
    const subject = state.subjects.find(item => item.goalId === goal.id)
    if (subject)
      return { studySessions: [...state.studySessions, { id: `estudo-${uid()}`, date: log.date, subjectId: subject.id, minutes: log.value, logId: log.id }] }
  }
  return {}
}

/** Ao desfazer um registro de meta, o que ele espelhou no módulo sai junto. */
function unmirror(state: AppData, logIds: Set<string>): Modules {
  const keep = (item: { logId?: string }) => !item.logId || !logIds.has(item.logId)
  return { workouts: state.workouts.filter(keep), weights: state.weights.filter(keep), studySessions: state.studySessions.filter(keep) }
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...createSeed(iso(new Date())),

      saveArea: (draft, id) => {
        const name = draft.name.trim()
        const { areas } = get()
        if (!name) return { ok: false, error: 'Dê um nome para a área.' }
        if (name.length > MAX_AREA_NAME) return { ok: false, error: `Use até ${MAX_AREA_NAME} caracteres.` }
        const lower = name.toLocaleLowerCase('pt-BR')
        if (areas.some(area => area.id !== id && area.name.toLocaleLowerCase('pt-BR') === lower))
          return { ok: false, error: 'Já existe uma área com esse nome.' }
        if (id) {
          set({ areas: areas.map(area => (area.id === id ? { ...area, ...draft, name } : area)) })
          return { ok: true, id }
        }
        if (activeAreas(areas).length >= MAX_ACTIVE_AREAS)
          return { ok: false, error: `O limite é de ${MAX_ACTIVE_AREAS} áreas ativas. Arquive uma para criar outra.` }
        const newId = `area-${uid()}`
        const order = Math.max(-1, ...areas.map(area => area.order)) + 1
        set({ areas: [...areas, { id: newId, ...draft, name, order, archived: false }] })
        return { ok: true, id: newId }
      },

      reorderAreas: orderedIds =>
        set(state => ({
          areas: state.areas.map(area => {
            const index = orderedIds.indexOf(area.id)
            return index < 0 ? area : { ...area, order: index }
          }),
        })),

      archiveArea: id => {
        const { areas } = get()
        if (activeAreas(areas).length <= 1) return false
        set({ areas: areas.map(area => (area.id === id ? { ...area, archived: true } : area)) })
        return true
      },

      restoreArea: id => {
        const { areas } = get()
        if (activeAreas(areas).length >= MAX_ACTIVE_AREAS) return false
        const order = Math.max(-1, ...activeAreas(areas).map(area => area.order)) + 1
        set({ areas: areas.map(area => (area.id === id ? { ...area, archived: false, order } : area)) })
        return true
      },

      deleteArea: (id, moveGoalsTo) => {
        const { areas, goals } = get()
        const target = areas.find(area => area.id === id)
        if (!target) return false
        if (!target.archived && activeAreas(areas).length <= 1) return false
        const hasGoals = goals.some(goal => goal.areaId === id)
        if (hasGoals && !moveGoalsTo) return false
        set({
          areas: areas.filter(area => area.id !== id),
          goals: goals.map(goal => (goal.areaId === id && moveGoalsTo ? { ...goal, areaId: moveGoalsTo } : goal)),
        })
        return true
      },

      addGoal: goal => {
        const id = `meta-${uid()}`
        set(state => ({ goals: [...state.goals, { ...goal, id }] }))
        return id
      },

      updateGoal: (id, patch) => set(state => ({ goals: state.goals.map(goal => (goal.id === id ? { ...goal, ...patch } : goal)) })),

      deleteGoal: id =>
        set(state => ({
          goals: state.goals
            .filter(goal => goal.id !== id)
            // quem tinha esta meta como marco passa a ter o marco em texto (já atingido, se ela tinha terminado)
            .map(goal => {
              if (goal.until?.type !== 'goal' || goal.until.goalId !== id) return goal
              const removed = state.goals.find(item => item.id === id)
              const reachedOn = removed ? finishedOn(removed, state.goals, state.logs) : undefined
              return { ...goal, until: { type: 'event' as const, text: `concluir “${removed?.title ?? 'a meta ligada'}”`, reachedOn } }
            }),
          logs: state.logs.filter(log => log.goalId !== id),
          tasks: state.tasks
            .filter(task => !(task.goalId === id && task.status === 'pending'))
            .map(task => (task.goalId === id ? { ...task, goalId: undefined, milestoneId: undefined } : task)),
          journal: state.journal.map(entry => ({ ...entry, goalIds: entry.goalIds.filter(goalId => goalId !== id) })),
          subjects: state.subjects.map(subject => (subject.goalId === id ? { ...subject, goalId: undefined } : subject)),
          modules: state.modules.map(mod => (mod.goal?.goalId === id ? { ...mod, goal: undefined } : mod)),
          rules: state.rules.filter(rule => rule.goalId !== id),
        })),

      addLog: log =>
        set(state => {
          const entry: LogEntry = { ...log, id: `log-${uid()}` }
          return { logs: [...state.logs, entry], ...mirror(state, entry) }
        }),

      removeLog: id =>
        set(state => {
          const log = state.logs.find(item => item.id === id)
          return {
            ...unmirror(state, new Set([id])),
            logs: state.logs.filter(item => item.id !== id),
            // se o registro veio de uma tarefa, ela volta a ficar pendente
            tasks: log?.taskId ? state.tasks.map(task => (task.id === log.taskId ? { ...task, status: 'pending' as const } : task)) : state.tasks,
          }
        }),

      addTask: (input, today, reserved = 0) => {
        const state = get()
        const later = todayTasks(state.tasks, today).length + reserved >= state.settings.maxTasks
        const task: Task = {
          id: `tarefa-${uid()}`,
          title: input.title.trim(),
          goalId: input.goalId,
          milestoneId: input.milestoneId,
          date: today,
          status: 'pending',
          origin: 'standalone',
          later,
        }
        set({ tasks: [...state.tasks, task] })
        return later ? 'later' : 'today'
      },

      completeTask: (id, log, today) =>
        set(state => {
          const task = state.tasks.find(item => item.id === id)
          if (!task) return state
          const entry: LogEntry | null =
            task.goalId && state.goals.some(goal => goal.id === task.goalId)
              ? { ...log, id: `log-${uid()}`, date: today, goalId: task.goalId, taskId: id, milestoneId: task.milestoneId ?? log?.milestoneId }
              : null
          return {
            logs: entry ? [...state.logs, entry] : state.logs,
            ...(entry ? mirror(state, entry) : {}),
            // feita antes do dia marcado: passa para o dia em que foi feita
            tasks: state.tasks.map(item =>
              item.id === id ? { ...item, status: 'done' as const, later: false, date: item.date > today ? today : item.date } : item,
            ),
          }
        }),

      uncompleteTask: id =>
        set(state => ({
          ...unmirror(state, new Set(state.logs.filter(log => log.taskId === id).map(log => log.id))),
          logs: state.logs.filter(log => log.taskId !== id),
          tasks: state.tasks.map(task => (task.id === id ? { ...task, status: 'pending' as const } : task)),
        })),

      moveTask: (id, date) => set(state => ({ tasks: state.tasks.map(task => (task.id === id ? { ...task, date, later: false } : task)) })),

      renameTask: (id, title, upcoming) =>
        set(state => {
          const task = state.tasks.find(item => item.id === id)
          const clean = title.trim()
          if (!task || !clean || clean === task.title) return state
          const old = task.title
          // etapas têm o nome da etapa: só a própria tarefa muda
          const goalId = upcoming && !task.milestoneId ? task.goalId : undefined
          const rule = goalId ? state.rules.find(item => item.id === task.ruleId || item.goalId === goalId) : undefined
          const follows = (item: Task) =>
            item.id === id ||
            (item.status === 'pending' && !item.milestoneId && item.title === old && ((rule && item.ruleId === rule.id) || (goalId && item.goalId === goalId)))
          return {
            tasks: state.tasks.map(item => (follows(item) ? { ...item, title: clean } : item)),
            rules: rule ? state.rules.map(item => (item.id === rule.id ? { ...item, title: clean } : item)) : state.rules,
            goals: goalId ? state.goals.map(goal => (goal.id === goalId && goal.taskTitle === old ? { ...goal, taskTitle: clean } : goal)) : state.goals,
          }
        }),

      // Descartada: sai da lista e fica no histórico como "não feita".
      discardTask: id => set(state => ({ tasks: state.tasks.map(task => (task.id === id ? { ...task, status: 'not_done' as const } : task)) })),

      // Dispensada: não conta como falha nem contra o ritmo da meta.
      dismissTask: (id, reason) =>
        set(state => ({
          tasks: state.tasks.map(task => (task.id === id ? { ...task, status: 'dismissed' as const, dismissReason: reason || undefined } : task)),
        })),

      sendToLater: id => set(state => ({ tasks: state.tasks.map(task => (task.id === id ? { ...task, later: true } : task)) })),

      bringToToday: (id, today) => {
        const state = get()
        if (todayTasks(state.tasks, today).length >= state.settings.maxTasks) return false
        set({ tasks: state.tasks.map(task => (task.id === id ? { ...task, later: false, date: today } : task)) })
        return true
      },

      // Excluir a tarefa de uma repetição pula só aquele dia, para ela não voltar sozinha.
      deleteTask: id =>
        set(state => {
          const task = state.tasks.find(item => item.id === id)
          const rules =
            task?.ruleId && task.occurrence
              ? state.rules.map(rule =>
                  rule.id === task.ruleId && !rule.skipped.includes(task.occurrence!) ? { ...rule, skipped: [...rule.skipped, task.occurrence!] } : rule,
                )
              : state.rules
          return { tasks: state.tasks.filter(item => item.id !== id), rules }
        }),

      addRule: rule => {
        const id = `rep-${uid()}`
        set(state => ({ rules: [...state.rules, { ...rule, title: rule.title.trim(), id, skipped: [] }] }))
        return id
      },

      updateRule: (id, patch) => set(state => ({ rules: state.rules.map(rule => (rule.id === id ? { ...rule, ...patch } : rule)) })),

      removeRule: (id, today) =>
        set(state => ({
          rules: state.rules.filter(rule => rule.id !== id),
          tasks: state.tasks
            .filter(task => !(task.ruleId === id && task.status === 'pending' && task.date >= today))
            .map(task => (task.ruleId === id ? { ...task, ruleId: undefined, occurrence: undefined } : task)),
        })),

      materializeOccurrence: (ruleId, occurrence, date) => {
        const state = get()
        const rule = state.rules.find(item => item.id === ruleId)
        if (!rule) return null
        const existing = state.tasks.find(task => task.ruleId === ruleId && task.occurrence === occurrence)
        if (existing) return existing
        const task: Task = {
          id: `tarefa-${uid()}`,
          title: rule.title,
          goalId: rule.goalId,
          date,
          status: 'pending',
          origin: 'recurring',
          later: false,
          ruleId,
          occurrence,
        }
        set({ tasks: [...state.tasks, task] })
        return task
      },

      skipOccurrence: (id, date) =>
        set(state => ({
          rules: state.rules.map(rule => (rule.id === id && !rule.skipped.includes(date) ? { ...rule, skipped: [...rule.skipped, date] } : rule)),
          tasks: state.tasks.filter(task => !(task.ruleId === id && task.occurrence === date && task.status === 'pending')),
        })),

      ensureOccurrences: today =>
        set(state => {
          let changed = false
          // meta concluída pelo marco: as pendentes saem da agenda (Hoje, outros dias e Depois); as feitas ficam no histórico
          const concluded = new Set(
            state.goals
              .filter(goal => {
                const reached = marcoReachedOn(goal, state.goals, state.logs)
                return !!reached && reached <= today
              })
              .map(goal => goal.id),
          )
          let tasks = state.tasks.filter(task => {
            const drop = task.status === 'pending' && !!task.goalId && concluded.has(task.goalId)
            if (drop) changed = true
            return !drop
          })
          // ocorrências de dias passados que ficaram pendentes não se acumulam
          tasks = tasks.map(task => {
            if (!task.ruleId || task.status !== 'pending' || task.later || task.date >= today) return task
            changed = true
            return { ...task, status: 'not_done' as const }
          })
          const archived = new Set(state.areas.filter(area => area.archived).map(area => area.id))
          let count = todayTasks(tasks, today).length
          for (const rule of rulesOn(state.rules, state.goals, state.logs, today)) {
            const goal = state.goals.find(item => item.id === rule.goalId)
            if (goal && (archived.has(goal.areaId) || !isActiveOn(goal, state.goals, state.logs, today))) continue
            if (tasks.some(task => task.ruleId === rule.id && task.occurrence === today)) continue
            // uma tarefa da mesma meta já marcada para hoje vale como a ocorrência
            const same = rule.goalId ? tasks.find(task => task.goalId === rule.goalId && task.date === today && !task.ruleId) : undefined
            changed = true
            if (same) {
              tasks = tasks.map(task => (task === same ? { ...task, ruleId: rule.id, occurrence: today } : task))
              continue
            }
            const later = count >= state.settings.maxTasks
            if (!later) count++
            tasks = [
              ...tasks,
              {
                id: `tarefa-${uid()}`,
                title: rule.title,
                goalId: rule.goalId,
                date: today,
                status: 'pending',
                origin: 'recurring',
                later,
                ruleId: rule.id,
                occurrence: today,
              },
            ]
          }
          return changed ? { tasks } : state
        }),

      openDay: (today, { taskIds, suggestions, candidateIds }) =>
        set(state => {
          const chosen = new Set(taskIds)
          const candidates = new Set(candidateIds)
          const tasks = state.tasks.map(task => {
            if (!candidates.has(task.id)) return task
            // o que não foi escolhido espera em "Depois"
            return chosen.has(task.id) ? { ...task, date: today, later: false } : { ...task, later: true }
          })
          const created: Task[] = suggestions.map(item => ({
            id: `tarefa-${uid()}`,
            title: item.title,
            goalId: item.goalId,
            milestoneId: item.milestoneId,
            date: today,
            status: 'pending',
            origin: 'recurring',
            later: false,
          }))
          return { tasks: [...tasks, ...created], day: { openedOn: today, closedOn: state.day.closedOn === today ? null : state.day.closedOn } }
        }),

      closeDay: today => set(state => ({ day: { ...state.day, openedOn: state.day.openedOn ?? today, closedOn: today } })),
      reopenDay: () => set(state => ({ day: { ...state.day, closedOn: null } })),

      saveJournal: (date, patch) =>
        set(state => {
          const existing = state.journal.find(entry => entry.date === date)
          const next: JournalEntry = { id: existing?.id ?? `j-${date}`, date, text: '', goalIds: [], ...existing, ...patch }
          const empty = !next.text.trim() && next.mood === undefined && next.goalIds.length === 0
          const others = state.journal.filter(entry => entry.date !== date)
          return { journal: empty ? others : [...others, next] }
        }),

      deleteJournal: id => set(state => ({ journal: state.journal.filter(entry => entry.id !== id) })),

      runSchedule: (today, time) => {
        const state = get()
        const { summaries, retroYear } = dueSummaries(state, today, time)
        if (!summaries.length && retroYear === null) return
        const retros = { ...state.retros }
        if (retroYear !== null) {
          const current: Retro | undefined = retros[retroYear]
          const base: Retro = current ?? {
            year: retroYear,
            generatedAt: today,
            saved: false,
            banner: false,
            announced: false,
            pinned: false,
            letter: letterFor(state),
          }
          retros[retroYear] = { ...base, generatedAt: today, announced: true, banner: true }
        }
        set({ summaries: [...state.summaries, ...summaries], retros })
      },

      generateSummary: (kind, start, end, today) => {
        const state = get()
        const summary = { ...buildSummary(state, kind, start, end, today, state.settings.useAI), seen: true }
        set({ summaries: [...state.summaries.filter(item => item.id !== summary.id), summary] })
        return summary.id
      },

      updateSummary: (id, patch) => set(state => ({ summaries: state.summaries.map(summary => (summary.id === id ? { ...summary, ...patch } : summary)) })),

      ensureRetro: (year, today) =>
        set(state =>
          state.retros[year]
            ? state
            : {
                retros: {
                  ...state.retros,
                  [year]: { year, generatedAt: today, saved: false, banner: false, announced: false, pinned: false, letter: letterFor(state) },
                },
              },
        ),

      updateRetro: (year, patch) => set(state => (state.retros[year] ? { retros: { ...state.retros, [year]: { ...state.retros[year], ...patch } } } : state)),

      setReview: (key, text) => set(state => ({ reviews: { ...state.reviews, [key]: text } })),

      setSettings: patch => set(state => ({ settings: { ...state.settings, ...patch } })),

      finishOnboarding: areaIds =>
        set(state => {
          const keep = new Set(areaIds)
          const used = new Set(state.goals.map(goal => goal.areaId))
          return {
            onboarded: true,
            // áreas desmarcadas saem; as que têm metas de exemplo ficam arquivadas, sem perder nada
            areas: state.areas.filter(area => keep.has(area.id) || used.has(area.id)).map(area => (keep.has(area.id) ? area : { ...area, archived: true })),
          }
        }),

      resetAll: () => set(state => ({ ...createSeed(iso(new Date())), session: state.session })),

      importData: data =>
        set(state => ({
          ...data,
          // ajustes novos que o arquivo não conhece ficam com o valor atual
          settings: { ...state.settings, ...data.settings },
          session: state.session,
          onboarded: true,
        })),

      saveModule: (draft, id) => {
        const name = draft.name.trim()
        const { modules } = get()
        const current = modules.find(item => item.id === id)
        if (!name) return { ok: false, error: 'Dê um nome para o módulo.' }
        if (name.length > MAX_MODULE_NAME) return { ok: false, error: `Use até ${MAX_MODULE_NAME} caracteres.` }
        const lower = name.toLocaleLowerCase('pt-BR')
        if (modules.some(item => item.id !== id && !item.hidden && item.name.toLocaleLowerCase('pt-BR') === lower))
          return { ok: false, error: 'Já existe um módulo com esse nome.' }
        const custom = !current || current.kind === 'custom'
        const fields = (draft.fields ?? current?.fields ?? []).map(field => ({
          ...field,
          label: field.label.trim(),
          unit: field.type === 'number' ? field.unit?.trim() || undefined : undefined,
          options: field.type === 'choice' ? [...new Set((field.options ?? []).map(option => option.trim()).filter(Boolean))] : undefined,
        }))
        if (custom) {
          if (fields.length === 0) return { ok: false, error: 'Adicione pelo menos um campo para registrar.' }
          if (fields.length > MAX_FIELDS) return { ok: false, error: `Use até ${MAX_FIELDS} campos.` }
          if (fields.some(field => !field.label)) return { ok: false, error: 'Todo campo precisa de um nome.' }
          if (fields.some(field => field.type === 'choice' && (field.options?.length ?? 0) < 2))
            return { ok: false, error: 'Listas de opções precisam de pelo menos duas opções.' }
        }
        const goal = draft.goal && get().goals.some(item => item.id === draft.goal?.goalId) ? draft.goal : undefined
        if (current) {
          set({
            modules: modules.map(item =>
              item.id === id
                ? { ...item, name, icon: draft.icon, color: draft.color, fields: custom ? fields : item.fields, goal: custom ? goal : undefined }
                : item,
            ),
          })
          return { ok: true, id: current.id }
        }
        const newId = `mod-${uid()}`
        const order = Math.max(-1, ...modules.map(item => item.order)) + 1
        set({ modules: [...modules, { id: newId, kind: 'custom', name, icon: draft.icon, color: draft.color, order, fields, goal }] })
        return { ok: true, id: newId }
      },

      removeModule: (id, eraseData) =>
        set(state => {
          const target = state.modules.find(item => item.id === id)
          if (!target) return state
          if (target.kind === 'custom')
            return {
              modules: state.modules.filter(item => item.id !== id),
              // os registros já contados nas metas ficam; só os do módulo saem
              moduleEntries: state.moduleEntries.filter(entry => entry.moduleId !== id),
            }
          const modules = state.modules.map(item => (item.id === id ? { ...item, hidden: true } : item))
          if (!eraseData) return { modules }
          return target.kind === 'fitness' ? { modules, workouts: [], weights: [] } : { modules, subjects: [], studySessions: [] }
        }),

      restoreModule: id =>
        set(state => {
          const order = Math.max(-1, ...state.modules.filter(item => !item.hidden).map(item => item.order)) + 1
          return { modules: state.modules.map(item => (item.id === id ? { ...item, hidden: false, order } : item)) }
        }),

      moveModule: (id, direction) =>
        set(state => {
          const visible = state.modules.filter(item => !item.hidden).sort((a, b) => a.order - b.order)
          const index = visible.findIndex(item => item.id === id)
          const swap = visible[index + direction]
          if (index < 0 || !swap) return state
          const ids = visible.map(item => item.id)
          ;[ids[index], ids[index + direction]] = [ids[index + direction], ids[index]]
          return { modules: state.modules.map(item => (ids.includes(item.id) ? { ...item, order: ids.indexOf(item.id) } : item)) }
        }),

      // Se o módulo está ligado a uma meta, o registro conta para ela.
      addModuleEntry: entry =>
        set(state => {
          const mod = state.modules.find(item => item.id === entry.moduleId)
          const goal = state.goals.find(item => item.id === mod?.goal?.goalId)
          let log: LogEntry | null = null
          if (mod && goal && goal.metric.type !== 'milestones') {
            const raw = mod.goal?.fieldId ? entry.values[mod.goal.fieldId] : undefined
            const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined
            // frequência em horas soma o tempo (em minutos), como as metas de dias/tempo
            const countsTime = goal.metric.type === 'frequency' && tracksTime(goal.metric)
            const needsValue = goal.metric.type === 'sum' || goal.metric.type === 'value' || countsTime
            if (!needsValue || value !== undefined)
              log = {
                id: `log-${uid()}`,
                date: entry.date,
                goalId: goal.id,
                value: goal.metric.type === 'frequency' && !countsTime ? undefined : value,
                note: mod.name,
              }
          }
          return {
            moduleEntries: [...state.moduleEntries, { ...entry, id: `reg-${uid()}`, logId: log?.id }],
            logs: log ? [...state.logs, log] : state.logs,
          }
        }),

      removeModuleEntry: id =>
        set(state => {
          const logId = state.moduleEntries.find(entry => entry.id === id)?.logId
          return { moduleEntries: state.moduleEntries.filter(entry => entry.id !== id), logs: logId ? state.logs.filter(log => log.id !== logId) : state.logs }
        }),

      clearGoals: (mode, today) =>
        set(state => {
          const unlink = <T extends { logId?: string }>(items: T[]) => items.map(item => ({ ...item, logId: undefined }))
          if (mode === 'all')
            return {
              goals: [],
              logs: [],
              tasks: [],
              rules: [],
              journal: [],
              summaries: [],
              retros: {},
              reviews: {},
              workouts: [],
              weights: [],
              subjects: [],
              studySessions: [],
              // os módulos ficam (como as áreas), sem registros e sem vínculo com metas
              modules: state.modules.map(mod => ({ ...mod, goal: undefined })),
              moduleEntries: [],
              day: { openedOn: null, closedOn: null },
              startedAt: today,
            }
          return {
            goals: [],
            logs: [],
            // tarefas pendentes das metas saem; o histórico fica, sem o vínculo
            tasks: state.tasks
              .filter(task => !(task.goalId && task.status === 'pending'))
              .map(task => (task.goalId ? { ...task, goalId: undefined, milestoneId: undefined } : task)),
            // repetições das metas saem; as avulsas ficam
            rules: state.rules.filter(rule => !rule.goalId),
            journal: state.journal.map(entry => ({ ...entry, goalIds: [] })),
            subjects: state.subjects.map(subject => ({ ...subject, goalId: undefined })),
            workouts: unlink(state.workouts),
            weights: unlink(state.weights),
            studySessions: unlink(state.studySessions),
            modules: state.modules.map(mod => ({ ...mod, goal: undefined })),
            moduleEntries: unlink(state.moduleEntries),
          }
        }),

      signIn: session => set({ session }),
      signOut: () => set({ session: null }),

      // Com `goalId`, o treino conta também para a meta escolhida.
      addWorkout: (workout, goalId) =>
        set(state => {
          const linked = goalId && state.goals.some(goal => goal.id === goalId)
          const logId = linked ? `log-${uid()}` : undefined
          const entry: Workout = { ...workout, id: `treino-${uid()}`, logId }
          const note = workout.note || [kindOf(workout.kind).label, workoutMeta(entry)].filter(Boolean).join(' · ')
          return {
            workouts: [...state.workouts, entry],
            logs:
              linked && logId
                ? [
                    ...state.logs,
                    {
                      id: logId,
                      date: workout.date,
                      goalId,
                      note,
                      workout: workout.exercises?.length ? workout.exercises : undefined,
                      activity: { kind: workout.kind, minutes: workout.minutes, distanceKm: workout.distanceKm },
                    },
                  ]
                : state.logs,
          }
        }),

      removeWorkout: id =>
        set(state => {
          const logId = state.workouts.find(item => item.id === id)?.logId
          return { workouts: state.workouts.filter(item => item.id !== id), logs: logId ? state.logs.filter(log => log.id !== logId) : state.logs }
        }),

      addWeight: (date, kg, goalId) =>
        set(state => {
          const linked = goalId && state.goals.some(goal => goal.id === goalId)
          const logId = linked ? `log-${uid()}` : undefined
          return {
            weights: [...state.weights, { id: `peso-${uid()}`, date, kg, logId }],
            logs: linked && logId ? [...state.logs, { id: logId, date, goalId, value: kg }] : state.logs,
          }
        }),

      removeWeight: id =>
        set(state => {
          const logId = state.weights.find(item => item.id === id)?.logId
          return { weights: state.weights.filter(item => item.id !== id), logs: logId ? state.logs.filter(log => log.id !== logId) : state.logs }
        }),

      saveSubject: (draft, id) => {
        const name = draft.name.trim()
        const { subjects } = get()
        if (!name) return { ok: false, error: 'Dê um nome para a disciplina.' }
        if (name.length > 40) return { ok: false, error: 'Use até 40 caracteres.' }
        const lower = name.toLocaleLowerCase('pt-BR')
        if (subjects.some(subject => subject.id !== id && subject.name.toLocaleLowerCase('pt-BR') === lower))
          return { ok: false, error: 'Já existe uma disciplina com esse nome.' }
        if (id) {
          set({ subjects: subjects.map(subject => (subject.id === id ? { ...subject, ...draft, name } : subject)) })
          return { ok: true, id }
        }
        const newId = `disc-${uid()}`
        set({ subjects: [...subjects, { id: newId, ...draft, name }] })
        return { ok: true, id: newId }
      },

      // As sessões da disciplina saem junto; os registros de meta já feitos ficam.
      removeSubject: id =>
        set(state => ({
          subjects: state.subjects.filter(subject => subject.id !== id),
          studySessions: state.studySessions.filter(item => item.subjectId !== id),
        })),

      // Se a disciplina está ligada a uma meta, o tempo estudado conta para ela.
      addStudySession: session =>
        set(state => {
          const goalId = state.subjects.find(subject => subject.id === session.subjectId)?.goalId
          const linked = goalId && state.goals.some(goal => goal.id === goalId)
          const logId = linked ? `log-${uid()}` : undefined
          return {
            studySessions: [...state.studySessions, { ...session, id: `estudo-${uid()}`, logId }],
            logs: linked && logId ? [...state.logs, { id: logId, date: session.date, goalId, value: session.minutes }] : state.logs,
          }
        }),

      removeStudySession: id =>
        set(state => {
          const logId = state.studySessions.find(item => item.id === id)?.logId
          return { studySessions: state.studySessions.filter(item => item.id !== id), logs: logId ? state.logs.filter(log => log.id !== logId) : state.logs }
        }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
)
