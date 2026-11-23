'use client'

import { parseISO } from 'date-fns'
import { useEffect, useMemo, useState } from 'react'
import { fmt, iso } from '@/shared/format'
import { useStore } from '@/shared/store'

/** Relógio do app. Com data simulada, mantém a hora real do aparelho. */
export function appNow(demoDate: string | null) {
  const now = new Date()
  if (!demoDate) return now
  const date = parseISO(demoDate)
  date.setHours(now.getHours(), now.getMinutes(), now.getSeconds())
  return date
}

/** O dia só vira no horário configurado (padrão 04:00). */
export function appDay(now: Date, rollover: string) {
  const [hours, minutes] = rollover.split(':').map(Number)
  const day = new Date(now)
  if (day.getHours() * 60 + day.getMinutes() < hours * 60 + minutes) day.setDate(day.getDate() - 1)
  return iso(day)
}

export type DayPart = 'morning' | 'afternoon' | 'night'

export function useClock() {
  const demoDate = useStore(state => state.settings.demoDate)
  const rollover = useStore(state => state.settings.rollover)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const bump = () => setTick(value => value + 1)
    const id = window.setInterval(bump, 60_000)
    window.addEventListener('focus', bump)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', bump)
    }
  }, [])

  return useMemo(() => {
    const now = appNow(demoDate)
    const hour = now.getHours()
    const part: DayPart = hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'night'
    return { now, today: appDay(now, rollover), time: fmt(now, 'HH:mm'), part }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoDate, rollover, tick])
}
