'use client'

import { Check, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { TopBar, useShell } from '@/components/app-shell'
import { GoalChip } from '@/components/common'
import { Illustration } from '@/components/illustration'
import { Button } from '@/components/ui/button'
import { longDay } from '@/shared/format'
import { dailyLimit, suggestTasks, todayTasks } from '@/domain/goals'
import { scheduledGoals } from '@/domain/recurrence'
import { useStore } from '@/shared/store'
import { useClock } from '@/shared/time'
import { cn } from '@/shared/utils'

interface Item {
  key: string
  title: string
  goalId?: string
  hint?: string
}

/** Abertura do dia: o que entra hoje, respeitando o limite diário. */
export default function OpenDayPage() {
  const router = useRouter()
  const { today } = useClock()
  const { toast } = useShell()
  const tasks = useStore(state => state.tasks)
  const goals = useStore(state => state.goals)
  const logs = useStore(state => state.logs)
  const areas = useStore(state => state.areas)
  const rules = useStore(state => state.rules)
  // sem limite (desligado em Ajustes), cabe tudo
  const maxTasks = useStore(state => dailyLimit(state.settings))
  const limited = Number.isFinite(maxTasks)
  const openDay = useStore(state => state.openDay)

  const groups = useMemo(() => {
    const todays = todayTasks(tasks, today)
    const suggestions = suggestTasks(goals, logs, tasks, today, new Set(areas.filter(area => area.archived).map(area => area.id)), scheduledGoals(rules))
    const toItem = (task: (typeof tasks)[number]): Item => ({ key: `t:${task.id}`, title: task.title, goalId: task.goalId })
    return {
      done: todays.filter(task => task.status === 'done').length,
      suggestions,
      sections: [
        { title: 'Já estão em hoje', items: todays.filter(task => task.status === 'pending').map(toItem) },
        { title: 'Ficaram de dias anteriores', items: tasks.filter(task => !task.later && task.status === 'pending' && task.date < today).map(toItem) },
        {
          title: 'Sugestões das suas metas',
          items: suggestions.map(item => ({ key: `s:${item.key}`, title: item.title, goalId: item.goalId, hint: item.hint })),
        },
        { title: 'Depois', items: tasks.filter(task => task.later && task.status === 'pending').map(toItem) },
      ].filter(section => section.items.length),
    }
  }, [tasks, goals, logs, areas, today, rules])

  const capacity = Math.max(0, maxTasks - groups.done)
  const all = groups.sections.flatMap(section => section.items)
  // Pré-seleção: o que já estava em hoje, depois pendências e sugestões, até o limite
  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        groups.sections
          .filter(section => section.title !== 'Depois')
          .flatMap(section => section.items)
          .slice(0, capacity)
          .map(item => item.key),
      ),
  )

  const toggle = (key: string) => {
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else if (next.size >= capacity) return toast(`O limite de hoje é de ${maxTasks} tarefas. O resto espera em Depois.`)
    else next.add(key)
    setSelected(next)
  }

  const confirm = () => {
    openDay(today, {
      taskIds: all.filter(item => item.key.startsWith('t:') && selected.has(item.key)).map(item => item.key.slice(2)),
      candidateIds: all.filter(item => item.key.startsWith('t:')).map(item => item.key.slice(2)),
      suggestions: groups.suggestions.filter(item => selected.has(`s:${item.key}`)),
    })
    router.push('/')
  }

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title="Abrir o dia"
        right={
          <Link href="/" className="icon-btn" aria-label="Fechar">
            <X size={20} strokeWidth={1.75} />
          </Link>
        }
      />
      <div className="flex-1 px-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="voice text-[17px] leading-snug">{longDay(today)}</p>
            <p className="mt-1 text-[13px] text-muted">
              {limited ? `Escolha até ${capacity} para hoje.` : 'Escolha o que entra hoje.'} O que ficar de fora espera em Depois, sem prazo.
            </p>
          </div>
          <Illustration name="step-tasks" height={84} decorative />
        </div>

        {groups.sections.length === 0 && <p className="card mt-5 p-4 text-muted">Nada esperando. O dia está livre.</p>}

        {groups.sections.map(section => (
          <section key={section.title} className="mt-5">
            <h2 className="mb-2 text-[13px] text-muted">{section.title}</h2>
            <ul className="card divide-y-[0.5px] divide-line">
              {section.items.map(item => {
                const on = selected.has(item.key)
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(item.key)}
                      className="flex min-h-[60px] w-full items-center gap-3 rounded-card px-4 py-2.5 text-left"
                    >
                      <span
                        className={cn(
                          'grid size-6 shrink-0 place-items-center rounded-[7px] border-[1.5px]',
                          on ? 'border-primary bg-primary text-on-primary' : 'border-muted',
                        )}
                      >
                        {on && <Check size={14} strokeWidth={2.5} aria-hidden />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px]">{item.title}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-2">
                          {item.goalId && <GoalChip goalId={item.goalId} />}
                          {item.hint && <span className="text-[12px] text-muted">{item.hint}</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="sticky bottom-0 flex items-center gap-4 border-t-[0.5px] border-line bg-bg px-5 py-3">
        <p className="text-[13px] text-muted tabular-nums" aria-live="polite">
          <span className="text-[15px] font-medium text-ink">{selected.size}</span> de {capacity}
        </p>
        <Button className="flex-1" onClick={confirm}>
          Começar o dia
        </Button>
      </div>
    </div>
  )
}
