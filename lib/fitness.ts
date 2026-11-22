import { Activity, Bike, Dumbbell, Footprints, Music, PersonStanding, Wind, type LucideIcon } from 'lucide-react'
import { minutesLabel, mondayOf, num1, shift, shortDay } from './format'
import type { BodyWeight, Workout, WorkoutKind, WorkoutSet } from './types'

export const WORKOUT_KINDS: { value: WorkoutKind; label: string; icon: LucideIcon; distance: boolean; exercises: boolean }[] = [
  { value: 'musculacao', label: 'Musculação', icon: Dumbbell, distance: false, exercises: true },
  { value: 'calistenia', label: 'Calistenia', icon: PersonStanding, distance: false, exercises: true },
  { value: 'caminhada', label: 'Caminhada', icon: Footprints, distance: true, exercises: false },
  { value: 'corrida', label: 'Corrida', icon: Wind, distance: true, exercises: false },
  { value: 'bicicleta', label: 'Bicicleta', icon: Bike, distance: true, exercises: false },
  { value: 'danca', label: 'Dança', icon: Music, distance: false, exercises: false },
  { value: 'outro', label: 'Outro', icon: Activity, distance: false, exercises: false },
]

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
