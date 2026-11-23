import type { EntradaPeriodo } from '@/utils/prompts'
import { fmt, minutesLabel, plural } from '../format'
import { inRange, PACE_LABEL, paceOf, periodStats } from '../goals'
import { aggregate, aggregateText } from '../modules'
import { periodLabel } from '../summaries'
import type { AppData, Summary } from '../types'

/**
 * Monta os dados de um resumo para a IA. Só vai o necessário:
 * diário e humor do período, progresso das metas, contagem de tarefas e um resumo dos módulos.
 */
export function periodInput(data: AppData, summary: Pick<Summary, 'kind' | 'start' | 'end'>, previous?: { titulo: string; texto: string }): EntradaPeriodo {
  const { start, end } = summary
  const stats = periodStats(data, start, end)
  const areaName = (areaId: string) => data.areas.find(area => area.id === areaId)?.name
  const tasks = data.tasks.filter(task => inRange(task.date, start, end))

  const modulos: string[] = []
  for (const module of data.modules.filter(item => !item.hidden)) {
    if (module.kind === 'fitness') {
      const count = data.workouts.filter(item => inRange(item.date, start, end)).length
      if (count) modulos.push(`${module.name}: ${count} ${plural(count, 'treino', 'treinos')}`)
    } else if (module.kind === 'study') {
      const sessions = data.studySessions.filter(item => inRange(item.date, start, end))
      const minutes = sessions.reduce((sum, item) => sum + item.minutes, 0)
      if (sessions.length) modulos.push(`${module.name}: ${minutesLabel(minutes)} em ${sessions.length} ${plural(sessions.length, 'sessão', 'sessões')}`)
    } else {
      const entries = data.moduleEntries.filter(entry => entry.moduleId === module.id && inRange(entry.date, start, end))
      if (!entries.length) continue
      const totals = module.fields
        .filter(field => field.type === 'number' || field.type === 'duration' || field.type === 'scale')
        .map(field => `${field.label.toLocaleLowerCase('pt-BR')} ${field.type === 'scale' ? 'média ' : ''}${aggregateText(field, aggregate(field, entries))}`)
      modulos.push(`${module.name}: ${entries.length} ${plural(entries.length, 'registro', 'registros')}${totals.length ? ` (${totals.join(', ')})` : ''}`)
    }
  }

  return {
    periodo: periodLabel(summary).toLocaleLowerCase('pt-BR'),
    diario: data.journal
      .filter(entry => inRange(entry.date, start, end) && entry.text.trim())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(entry => ({ data: fmt(entry.date, "d 'de' MMM"), humor: entry.mood, texto: entry.text.trim() })),
    humorMedio: stats.moodAverage,
    tarefas: {
      feitas: tasks.filter(task => task.status === 'done').length,
      dispensadas: tasks.filter(task => task.status === 'dismissed').length,
      naoFeitas: tasks.filter(task => task.status === 'not_done').length,
    },
    avancaram: stats.advanced.map(item => ({
      meta: item.goal.title,
      area: areaName(item.goal.areaId),
      progresso: item.text,
      ritmo: PACE_LABEL[paceOf(item.goal, data.logs, data.tasks, end).status],
    })),
    paradas: stats.stalled.map(goal => ({ meta: goal.title, area: areaName(goal.areaId) })),
    modulos,
    anterior: previous,
  }
}
