'use client'

import Link from 'next/link'
import { useMemo, type ReactNode } from 'react'
import { areaColor } from '@/lib/areas'
import { fmt, shortDay } from '@/lib/format'
import { inRange, paceOf, periodStats, progressOf } from '@/lib/goals'
import { useStore } from '@/lib/store'
import { useClock } from '@/lib/time'
import { useShell } from './app-shell'
import { AreaIcon } from './common'
import { GoalChart, MoodChart } from './goal-visuals'
import type { IllustrationName } from './illustration'
import { Button, buttonVariants } from './ui/button'
import { ProgressBar } from './ui/controls'

export interface RetroCard {
  key: string
  title: string
  art?: IllustrationName
  /** frase na fonte de voz logo abaixo do título */
  lead?: string
  body?: ReactNode
}

/**
 * Os cartões da retrospectiva anual, uma ideia por cartão.
 * A mesma lista alimenta a história em tela cheia e a página de leitura.
 */
export function useRetroCards(year: number): RetroCard[] | null {
  const { today } = useClock()
  const { toast } = useShell()
  const retro = useStore(state => state.retros[year])
  const goals = useStore(state => state.goals)
  const logs = useStore(state => state.logs)
  const tasks = useStore(state => state.tasks)
  const journal = useStore(state => state.journal)
  const areas = useStore(state => state.areas)
  const startedAt = useStore(state => state.startedAt)
  const updateRetro = useStore(state => state.updateRetro)

  const data = useMemo(() => {
    const start = `${year}-01-01`
    const end = today < `${year}-12-31` ? today : `${year}-12-31`
    const stats = periodStats({ goals, logs, tasks, journal }, start, end)
    const dates = [...logs.map(log => log.date), ...journal.map(entry => entry.date)].filter(date => inRange(date, start, end)).sort()
    const yearGoals = goals.filter(goal => goal.startDate <= end)
    const ranked = yearGoals
      .map(goal => ({ goal, ratio: stats.advanced.find(item => item.goal.id === goal.id)?.ratio ?? 0, progress: progressOf(goal, logs, end), pace: paceOf(goal, logs, tasks, end) }))
      .sort((a, b) => b.ratio - a.ratio)
    const byMonth = new Map<string, number[]>()
    for (const item of stats.moods) byMonth.set(item.date.slice(0, 7), [...(byMonth.get(item.date.slice(0, 7)) ?? []), item.mood])
    const moods = [...byMonth].map(([month, values]) => ({ label: fmt(`${month}-01`, 'MMM'), mood: values.reduce((sum, value) => sum + value, 0) / values.length }))
    return { start, end, stats, first: dates[0] ?? start, yearGoals, ranked, moods }
  }, [year, today, goals, logs, tasks, journal])

  if (!retro) return null

  const { stats, ranked, end } = data
  const areaOf = (areaId: string) => areas.find(area => area.id === areaId)
  const activeAreas = areas.filter(area => !area.archived).sort((a, b) => a.order - b.order)
  const later = ranked.filter(item => item.pace.status === 'behind' || stats.stalled.some(goal => goal.id === item.goal.id))
  const carry = ranked.filter(item => item.pace.status !== 'done').slice(0, 3)
  const charts = (['sum', 'value', 'frequency'] as const).map(type => data.yearGoals.find(goal => goal.metric.type === type)).filter(goal => !!goal)
  const lateStart = startedAt.startsWith(String(year)) && Number(startedAt.slice(5, 7)) >= 4

  const cards: RetroCard[] = [
    {
      key: 'capa',
      title: `Seu ${year}`,
      art: 'year-retro',
      lead: `De ${fmt(data.first, 'MMMM')} a ${fmt(end, "MMMM 'de' yyyy")}.`,
    },
  ]

  if (lateStart)
    cards.push({
      key: 'comeco',
      title: `Você começou em ${fmt(startedAt, 'MMMM')}.`,
      art: 'retro-start',
      lead: 'Este ano foi o ponto de partida.',
    })

  cards.push(
    {
      key: 'numeros',
      title: 'O ano em números',
      art: 'review-header',
      body: (
        <dl className="grid grid-cols-3 gap-2">
          {[
            [stats.journalDays, 'dias com diário'],
            [stats.tasks.done, 'tarefas feitas'],
            [data.yearGoals.length, 'metas ativas'],
          ].map(([value, label]) => (
            <div key={label} className="card flex flex-col-reverse p-3 text-center">
              <dt className="text-[12px] text-muted">{label}</dt>
              <dd className="text-[26px] leading-tight font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      ),
    },
    {
      key: 'areas',
      title: 'Por área',
      art: 'retro-areas',
      body: (
        <ul className="card divide-y-[0.5px] divide-line">
          {activeAreas.map(area => {
            const moved = stats.advanced.find(item => item.goal.areaId === area.id)
            const waiting = data.yearGoals.find(goal => goal.areaId === area.id)
            const line = moved ? `${moved.goal.title}: ${moved.text}.` : waiting ? `${waiting.title} ficou para depois.` : 'Espaço aberto para o próximo ano.'
            return (
              <li key={area.id} className="flex items-center gap-3 px-3 py-2.5">
                <AreaIcon area={area} size={28} />
                <div className="min-w-0">
                  <p className="text-[14px] font-medium">{area.name}</p>
                  <p className="text-[13px] text-muted">{line}</p>
                </div>
              </li>
            )
          })}
        </ul>
      ),
    },
    {
      key: 'metas',
      title: 'Metas que mais avançaram',
      art: 'goals-empty',
      body: (
        <ul className="card flex flex-col gap-4 p-4">
          {ranked.slice(0, 4).map(({ goal, ratio, progress, pace }) => (
            <li key={goal.id}>
              <div className="mb-1.5 flex items-center gap-2">
                <AreaIcon area={areaOf(goal.areaId)} />
                <span className="min-w-0 flex-1 truncate text-[14px]">{goal.title}</span>
                {pace.status === 'done' && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[12px]">concluída</span>}
              </div>
              <ProgressBar value={ratio} color={areaColor(areaOf(goal.areaId)?.color)} label={goal.title} />
              <p className="mt-1 text-[12px] text-muted">{goal.metric.type === 'frequency' ? (stats.advanced.find(item => item.goal.id === goal.id)?.text ?? progress.label) : progress.label}</p>
            </li>
          ))}
        </ul>
      ),
    },
    {
      key: 'evolucao',
      title: 'Evolução ao longo do ano',
      body: (
        <div className="flex flex-col gap-3">
          {charts.map(goal => (
            <div key={goal.id} className="card p-3">
              <p className="mb-1 flex items-center gap-2 text-[13px]">
                <AreaIcon area={areaOf(goal.areaId)} />
                {goal.title}
              </p>
              <GoalChart goal={goal} logs={logs} today={end} height={116} />
            </div>
          ))}
        </div>
      ),
    },
    {
      key: 'humor',
      title: 'A linha do humor',
      art: 'retro-mood',
      lead: 'A média de cada mês, entre dias mais leves e dias mais cheios.',
      body: (
        <div className="card p-3">
          <MoodChart data={data.moods} height={130} />
        </div>
      ),
    },
    {
      key: 'trechos',
      title: 'Trechos que marcaram',
      art: 'journal-empty',
      body: (
        <ul className="flex flex-col gap-4">
          {stats.quotes.map(quote => (
            <li key={quote.date} className="border-l-2 border-primary pl-3">
              <blockquote className="voice text-[16px] leading-[1.7]">“{quote.text}”</blockquote>
              <p className="mt-1 text-[12px] text-muted">{shortDay(quote.date)}</p>
            </li>
          ))}
        </ul>
      ),
    },
    {
      key: 'depois',
      title: 'O que ficou para depois',
      art: 'retro-later',
      lead: later.length ? 'Nem tudo andou no mesmo ritmo, e isso faz parte. Estas metas seguem com você, se ainda fizerem sentido.' : 'Todas as metas tiveram movimento neste ano.',
      body: later.length ? (
        <ul className="card divide-y-[0.5px] divide-line">
          {later.map(({ goal, progress }) => (
            <li key={goal.id} className="flex items-center gap-3 px-3 py-2.5">
              <AreaIcon area={areaOf(goal.areaId)} size={28} />
              <div className="min-w-0">
                <p className="text-[14px]">{goal.title}</p>
                <p className="text-[12px] text-muted">{progress.label}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : undefined,
    },
    {
      key: 'carta',
      title: `Carta para ${year + 1}`,
      art: 'retro-letter',
      body: (
        <div className="flex flex-col gap-4">
          <textarea
            aria-label={`Carta para você em ${year + 1}`}
            className="field voice min-h-40 text-[15px]"
            value={retro.letter}
            onChange={event => updateRetro(year, { letter: event.target.value })}
          />
          {carry.length > 0 && (
            <div>
              <p className="mb-2 text-[13px] text-muted">Três metas para levar adiante</p>
              <ul className="card divide-y-[0.5px] divide-line">
                {carry.map(({ goal }) => (
                  <li key={goal.id} className="flex min-h-11 items-center gap-3 px-3 text-[14px]">
                    <AreaIcon area={areaOf(goal.areaId)} />
                    {goal.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'final',
      title: 'Isso foi só o começo.',
      art: 'retro-final',
      lead: 'Guarde o que viveu e escolha o que levar adiante.',
      body: (
        <div className="flex flex-col gap-2">
          <Button
            block
            onClick={() => {
              updateRetro(year, { saved: true, banner: false })
              toast('Retrospectiva guardada em Diário, na aba Resumos')
            }}
          >
            {retro.saved ? 'Retrospectiva guardada' : 'Guardar retrospectiva'}
          </Button>
          <Link href={`/metas/nova?ano=${year + 1}`} className={buttonVariants({ variant: 'outline', block: true })}>
            Criar metas de {year + 1}
          </Link>
        </div>
      ),
    },
  )

  return cards
}
