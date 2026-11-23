'use client'

import { Eraser, Plus, Settings2, Target } from 'lucide-react'
import { ESTHER, EstherAvatar } from '@/components/esther'
import Link from 'next/link'
import { useState } from 'react'
import { AreaChip, AreaIcon, EmptyState, PacePill } from '@/components/common'
import { goalArt, GoalProgress } from '@/components/goal-visuals'
import { Illustration } from '@/components/illustration'
import { ClearGoalsSheet } from '@/components/clear-goals'
import { Button, buttonVariants } from '@/components/ui/button'
import { Chip, ScrollRow } from '@/components/ui/controls'
import { weekStats as fitnessWeek } from '@/lib/fitness'
import { minutesLabel, plural } from '@/lib/format'
import { paceOf, progressOf, streakOf } from '@/lib/goals'
import { moduleCardText, moduleHref } from '@/lib/modules'
import { weekStats as studyWeekStats } from '@/lib/study'
import { useStore } from '@/lib/store'
import { useClock } from '@/lib/time'
import { cn } from '@/lib/utils'

export default function GoalsPage() {
  const { today } = useClock()
  const areas = useStore(state => state.areas)
  const goals = useStore(state => state.goals)
  const logs = useStore(state => state.logs)
  const tasks = useStore(state => state.tasks)
  const hideStreaks = useStore(state => state.settings.hideStreaks)
  const [filter, setFilter] = useState('all')
  const [clearing, setClearing] = useState(false)
  const fitWeek = fitnessWeek(useStore(state => state.workouts), today)
  const studyWeek = studyWeekStats(useStore(state => state.studySessions), today)
  const allModules = useStore(state => state.modules)
  const entries = useStore(state => state.moduleEntries)
  const modules = allModules.filter(module => !module.hidden).sort((a, b) => a.order - b.order)

  const ordered = [...areas].sort((a, b) => Number(a.archived) - Number(b.archived) || a.order - b.order)
  const active = ordered.filter(area => !area.archived)
  const current = active.some(area => area.id === filter) ? filter : 'all'
  const groups = ordered
    .filter(area => current === 'all' || area.id === current)
    .map(area => ({ area, goals: goals.filter(goal => goal.areaId === area.id) }))
    .filter(group => group.goals.length)

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-start gap-3 px-5 pt-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-medium">Metas</h1>
          <p className="text-[13px] text-muted">O que importa em {today.slice(0, 4)}, no seu ritmo.</p>
        </div>
        <Link href="/metas/ia" className={cn(buttonVariants({ variant: 'soft', size: 'sm' }), 'shrink-0 rounded-full pl-1.5')}>
          <EstherAvatar size={30} />
          Criar com a {ESTHER}
        </Link>
      </header>

      <section aria-labelledby="modulos-titulo" className="mt-4 px-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="modulos-titulo" className="text-[13px] text-muted">
            Módulos
          </h2>
          <Link href="/modulos" className="-mr-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-[13px] text-primary">
            <Settings2 size={16} strokeWidth={1.75} aria-hidden />
            Gerenciar
          </Link>
        </div>
        <nav aria-label="Módulos" className="grid grid-cols-2 gap-3">
          {modules.map(module => {
            const text =
              module.kind === 'fitness'
                ? `${fitWeek.count} ${plural(fitWeek.count, 'treino', 'treinos')} na semana`
                : module.kind === 'study'
                  ? `${studyWeek.minutes ? minutesLabel(studyWeek.minutes) : '0 min'} na semana`
                  : moduleCardText(module, entries.filter(entry => entry.moduleId === module.id), today)
            return (
              <Link key={module.id} href={moduleHref(module)} className="card flex items-center gap-3 p-3">
                <AreaIcon area={module} size={40} />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium">{module.name}</span>
                  <span className="block text-[12px] leading-snug text-muted">{text}</span>
                </span>
              </Link>
            )
          })}
          <Link href="/modulos" className="card flex min-h-16 items-center gap-3 border-dashed p-3 text-muted">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
              <Plus size={20} strokeWidth={1.75} />
            </span>
            <span className="text-[14px]">Novo módulo</span>
          </Link>
        </nav>
      </section>

      <div className="mt-3">
      <ScrollRow className="px-5 pb-1" label="Filtrar por área">
        <Chip selected={current === 'all'} onClick={() => setFilter('all')}>
          Todas
        </Chip>
        {active.map(area => (
          <Chip key={area.id} selected={current === area.id} onClick={() => setFilter(area.id)} className="pl-2">
            <AreaIcon area={area} />
            {area.name}
          </Chip>
        ))}
        <Link href="/ajustes/areas" className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] whitespace-nowrap text-primary">
          <Settings2 size={16} strokeWidth={1.75} aria-hidden />
          Gerenciar áreas
        </Link>
      </ScrollRow>
      </div>

      {goals.length === 0 ? (
        <EmptyState
          className="flex-1 justify-center"
          illustration="goals-empty"
          icon={Target}
          title="Comece pela sua primeira meta"
          description="Defina o que importa neste ano e acompanhe o progresso."
          action={
            <div className="flex flex-col items-center gap-2">
              <Link href="/metas/ia" className={cn(buttonVariants(), 'pl-2')}>
                <EstherAvatar size={32} />
                Criar meta com a {ESTHER}
              </Link>
              <Link href="/metas/nova" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                Criar passo a passo
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-6 px-5 pt-4 pb-6">
            {groups.length === 0 && <p className="card p-4 text-muted">Nenhuma meta nesta área ainda.</p>}
            {groups.map(({ area, goals: items }) => (
              <section key={area.id} aria-label={area.name}>
                <div className="mb-2 flex items-center gap-2">
                  <AreaChip area={area} />
                  {area.archived && <span className="text-[12px] text-muted">arquivada</span>}
                </div>
                <ul className="flex flex-col gap-3">
                  {items.map(goal => {
                    const progress = progressOf(goal, logs, today)
                    const pace = paceOf(goal, logs, tasks, today)
                    const streak = goal.metric.type === 'days' && !hideStreaks ? streakOf(goal, logs, today) : 0
                    return (
                      <li key={goal.id}>
                        <Link href={`/metas/${goal.id}`} className="card flex items-center gap-3 p-4">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-[15px] font-medium">{goal.title}</h3>
                            <div className="mt-3">
                              <GoalProgress goal={goal} progress={progress} />
                            </div>
                            <div className="mt-2.5 flex flex-wrap items-center gap-2">
                              <PacePill status={pace.status} />
                              {streak > 1 && <span className="text-[12px] text-muted">{streak} dias seguidos</span>}
                            </div>
                          </div>
                          <Illustration name={goalArt(goal)} height={48} decorative />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}
          </div>
          <div className="flex justify-center px-5 pb-2">
            <Button variant="quiet" size="sm" onClick={() => setClearing(true)}>
              <Eraser size={16} strokeWidth={1.75} aria-hidden />
              Limpar todas as metas
            </Button>
          </div>
          <div className="pointer-events-none sticky bottom-4 mt-auto flex justify-end px-5 pb-4">
            <Link href="/metas/nova" className={cn(buttonVariants(), 'pointer-events-auto h-14 rounded-full pr-6 pl-5')}>
              <Plus size={20} strokeWidth={1.75} aria-hidden />
              Criar meta
            </Link>
          </div>
        </>
      )}
      <ClearGoalsSheet open={clearing} onClose={() => setClearing(false)} />
    </div>
  )
}
