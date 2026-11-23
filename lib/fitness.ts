import { BicepsFlexed, Activity, Bike, Dumbbell, Footprints, Music, PersonStanding, Wind, type LucideIcon } from 'lucide-react'
import { logsOf } from './goals'
import { minutesLabel, mondayOf, num1, shift, shortDay } from './format'
import type { Area, BodyWeight, Goal, LogEntry, Workout, WorkoutKind, WorkoutSet } from './types'

export const WORKOUT_KINDS: { value: WorkoutKind; label: string; icon: LucideIcon; distance: boolean; exercises: boolean }[] = [
  { value: 'musculacao', label: 'Musculação', icon: Dumbbell, distance: false, exercises: true },
  { value: 'calistenia', label: 'Calistenia', icon: BicepsFlexed, distance: false, exercises: true },
  { value: 'alongamento', label: 'Alongamento', icon: PersonStanding, distance: false, exercises: false },
  { value: 'caminhada', label: 'Caminhada', icon: Footprints, distance: true, exercises: false },
  { value: 'corrida', label: 'Corrida', icon: Wind, distance: true, exercises: false },
  { value: 'bicicleta', label: 'Bicicleta', icon: Bike, distance: true, exercises: false },
  { value: 'danca', label: 'Dança', icon: Music, distance: false, exercises: false },
  { value: 'outro', label: 'Outro', icon: Activity, distance: false, exercises: false },
]

/** Palavras que indicam o tipo de atividade pelo nome da meta. A ordem importa: o mais específico primeiro. */
const KIND_HINTS: [RegExp, WorkoutKind][] = [
  [/along|yoga|pilates|mobilidade|flexib/i, 'alongamento'],
  [/calistenia|barra fixa|flex(ã|a)o/i, 'calistenia'],
  [/corr(er|ida)|running|\bcooper\b/i, 'corrida'],
  [/caminh/i, 'caminhada'],
  [/bike|bicicleta|pedal|ciclismo|spinning/i, 'bicicleta'],
  [/dan(ç|c)a|forr(ó|o)|zumba|ballet|bal(é|e)/i, 'danca'],
  [/muscula|academia|muscula(ç|c)(ã|a)o|gym|peso livre|hipertrofia/i, 'musculacao'],
]
const FITNESS_WORDS = /trein|exerc|academia|muscula|fitness|esporte|atividade f(í|i)sica|nata(ç|c)|nadar|luta|crossfit|funcional/i
const FITNESS_ICONS = new Set(['dumbbell', 'activity', 'bike', 'footprints'])

/**
 * A meta de frequência é de treino? Sim se já tem treinos registrados, se o nome fala de atividade física
 * ou se a área usa um ícone de exercício. Metas como "ler 3x por semana" ficam de fora.
 */
export function isFitnessGoal(goal: Goal, logs: LogEntry[], areas: Area[]) {
  if (goal.metric.type !== 'frequency') return false
  if (logsOf(logs, goal.id).some(log => log.activity || log.workout?.length)) return true
  const text = `${goal.title} ${goal.taskTitle} ${goal.description}`
  if (FITNESS_WORDS.test(text) || KIND_HINTS.some(([pattern]) => pattern.test(text))) return true
  return FITNESS_ICONS.has(areas.find(area => area.id === goal.areaId)?.icon ?? '')
}

/** Tipo sugerido no registro: o último usado nesta meta ou o que o nome indica. Sem pista, nenhum. */
export function guessKind(goal: Goal, logs: LogEntry[]): WorkoutKind | undefined {
  const last = [...logsOf(logs, goal.id)].reverse().find(log => log.activity || log.workout?.length)
  if (last) return last.activity?.kind ?? 'musculacao'
  const text = `${goal.title} ${goal.taskTitle} ${goal.description}`
  return KIND_HINTS.find(([pattern]) => pattern.test(text))?.[1]
}

/** "Caminhada · 40 min · 3,2 km" */
export function activityText(activity: NonNullable<LogEntry['activity']>) {
  return [kindOf(activity.kind).label, activity.minutes ? minutesLabel(activity.minutes) : '', activity.distanceKm ? `${num1(activity.distanceKm)} km` : ''].filter(Boolean).join(' · ')
}

export const kindOf = (kind: WorkoutKind) => WORKOUT_KINDS.find(item => item.value === kind) ?? WORKOUT_KINDS[WORKOUT_KINDS.length - 1]

export function setText(set: WorkoutSet) {
  const volume = set.sets && set.reps ? `${set.sets}x${set.reps}` : set.sets ? `${set.sets} ${set.sets === 1 ? 'série' : 'séries'}` : ''
  return [set.exercise, volume, set.weight ? `${num1(set.weight)} kg` : ''].filter(Boolean).join(' · ')
}

/** "60 min · 3,2 km" */
export function workoutMeta(workout: Workout) {
  return [workout.minutes ? minutesLabel(workout.minutes) : '', workout.distanceKm ? `${num1(workout.distanceKm)} km` : ''].filter(Boolean).join(' · ')
}

export function weekStats(workouts: Workout[], today: string) {
  const start = mondayOf(today)
  const week = workouts.filter(item => item.date >= start && item.date <= today)
  return { count: week.length, minutes: week.reduce((sum, item) => sum + (item.minutes ?? 0), 0) }
}

/** Treinos e minutos por tipo nos últimos `days` dias, do mais frequente para o menos. */
export function kindBreakdown(workouts: Workout[], today: string, days = 30) {
  const from = shift(today, -(days - 1))
  const map = new Map<WorkoutKind, { count: number; minutes: number }>()
  for (const item of workouts) {
    if (item.date < from || item.date > today) continue
    const entry = map.get(item.kind) ?? { count: 0, minutes: 0 }
    entry.count++
    entry.minutes += item.minutes ?? 0
    map.set(item.kind, entry)
  }
  return [...map].map(([kind, value]) => ({ kind, ...value })).sort((a, b) => b.count - a.count)
}

export interface LoadPoint {
  date: string
  label: string
  weight: number
}

/** Maior carga de cada exercício por dia, só para exercícios com dois registros ou mais. */
export function loadSeries(workouts: Workout[]): { exercise: string; points: LoadPoint[] }[] {
  const map = new Map<string, Map<string, number>>()
  for (const workout of workouts)
    for (const set of workout.exercises ?? []) {
      if (!set.weight) continue
      const name = set.exercise.trim()
      const days = map.get(name) ?? new Map<string, number>()
      days.set(workout.date, Math.max(days.get(workout.date) ?? 0, set.weight))
      map.set(name, days)
    }
  return [...map]
    .map(([exercise, days]) => ({
      exercise,
      points: [...days].sort(([a], [b]) => a.localeCompare(b)).map(([date, weight]) => ({ date, label: shortDay(date), weight })),
    }))
    .filter(series => series.points.length >= 2)
    .sort((a, b) => b.points.length - a.points.length)
}

export const weightSeries = (weights: BodyWeight[]) =>
  [...weights].sort((a, b) => a.date.localeCompare(b.date)).map(item => ({ date: item.date, label: shortDay(item.date), kg: item.kg }))
