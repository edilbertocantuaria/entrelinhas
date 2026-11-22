'use client'

import { BookOpen, Check, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useShell } from '@/components/app-shell'
import { EmptyState } from '@/components/common'
import { BuiltinModuleHeader } from '@/components/module-ui'
import { chartMargin, tick, tooltipStyle } from '@/components/goal-visuals'
import { Illustration } from '@/components/illustration'
import { Button } from '@/components/ui/button'
import { Chip, Field, ProgressBar, Segmented } from '@/components/ui/controls'
import { Sheet } from '@/components/ui/sheet'
import { areaColor, COLOR_PRESETS } from '@/lib/areas'
import { longDay, minutesLabel, num1, parseNum, plural, shift, shortDay } from '@/lib/format'
import { useStore } from '@/lib/store'
import { accuracy, NOTE_LABEL, notesOf, subjectStats, weeklySeries, weekStats, type NoteKind } from '@/lib/study'
import { useClock } from '@/lib/time'
import type { ColorKey, StudySession, Subject } from '@/lib/types'
import { cn } from '@/lib/utils'

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="card flex flex-col-reverse p-3 text-center">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="text-[20px] leading-tight font-medium tabular-nums">{value}</dd>
    </div>
  )
}

function Dot({ color, size = 10 }: { color: ColorKey; size?: number }) {
  return <span aria-hidden className="inline-block shrink-0 rounded-full" style={{ width: size, height: size, background: areaColor(color) }} />
}

type NoteFilter = 'all' | NoteKind

