'use client'

import { useMemo, useState } from 'react'
import { TopBar } from '@/components/app-shell'
import { AreaIcon, BackButton } from '@/components/common'
import { Illustration } from '@/components/illustration'
import { Segmented } from '@/components/ui/controls'
import { cap, fmt, mondayOf } from '@/shared/format'
import { periodStats } from '@/domain/goals'
import { useStore } from '@/shared/store'
import { useClock } from '@/shared/time'

type Period = 'week' | 'month'

/** Revisão semanal ou mensal: o que andou, o que ficou parado e um espaço para refletir. */
export default function ReviewPage() {
  const { today } = useClock()
  const goals = useStore(state => state.goals)
  const logs = useStore(state => state.logs)
  const tasks = useStore(state => state.tasks)
  const journal = useStore(state => state.journal)
  const areas = useStore(state => state.areas)
  const reviews = useStore(state => state.reviews)
  const setReview = useStore(state => state.setReview)
  const [period, setPeriod] = useState<Period>('week')

  const start = period === 'week' ? mondayOf(today) : `${today.slice(0, 7)}-01`
  const key = `${period}:${start}`
  const stats = useMemo(() => periodStats({ goals, logs, tasks, journal }, start, today), [goals, logs, tasks, journal, start, today])
  const label = period === 'week' ? `Semana de ${fmt(start, "d 'de' MMMM")}` : cap(fmt(start, "MMMM 'de' yyyy"))
  const areaOf = (areaId: string) => areas.find(area => area.id === areaId)

  return (
    <div className="pb-10">
      <TopBar title="Revisão" back={<BackButton href="/diario" label="Voltar para o Diário" />} />
      <div className="px-5">
        <div className="flex justify-center">
          <Illustration name="review-header" height={140} />
        </div>
        <Segmented
          className="mt-3"
          label="Período"
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'week', label: 'Semana' },
            { value: 'month', label: 'Mês' },
          ]}
        />
        <p className="mt-3 text-[13px] text-muted">{label}, até hoje.</p>

        <section className="mt-5" aria-labelledby="avancou">
          <h2 id="avancou" className="mb-2 text-[15px] font-medium">
            Metas que avançaram
          </h2>
          {stats.advanced.length === 0 ? (
            <p className="card p-4 text-muted">Nenhum registro neste período ainda.</p>
          ) : (
            <ul className="card divide-y-[0.5px] divide-line">
              {stats.advanced.map(({ goal, text }) => (
                <li key={goal.id} className="flex min-h-12 items-center gap-3 px-4 py-2">
                  <AreaIcon area={areaOf(goal.areaId)} />
                  <span className="min-w-0 flex-1 truncate text-[14px]">{goal.title}</span>
                  <span className="shrink-0 text-[12px] text-muted">{text}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-5" aria-labelledby="parado">
          <h2 id="parado" className="mb-2 text-[15px] font-medium">
            Metas que ficaram paradas
          </h2>
          {stats.stalled.length === 0 ? (
            <p className="card p-4 text-muted">Todas tiveram algum movimento.</p>
          ) : (
            <ul className="card divide-y-[0.5px] divide-line">
              {stats.stalled.map(goal => (
                <li key={goal.id} className="flex min-h-12 items-center gap-3 px-4 py-2">
                  <AreaIcon area={areaOf(goal.areaId)} />
                  <span className="min-w-0 flex-1 truncate text-[14px]">{goal.title}</span>
                  <span className="shrink-0 text-[12px] text-muted">ficou para depois</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-5" aria-labelledby="tarefas">
          <h2 id="tarefas" className="mb-2 text-[15px] font-medium">
            Tarefas
          </h2>
          <dl className="grid grid-cols-3 gap-2">
            {[
              [stats.tasks.done, 'feitas'],
              [stats.tasks.dismissed, 'dispensadas'],
              [stats.tasks.notDone, 'não feitas'],
            ].map(([value, name]) => (
              <div key={name} className="card flex flex-col-reverse p-3 text-center">
                <dt className="text-[12px] text-muted">{name}</dt>
                <dd className="text-[22px] font-medium tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[12px] text-muted">Dispensadas não contam como falha nem pesam no ritmo das metas.</p>
        </section>

        <section className="mt-5" aria-labelledby="reflexao">
          <h2 id="reflexao" className="mb-2 text-[15px] font-medium">
            Reflexão
          </h2>
          <textarea
            aria-labelledby="reflexao"
            className="field voice min-h-36 text-[15px]"
            placeholder="O que funcionou? O que você quer ajustar?"
            value={reviews[key] ?? ''}
            onChange={event => setReview(key, event.target.value)}
          />
          <p className="mt-1.5 text-[12px] text-muted">O texto é salvo enquanto você escreve.</p>
        </section>
      </div>
    </div>
  )
}
