'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { MAX_ACTIVE_AREAS, MAX_AREA_NAME } from './areas'
import { STORAGE_KEY } from './constants'
import { iso, uid } from './format'
import { todayTasks, type Suggestion } from './goals'
import { createSeed, DEFAULT_LETTER } from './seed'
import { buildSummary, dueSummaries } from './summaries'
import type { AppData, Area, ColorKey, Goal, JournalEntry, LogEntry, Retro, Session, Settings, StudySession, Summary, Task, Workout } from './types'
import { kindOf, workoutMeta } from './fitness'

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
  addTask: (input: { title: string; goalId?: string; milestoneId?: string }, today: string) => 'today' | 'later'
  completeTask: (id: string, log: Partial<LogEntry> | null, today: string) => void
  uncompleteTask: (id: string) => void
  moveTask: (id: string, date: string) => void
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
}

export type Store = AppData & Actions

const activeAreas = (areas: Area[]) => areas.filter(area => !area.archived)

type Modules = Pick<AppData, 'workouts' | 'weights' | 'studySessions'>

/**
 * Um registro feito numa meta (em Hoje ou no detalhe da meta) aparece também no módulo:
 * treino com exercícios vira treino, medição em kg vira peso e tempo de uma meta
 * ligada a uma disciplina vira sessão de estudo.
 */
function mirror(state: AppData, log: LogEntry): Partial<Modules> {
  const goal = state.goals.find(item => item.id === log.goalId)
  if (!goal) return {}
  if (log.workout?.length)
    return { workouts: [...state.workouts, { id: `treino-${uid()}`, date: log.date, kind: 'musculacao', exercises: log.workout, note: log.note, logId: log.id }] }
  if (goal.metric.type === 'value' && goal.metric.unit.trim().toLowerCase() === 'kg' && log.value != null)
    return { weights: [...state.weights, { id: `peso-${uid()}`, date: log.date, kg: log.value, logId: log.id }] }
  if (goal.metric.type === 'days' && log.value) {
    const subject = state.subjects.find(item => item.goalId === goal.id)
    if (subject) return { studySessions: [...state.studySessions, { id: `estudo-${uid()}`, date: log.date, subjectId: subject.id, minutes: log.value, logId: log.id }] }
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
          goals: state.goals.filter(goal => goal.id !== id),
          logs: state.logs.filter(log => log.goalId !== id),
          tasks: state.tasks
            .filter(task => !(task.goalId === id && task.status === 'pending'))
            .map(task => (task.goalId === id ? { ...task, goalId: undefined, milestoneId: undefined } : task)),
          journal: state.journal.map(entry => ({ ...entry, goalIds: entry.goalIds.filter(goalId => goalId !== id) })),
          subjects: state.subjects.map(subject => (subject.goalId === id ? { ...subject, goalId: undefined } : subject)),
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

      addTask: (input, today) => {
        const state = get()
        const later = todayTasks(state.tasks, today).length >= state.settings.maxTasks
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
            tasks: state.tasks.map(item => (item.id === id ? { ...item, status: 'done' as const } : item)),
          }
        }),

      uncompleteTask: id =>
        set(state => ({
          ...unmirror(state, new Set(state.logs.filter(log => log.taskId === id).map(log => log.id))),
          logs: state.logs.filter(log => log.taskId !== id),
          tasks: state.tasks.map(task => (task.id === id ? { ...task, status: 'pending' as const } : task)),
        })),

      moveTask: (id, date) => set(state => ({ tasks: state.tasks.map(task => (task.id === id ? { ...task, date, later: false } : task)) })),

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

      deleteTask: id => set(state => ({ tasks: state.tasks.filter(task => task.id !== id) })),

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
          const base: Retro = current ?? { year: retroYear, generatedAt: today, saved: false, banner: false, announced: false, pinned: false, letter: DEFAULT_LETTER }
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

      updateSummary: (id, patch) =>
        set(state => ({ summaries: state.summaries.map(summary => (summary.id === id ? { ...summary, ...patch } : summary)) })),

      ensureRetro: (year, today) =>
        set(state =>
          state.retros[year]
            ? state
            : {
                retros: {
                  ...state.retros,
                  [year]: { year, generatedAt: today, saved: false, banner: false, announced: false, pinned: false, letter: DEFAULT_LETTER },
                },
              },
        ),

      updateRetro: (year, patch) =>
        set(state => (state.retros[year] ? { retros: { ...state.retros, [year]: { ...state.retros[year], ...patch } } } : state)),

      setReview: (key, text) => set(state => ({ reviews: { ...state.reviews, [key]: text } })),

      setSettings: patch => set(state => ({ settings: { ...state.settings, ...patch } })),

      finishOnboarding: areaIds =>
        set(state => {
          const keep = new Set(areaIds)
          const used = new Set(state.goals.map(goal => goal.areaId))
          return {
            onboarded: true,
            // áreas desmarcadas saem; as que têm metas de exemplo ficam arquivadas, sem perder nada
            areas: state.areas
              .filter(area => keep.has(area.id) || used.has(area.id))
              .map(area => (keep.has(area.id) ? area : { ...area, archived: true })),
          }
        }),

      resetAll: () => set(state => ({ ...createSeed(iso(new Date())), session: state.session })),

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
            logs: linked && logId ? [...state.logs, { id: logId, date: workout.date, goalId, note, workout: workout.exercises?.length ? workout.exercises : undefined }] : state.logs,
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
        if (subjects.some(subject => subject.id !== id && subject.name.toLocaleLowerCase('pt-BR') === lower)) return { ok: false, error: 'Já existe uma disciplina com esse nome.' }
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
        set(state => ({ subjects: state.subjects.filter(subject => subject.id !== id), studySessions: state.studySessions.filter(item => item.subjectId !== id) })),

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