export default function StudyPage() {
  const { today } = useClock()
  const { toast } = useShell()
  const subjects = useStore(state => state.subjects)
  const sessions = useStore(state => state.studySessions)
  const hidePercent = useStore(state => state.settings.hidePercent)
  const removeSession = useStore(state => state.removeStudySession)

  const [form, setForm] = useState(false)
  const [editor, setEditor] = useState<{ open: boolean; id?: string }>({ open: false })
  const [detail, setDetail] = useState<StudySession | null>(null)
  const [filter, setFilter] = useState<NoteFilter>('all')
  const [notesShown, setNotesShown] = useState(4)
  const [shown, setShown] = useState(5)

  const week = weekStats(sessions, today)
  const recent = sessions.filter(item => item.date > shift(today, -30))
  const overall = accuracy(recent)
  const weekly = useMemo(() => weeklySeries(sessions, subjects, today), [sessions, subjects, today])
  const stats = subjects.map(subject => subjectStats(subject, sessions))
  const notes = useMemo(() => notesOf(sessions), [sessions])
  const visibleNotes = notes.filter(note => filter === 'all' || note.kind === filter)
  const history = useMemo(() => [...sessions].sort((a, b) => b.date.localeCompare(a.date)), [sessions])
  const subjectOf = (id: string) => subjects.find(subject => subject.id === id)
  const hasAccuracy = weekly.some(row => row.percent !== null)
  // eixo do tempo em horas cheias: de 1 em 1 h, ou de 2 em 2 quando passa de 6 h
  const topMinutes = Math.max(60, ...weekly.map(row => subjects.reduce((total, subject) => total + Number(row[subject.id] ?? 0), 0)))
  const hourStep = topMinutes > 360 ? 120 : 60
  const hourTicks = Array.from({ length: Math.ceil(topMinutes / hourStep) + 1 }, (_, index) => index * hourStep)

  const accuracyText = overall.ratio === null ? 'sem questões' : hidePercent ? `${overall.correct} de ${overall.questions}` : `${Math.round(overall.ratio * 100)}%`

  return (
    <div className="flex min-h-full flex-col">
      <BuiltinModuleHeader kind="study" fallback="Estudos" />

      {sessions.length === 0 ? (
        <EmptyState
          className="flex-1 justify-center"
          illustration="study-module"
          icon={BookOpen}
          title="Registre a sua primeira sessão"
          description="Anote o tempo, os acertos e o que você percebeu ao estudar."
          action={<Button onClick={() => setForm(true)}>Registrar estudo</Button>}
        />
      ) : (
        <div className="flex flex-col gap-4 px-5 pb-8">
          <div className="flex items-center gap-3">
            <p className="flex-1 text-[13px] text-muted">Tempo, acertos e o que você foi percebendo pelo caminho.</p>
            <Illustration name="study-module" height={72} decorative />
          </div>

          <dl className="grid grid-cols-3 gap-2">
            <Stat value={week.minutes ? minutesLabel(week.minutes) : '0 min'} label="tempo na semana" />
            <Stat value={String(week.count)} label={plural(week.count, 'sessão na semana', 'sessões na semana')} />
            <Stat value={accuracyText} label="acertos em 30 dias" />
          </dl>

          <Button block onClick={() => setForm(true)}>
            <Plus size={20} strokeWidth={1.75} aria-hidden />
            Registrar estudo
          </Button>

          <section className="card p-4" aria-labelledby="est-tempo">
            <h2 id="est-tempo" className="text-[15px] font-medium">
              Tempo por semana
            </h2>
            <figure className="mt-2">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={weekly} margin={chartMargin}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="week" tick={tick} tickLine={false} axisLine={false} minTickGap={12} />
                  <YAxis tick={tick} tickLine={false} axisLine={false} width={36} domain={[0, hourTicks.at(-1) ?? 60]} ticks={hourTicks} tickFormatter={value => `${num1(Number(value) / 60)} h`} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: 'var(--primary-soft)' }} formatter={(value, key) => [minutesLabel(Number(value)), subjectOf(String(key))?.name ?? '']} labelFormatter={label => `Semana de ${label}`} />
                  {subjects.map((subject, index) => (
                    <Bar key={subject.id} dataKey={subject.id} stackId="tempo" fill={areaColor(subject.color)} maxBarSize={22} radius={index === subjects.length - 1 ? [4, 4, 0, 0] : 0} isAnimationActive={false} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
              <figcaption className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted">
                {subjects.map(subject => (
                  <span key={subject.id} className="inline-flex items-center gap-1.5">
                    <Dot color={subject.color} size={8} />
                    {subject.name}
                  </span>
                ))}
              </figcaption>
            </figure>
          </section>

          {hasAccuracy && (
            <section className="card p-4" aria-labelledby="est-acertos">
              <h2 id="est-acertos" className="text-[15px] font-medium">
                Acertos por semana
              </h2>
              <figure className="mt-2">
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={weekly} margin={chartMargin}>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="week" tick={tick} tickLine={false} axisLine={false} minTickGap={12} />
                    <YAxis tick={tick} tickLine={false} axisLine={false} width={36} domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={value => `${value}%`} />
                    <Tooltip {...tooltipStyle} formatter={value => [`${value}%`, 'Acertos']} labelFormatter={label => `Semana de ${label}`} />
                    <Line type="monotone" dataKey="percent" connectNulls stroke="var(--primary)" strokeWidth={2} dot={{ r: 3, fill: 'var(--primary)', strokeWidth: 0 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
                <figcaption className="mt-1 text-[12px] text-muted">Parte das questões feitas que você acertou em cada semana, somando as disciplinas.</figcaption>
              </figure>
            </section>
          )}

          <section aria-labelledby="est-disciplinas">
            <h2 id="est-disciplinas" className="mb-2 text-[15px] font-medium">
              Disciplinas
            </h2>
            <ul className="flex flex-col gap-2">
              {stats.map(item => (
                <li key={item.subject.id} className="card flex items-center gap-2 py-2 pr-1 pl-4">
                  <div className="min-w-0 flex-1 py-1.5">
                    <p className="flex items-center gap-2 text-[14px] font-medium">
                      <Dot color={item.subject.color} />
                      <span className="truncate">{item.subject.name}</span>
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted">
                      {item.count ? `${minutesLabel(item.minutes)} em ${item.count} ${plural(item.count, 'sessão', 'sessões')}` : 'Nenhuma sessão ainda'}
                      {item.last ? ` · última em ${shortDay(item.last)}` : ''}
                    </p>
                    {item.ratio !== null && (
                      <div className="mt-2">
                        <ProgressBar value={item.ratio} color={areaColor(item.subject.color)} label={`Acertos em ${item.subject.name}`} />
                        <p className="mt-1 text-[12px] text-muted">
                          {item.correct} de {item.questions} acertos{hidePercent ? '' : ` · ${Math.round(item.ratio * 100)}%`}
                        </p>
                      </div>
                    )}
                  </div>
                  <button type="button" className="icon-btn" aria-label={`Editar ${item.subject.name}`} onClick={() => setEditor({ open: true, id: item.subject.id })}>
                    <Pencil size={18} strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
            <Button variant="ghost" size="sm" className="mt-1" onClick={() => setEditor({ open: true })}>
              <Plus size={18} strokeWidth={1.75} aria-hidden />
              Nova disciplina
            </Button>
          </section>

          <section aria-labelledby="est-notas">
            <h2 id="est-notas" className="mb-2 text-[15px] font-medium">
              Anotações
            </h2>
            <Segmented<NoteFilter>
              label="Filtrar anotações"
              value={filter}
              onChange={value => {
                setFilter(value)
                setNotesShown(4)
              }}
              options={[
                { value: 'all', label: 'Todas' },
                { value: 'difficulty', label: 'Dificuldades' },
                { value: 'progress', label: 'Progressos' },
                { value: 'insight', label: 'Insights' },
              ]}
            />
            {visibleNotes.length === 0 ? (
              <p className="card mt-2 p-4 text-[13px] text-muted">Nada anotado aqui ainda. Ao registrar um estudo, conte o que travou, o que melhorou ou o que você descobriu.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {visibleNotes.slice(0, notesShown).map(note => {
                  const subject = subjectOf(note.subjectId)
                  return (
                    <li key={note.id} className="card p-3">
                      <p className="text-[14px] leading-relaxed">{note.text}</p>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-ink">{NOTE_LABEL[note.kind]}</span>
                        {subject && (
                          <span className="inline-flex items-center gap-1.5">
                            <Dot color={subject.color} size={8} />
                            {subject.name}
                          </span>
                        )}
                        <span>{shortDay(note.date)}</span>
                      </p>
                    </li>
                  )
                })}
              </ul>
            )}
            {visibleNotes.length > notesShown && (
              <Button variant="ghost" size="sm" className="mt-1" onClick={() => setNotesShown(notesShown + 8)}>
                Ver mais
              </Button>
            )}
          </section>

          <section aria-labelledby="est-sessoes">
            <h2 id="est-sessoes" className="mb-2 text-[15px] font-medium">
              Sessões recentes
            </h2>
            <ul className="card divide-y-[0.5px] divide-line">
              {history.slice(0, shown).map(item => {
                const subject = subjectOf(item.subjectId)
                return (
                  <li key={item.id}>
                    <button type="button" className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left" onClick={() => setDetail(item)}>
                      {subject && <Dot color={subject.color} />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px]">{subject?.name ?? 'Disciplina removida'}</span>
                        <span className="block truncate text-[12px] text-muted">
                          {minutesLabel(item.minutes)}
                          {item.questions ? ` · ${item.correct ?? 0} de ${item.questions} acertos` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-[12px] text-muted">{shortDay(item.date)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {history.length > shown && (
              <Button variant="ghost" size="sm" className="mt-1" onClick={() => setShown(shown + 10)}>
                Ver mais
              </Button>
            )}
          </section>
        </div>
      )}

      <SessionForm open={form} onClose={() => setForm(false)} onNewSubject={() => setEditor({ open: true })} />
      <SubjectEditor open={editor.open} subjectId={editor.id} onClose={() => setEditor(previous => ({ ...previous, open: false }))} />

      <Sheet
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? (subjectOf(detail.subjectId)?.name ?? 'Sessão de estudo') : ''}
        description={detail ? `${longDay(detail.date)} · ${minutesLabel(detail.minutes)}${detail.questions ? ` · ${detail.correct ?? 0} de ${detail.questions} acertos` : ''}` : undefined}
      >
        {detail && (
          <div className="flex flex-col gap-4">
            {(['difficulty', 'progress', 'insight'] as const).some(kind => detail[kind]) && (
              <dl className="card divide-y-[0.5px] divide-line">
                {(['difficulty', 'progress', 'insight'] as const).map(kind =>
                  detail[kind] ? (
                    <div key={kind} className="px-3 py-2.5">
                      <dt className="text-[12px] text-muted">{NOTE_LABEL[kind]}</dt>
                      <dd className="text-[14px] leading-relaxed">{detail[kind]}</dd>
                    </div>
                  ) : null,
                )}
              </dl>
            )}
            {detail.logId && <p className="text-[12px] text-muted">Esta sessão também conta para uma meta. Ao excluir, o registro da meta sai junto.</p>}
            <Button
              variant="outline"
              onClick={() => {
                removeSession(detail.id)
                setDetail(null)
                toast('Sessão excluída')
              }}
            >
              <Trash2 size={18} strokeWidth={1.75} aria-hidden />
              Excluir sessão
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}

// ---------- Registrar estudo ----------

const QUICK_MINUTES = [25, 30, 45, 60]

function SessionForm({ open, onClose, onNewSubject }: { open: boolean; onClose: () => void; onNewSubject: () => void }) {
  const { today } = useClock()
  const { toast } = useShell()
  const subjects = useStore(state => state.subjects)
  const sessions = useStore(state => state.studySessions)
  const goals = useStore(state => state.goals)
  const addSession = useStore(state => state.addStudySession)

  const lastSubject = [...sessions].sort((a, b) => b.date.localeCompare(a.date))[0]?.subjectId
  const [picked, setPicked] = useState<string | undefined>()
  const [date, setDate] = useState('')
  const [minutes, setMinutes] = useState('30')
  const [questions, setQuestions] = useState('')
  const [correct, setCorrect] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [progress, setProgress] = useState('')
  const [insight, setInsight] = useState('')
  const [error, setError] = useState('')

  const subjectId = subjects.some(subject => subject.id === picked) ? picked : subjects.some(subject => subject.id === lastSubject) ? lastSubject : subjects[0]?.id
  const subject = subjects.find(item => item.id === subjectId)
  const goal = goals.find(item => item.id === subject?.goalId)
  const day = date || today

  const close = () => {
    onClose()
    setDate('')
    setQuestions('')
    setCorrect('')
    setDifficulty('')
    setProgress('')
    setInsight('')
    setError('')
  }

  const save = () => {
    const mins = Math.round(parseNum(minutes))
    const asked = questions.trim() ? Math.round(parseNum(questions)) : undefined
    const right = correct.trim() ? Math.round(parseNum(correct)) : undefined
    if (!subjectId) return setError('Crie uma disciplina para registrar o estudo.')
    if (!Number.isFinite(mins) || mins <= 0) return setError('Informe o tempo em minutos.')
    if (asked !== undefined && (!Number.isFinite(asked) || asked <= 0)) return setError('Confira o número de questões.')
    if (right !== undefined && (asked === undefined || !Number.isFinite(right) || right < 0 || right > asked)) return setError('Os acertos vão de zero até o número de questões feitas.')
    addSession({
      date: day > today ? today : day,
      subjectId,
      minutes: mins,
      questions: asked,
      correct: asked !== undefined ? (right ?? 0) : undefined,
      difficulty: difficulty.trim() || undefined,
      progress: progress.trim() || undefined,
      insight: insight.trim() || undefined,
    })
    toast(goal ? 'Estudo registrado e contado na meta' : 'Estudo registrado')
    close()
  }

  return (
    <Sheet open={open} onClose={close} title="Registrar estudo">
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-1.5 text-[13px] text-muted">Disciplina</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Disciplina">
            {subjects.map(item => (
              <Chip key={item.id} selected={item.id === subjectId} onClick={() => setPicked(item.id)} className="pl-3">
                <Dot color={item.color} size={8} />
                {item.name}
              </Chip>
            ))}
            <Chip onClick={onNewSubject} className="pl-3">
              <Plus size={16} strokeWidth={1.75} aria-hidden />
              Nova
            </Chip>
          </div>
          {goal && <p className="mt-1.5 text-[12px] text-muted">O tempo conta para a meta “{goal.title}”.</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tempo (min)" htmlFor="estudo-min">
            <input id="estudo-min" className="field" inputMode="numeric" value={minutes} onChange={event => setMinutes(event.target.value)} />
          </Field>
          <Field label="Dia" htmlFor="estudo-dia">
            <input id="estudo-dia" type="date" className="field" max={today} value={day} onChange={event => setDate(event.target.value)} />
          </Field>
        </div>
        <div className="-mt-2 flex gap-2" role="group" aria-label="Tempos rápidos">
          {QUICK_MINUTES.map(value => (
            <Chip key={value} selected={minutes.trim() === String(value)} onClick={() => setMinutes(String(value))} aria-label={`${value} minutos`}>
              {value} min
            </Chip>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Questões feitas" htmlFor="estudo-questoes">
            <input id="estudo-questoes" className="field" inputMode="numeric" placeholder="opcional" value={questions} onChange={event => setQuestions(event.target.value)} />
          </Field>
          <Field label="Acertos" htmlFor="estudo-acertos">
            <input id="estudo-acertos" className="field" inputMode="numeric" placeholder="opcional" value={correct} onChange={event => setCorrect(event.target.value)} />
          </Field>
        </div>

        <Field label="O que travou (opcional)" htmlFor="estudo-dificuldade">
          <textarea id="estudo-dificuldade" rows={2} className="field" placeholder="Uma dificuldade para revisar depois" value={difficulty} onChange={event => setDifficulty(event.target.value)} />
        </Field>
        <Field label="Progresso que você notou (opcional)" htmlFor="estudo-progresso">
          <textarea id="estudo-progresso" rows={2} className="field" placeholder="Algo que ficou mais fácil" value={progress} onChange={event => setProgress(event.target.value)} />
        </Field>
        <Field label="Insight (opcional)" htmlFor="estudo-insight">
          <textarea id="estudo-insight" rows={2} className="field" placeholder="Um atalho, uma ideia, um jeito novo de pensar" value={insight} onChange={event => setInsight(event.target.value)} />
        </Field>

        {error && (
          <p role="alert" className="text-[12px]">
            {error}
          </p>
        )}
        <Button block onClick={save}>
          Registrar
        </Button>
      </div>
    </Sheet>
  )
}

// ---------- Disciplina ----------

function SubjectEditor({ open, subjectId, onClose }: { open: boolean; subjectId?: string; onClose: () => void }) {
  const { toast } = useShell()
  const subject = useStore(state => state.subjects.find(item => item.id === subjectId))
  const count = useStore(state => state.studySessions.filter(item => item.subjectId === subjectId).length)
  const goals = useStore(state => state.goals)
  const saveSubject = useStore(state => state.saveSubject)
  const removeSubject = useStore(state => state.removeSubject)

  return (
    <Sheet open={open} onClose={onClose} title={subject ? 'Editar disciplina' : 'Nova disciplina'}>
      {open && (
        <SubjectFields
          key={subjectId ?? 'nova'}
          subject={subject}
          sessions={count}
          goals={goals.filter(goal => goal.metric.type === 'days').map(goal => ({ id: goal.id, title: goal.title }))}
          onSave={draft => {
            const result = saveSubject(draft, subject?.id)
            if (result.ok) onClose()
            return result.ok ? '' : result.error
          }}
          onRemove={
            subject
              ? () => {
                  removeSubject(subject.id)
                  onClose()
                  toast('Disciplina excluída')
                }
              : undefined
          }
        />
      )}
    </Sheet>
  )
}

function SubjectFields({
  subject,
  sessions,
  goals,
  onSave,
  onRemove,
}: {
  subject?: Subject
  sessions: number
  goals: { id: string; title: string }[]
  onSave: (draft: { name: string; color: ColorKey; goalId?: string }) => string
  onRemove?: () => void
}) {
  const [name, setName] = useState(subject?.name ?? '')
  const [color, setColor] = useState<ColorKey>(subject?.color ?? 'mar')
  const [goalId, setGoalId] = useState<string | undefined>(subject?.goalId)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <Field label="Nome" htmlFor="disciplina-nome">
        <input id="disciplina-nome" className="field" maxLength={40} placeholder="Ex.: Português" value={name} onChange={event => setName(event.target.value)} aria-invalid={!!error} />
      </Field>
      {error && (
        <p role="alert" className="-mt-2 text-[12px]">
          {error}
        </p>
      )}

      <div>
        <p className="mb-1.5 text-[13px] text-muted">Cor</p>
        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Cor da disciplina">
          {COLOR_PRESETS.map(preset => {
            const selected = preset.key === color
            return (
              <button key={preset.key} type="button" role="radio" aria-checked={selected} aria-label={preset.label} onClick={() => setColor(preset.key)} className="grid h-11 place-items-center rounded-ctl">
                <span className={cn('grid size-8 place-items-center rounded-full text-surface', selected && 'ring-2 ring-primary ring-offset-2 ring-offset-bg')} style={{ background: areaColor(preset.key) }}>
                  {selected && <Check size={16} strokeWidth={2.5} aria-hidden />}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {goals.length > 0 && (
        <div>
          <p className="mb-1.5 text-[13px] text-muted">Contar o tempo para uma meta</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Contar o tempo para uma meta">
            <Chip selected={!goalId} onClick={() => setGoalId(undefined)}>
              Não contar
            </Chip>
            {goals.map(goal => (
              <Chip key={goal.id} selected={goalId === goal.id} onClick={() => setGoalId(goal.id)}>
                {goal.title}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <Button block onClick={() => setError(onSave({ name, color, goalId }))}>
        Salvar
      </Button>

      {onRemove &&
        (confirming ? (
          <div className="card p-3">
            <p className="text-[13px]">
              {sessions ? `Excluir a disciplina e ${sessions} ${plural(sessions, 'sessão registrada', 'sessões registradas')}?` : 'Excluir a disciplina?'} Os registros já contados nas metas ficam.
            </p>
            <div className="mt-2 flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={onRemove}>
                Excluir
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            <Trash2 size={18} strokeWidth={1.75} aria-hidden />
            Excluir disciplina
          </Button>
        ))}
    </div>
  )
}
