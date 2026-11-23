import { fmt, mondayOf, shift } from '@/shared/format'
import type { StudySession, Subject } from '@/domain/types'

export type NoteKind = 'difficulty' | 'progress' | 'insight'

export const NOTE_LABEL: Record<NoteKind, string> = {
  difficulty: 'Dificuldade',
  progress: 'Progresso',
  insight: 'Insight',
}

const sum = (items: StudySession[], pick: (item: StudySession) => number | undefined) => items.reduce((total, item) => total + (pick(item) ?? 0), 0)

/** Acertos sobre questões feitas. `ratio` é nulo quando não há questões. */
export function accuracy(sessions: StudySession[]) {
  const answered = sessions.filter(item => item.questions)
  const questions = sum(answered, item => item.questions)
  const correct = sum(answered, item => item.correct)
  return { questions, correct, ratio: questions ? correct / questions : null }
}

export function weekStats(sessions: StudySession[], today: string) {
  const start = mondayOf(today)
  const week = sessions.filter(item => item.date >= start && item.date <= today)
  return { count: week.length, minutes: sum(week, item => item.minutes) }
}

export function subjectStats(subject: Subject, sessions: StudySession[]) {
  const mine = sessions.filter(item => item.subjectId === subject.id)
  return {
    subject,
    count: mine.length,
    minutes: sum(mine, item => item.minutes),
    last: mine
      .map(item => item.date)
      .sort()
      .at(-1),
    ...accuracy(mine),
  }
}

/** Minutos por disciplina e aproveitamento geral em cada uma das últimas `weeks` semanas. */
export function weeklySeries(sessions: StudySession[], subjects: Subject[], today: string, weeks = 8) {
  const first = shift(mondayOf(today), -(weeks - 1) * 7)
  return Array.from({ length: weeks }, (_, index) => {
    const start = shift(first, index * 7)
    const end = shift(start, 6)
    const week = sessions.filter(item => item.date >= start && item.date <= end)
    const row: Record<string, number | string | null> = { week: fmt(start, 'd/M'), percent: null }
    for (const subject of subjects)
      row[subject.id] = sum(
        week.filter(item => item.subjectId === subject.id),
        item => item.minutes,
      )
    const { ratio } = accuracy(week)
    row.percent = ratio === null ? null : Math.round(ratio * 100)
    return row
  })
}

export interface StudyNote {
  id: string
  kind: NoteKind
  text: string
  date: string
  subjectId: string
}

/** Dificuldades, progressos e insights anotados nas sessões, do mais recente para o mais antigo. */
export function notesOf(sessions: StudySession[]): StudyNote[] {
  const notes: StudyNote[] = []
  for (const session of sessions)
    for (const kind of ['difficulty', 'progress', 'insight'] as const) {
      const text = session[kind]?.trim()
      if (text) notes.push({ id: `${session.id}-${kind}`, kind, text, date: session.date, subjectId: session.subjectId })
    }
  return notes.sort((a, b) => b.date.localeCompare(a.date))
}
