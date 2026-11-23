'use client'

import { ArrowUp, Check, Pencil, RotateCcw } from 'lucide-react'
import type { SmartProgresso } from '@/utils/prompts'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Missing, TopBar, useShell } from '@/components/app-shell'
import { AreaChip, BackButton } from '@/components/common'
import { ESTHER, EstherAvatar } from '@/components/esther'
import { Button, buttonVariants } from '@/components/ui/button'
import { Chip } from '@/components/ui/controls'
import { askAI } from '@/apis/ai/client'
import {
  describeMetric,
  fromProposal,
  goalSummary,
  goalToDraft,
  keepMilestoneIds,
  onlyChanged,
  saveDraft,
  untilLabel,
  type GoalDraft,
} from '@/domain/goal-draft'
import { untilText } from '@/domain/goals'
import { describe } from '@/domain/recurrence'
import { useStore } from '@/shared/store'
import { useClock } from '@/shared/time'
import type { Goal } from '@/domain/types'
import { cn } from '@/shared/utils'

interface Message {
  id: string
  autor: 'pessoa' | 'ia'
  texto: string
  /** proposta completa trazida por esta mensagem da Esther */
  draft?: GoalDraft
  /** o que já ficou firmado em cada ponto do SMART até esta mensagem */
  smart?: SmartProgresso
  /** respostas curtas para tocar */
  sugestoes?: string[]
}

const SMART_STEPS: { key: keyof SmartProgresso; label: string }[] = [
  { key: 'especifica', label: 'Específica' },
  { key: 'mensuravel', label: 'Mensurável' },
  { key: 'alcancavel', label: 'Alcançável' },
  { key: 'relevante', label: 'Relevante' },
  { key: 'prazo', label: 'Prazo' },
]

/** Primeira fala da Esther, já na tela quando a conversa abre. */
const welcome = (goal?: Goal) =>
  goal
    ? `Oi, eu sou a ${ESTHER}. Vamos ajustar “${goal.title}”. O que não está funcionando? Pode ser o ritmo, o prazo, o jeito de medir ou até o motivo. Me conta do seu jeito, e eu te ajudo a chegar no ajuste certo.`
    : `Oi, eu sou a ${ESTHER}. Vou te guiar a montar suas metas. Me conta, do seu jeito, o que você quer alcançar. Pode ser bem por cima, como “quero voltar a correr” ou “cuidar melhor do dinheiro”. Eu vou fazendo algumas perguntas, uma de cada vez, para a gente chegar numa meta clara: o que exatamente, como medir, se cabe na sua rotina, por que importa e até quando.`

const EXAMPLES = {
  create: ['Quero voltar a treinar', 'Cuidar melhor do dinheiro', 'Ler mais', 'Estudar para um concurso'],
  edit: ['Está pesado demais', 'Quero mudar o prazo', 'Quero medir de outro jeito', 'Mudou o meu motivo'],
}

/** A pessoa dando sinal verde para a proposta. */
const GO_AHEAD = /\b(pode (montar|criar|ajustar|propor|fazer|mandar)|monta|montar a meta|fechado|pode sim|manda ver|bora|est[áa] bom assim|pode ser assim)\b/i
const GO_AHEAD_CHIP = 'Pode montar'

/**
 * A Esther só conhece o marco em texto. Se ela devolveu o mesmo marco de uma meta ligada
 * ("concluir “Chegar a 78 kg”"), a ligação com a outra meta continua.
 */
function keepLinkedMarco(proposal: GoalDraft, before: GoalDraft | undefined, goals: Goal[]): GoalDraft {
  if (before?.until?.type !== 'goal' || proposal.until?.type !== 'event') return proposal
  const same = (text: string) => text.trim().toLocaleLowerCase('pt-BR').replace(/[“”"]/g, '')
  return same(proposal.until.text) === same(untilText(before, goals)) ? { ...proposal, until: before.until } : proposal
}

const nextId = () => `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`

/** A conversa fica guardada na aba: ao voltar de "Editar campos", ela continua de onde parou. */
const chatKey = (goal?: Goal) => (goal ? `entrelinhas-chat-meta-${goal.id}` : 'entrelinhas-chat-meta')

function loadChat(key: string, start: Message[]): Message[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null') as Message[] | null
    return Array.isArray(saved) && saved.length ? saved : start
  } catch {
    return start
  }
}

function storeChat(key: string, messages: Message[] | null) {
  try {
    if (messages && messages.length > 1) sessionStorage.setItem(key, JSON.stringify(messages))
    else sessionStorage.removeItem(key)
  } catch {
    // sem armazenamento da aba: a conversa só vive nesta tela
  }
}

/**
 * Conversa com a Esther.
 * - /metas/ia: criar uma meta nova
 * - /metas/ia?editar=<id>: ajustar uma meta que já existe
 */
export default function GoalChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatRoute />
    </Suspense>
  )
}

function ChatRoute() {
  const params = useSearchParams()
  const id = params.get('editar')
  const goal = useStore(state => state.goals.find(item => item.id === id))
  if (id && !goal) return <Missing title="Meta não encontrada" description="Ela pode ter sido excluída." href="/metas" action="Ver metas" />
  return <GoalChat key={goal?.id ?? 'nova'} goal={goal} />
}

function GoalChat({ goal }: { goal?: Goal }) {
  const router = useRouter()
  const { today } = useClock()
  const { toast, scroller } = useShell()
  const areas = useStore(state => state.areas)
  const goals = useStore(state => state.goals)
  const rule = useStore(state => (goal ? state.rules.find(item => item.goalId === goal.id) : undefined))
  const addGoal = useStore(state => state.addGoal)
  const updateGoal = useStore(state => state.updateGoal)
  const addRule = useStore(state => state.addRule)
  const updateRule = useStore(state => state.updateRule)
  const active = areas.filter(area => !area.archived).sort((a, b) => a.order - b.order)
  const editing = !!goal
  const key = chatKey(goal)
  const start: Message[] = [{ id: 'boas-vindas', autor: 'ia', texto: welcome(goal) }]

  const [messages, setMessages] = useState<Message[]>(() => loadChat(key, start))
  useEffect(() => storeChat(key, messages), [key, messages])
  const [text, setText] = useState('')
  const [thinking, setThinking] = useState(false)
  const [failure, setFailure] = useState<'offline' | 'unavailable' | 'error' | null>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const latestDraftId = [...messages].reverse().find(message => message.draft)?.id
  const smart = [...messages].reverse().find(message => message.smart)?.smart
  const last = messages.at(-1)
  const before = goal ? goalToDraft(goal, rule) : undefined
  // depois de duas respostas, um atalho para pedir a proposta
  const answered = messages.filter(message => message.autor === 'pessoa').length

  // a conversa sempre desce até a última mensagem
  useEffect(() => {
    scroller?.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking, failure, scroller])

  const send = async (content: string, history = messages) => {
    const clean = content.trim()
    if (!clean || thinking) return
    const conversation: Message[] = [...history, { id: nextId(), autor: 'pessoa', texto: clean }]
    setMessages(conversation)
    setText('')
    setFailure(null)
    setThinking(true)
    try {
      const known = [...history].reverse().find(message => message.smart)?.smart
      const ask = (proporAgora: boolean) =>
        askAI('meta-chat', {
          hoje: today,
          areas: active.map(area => area.name),
          conversa: conversation.map(({ autor, texto }) => ({ autor, texto })),
          smart: known,
          metaAtual: goal ? goalSummary(goal, areas.find(area => area.id === goal.areaId)?.name ?? '', goals, rule) : undefined,
          proporAgora,
        })
      // "pode montar", "fechado", "pode ajustar"...: a proposta precisa vir agora (o modelo às vezes ignora)
      const goAhead = GO_AHEAD.test(clean)
      let result = await ask(goAhead)
      if (goAhead && !result.meta) result = await ask(true)
      // o que já estava firmado não se perde se a Esther deixar de repetir
      const merged = known ? (Object.fromEntries(SMART_STEPS.map(({ key: k }) => [k, result.smart[k] || known[k]])) as unknown as SmartProgresso) : result.smart
      const proposal = result.meta ? keepLinkedMarco(fromProposal(result.meta, areas, today), before, goals) : undefined
      // no ajuste, o que a Esther não disse ter mudado fica exatamente como estava
      const draft = proposal && before ? onlyChanged(proposal, before, result.mudancas) : proposal
      setMessages([...conversation, { id: nextId(), autor: 'ia', texto: result.resposta, draft, smart: merged, sugestoes: result.sugestoes }])
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      setFailure(message === 'offline' ? 'offline' : /chave|configurad/i.test(message) ? 'unavailable' : 'error')
    } finally {
      setThinking(false)
    }
  }

  // tentar de novo reenvia a última fala da pessoa
  const retry = () => {
    const lastIndex = messages.map(message => message.autor).lastIndexOf('pessoa')
    if (lastIndex < 0) return
    void send(messages[lastIndex].texto, messages.slice(0, lastIndex))
  }

  const create = (draft: GoalDraft) => {
    const id = addGoal({
      title: draft.title,
      areaId: draft.areaId,
      description: draft.description,
      metric: draft.metric,
      startingPoint: draft.startingPoint,
      achievableNote: draft.achievableNote,
      why: draft.why,
      startDate: today,
      deadline: draft.deadline,
      until: draft.until,
      taskTitle: draft.taskTitle,
      reminder: draft.reminder,
    })
    if (draft.repeat) addRule({ title: draft.taskTitle, goalId: id, repeat: { ...draft.repeat, start: today } })
    storeChat(key, null)
    toast(draft.repeat ? 'Meta criada e tarefa na agenda' : 'Meta criada')
    router.replace(`/metas/${id}`)
  }

  /** Ajuste aceito: registros, etapas concluídas e início da meta continuam como estavam. */
  const saveEdit = (draft: GoalDraft) => {
    if (!goal) return
    updateGoal(goal.id, {
      title: draft.title,
      areaId: draft.areaId,
      description: draft.description,
      metric: keepMilestoneIds(draft.metric, goal.metric),
      startingPoint: draft.startingPoint,
      achievableNote: draft.achievableNote,
      why: draft.why,
      deadline: draft.deadline,
      until: draft.until,
      taskTitle: draft.taskTitle,
      reminder: draft.reminder,
    })
    if (draft.repeat) {
      // a nova repetição vale de hoje em diante; o que já foi feito fica no histórico
      const next = { ...draft.repeat, start: rule && rule.repeat.start > today ? rule.repeat.start : today }
      if (rule) updateRule(rule.id, { title: draft.taskTitle, repeat: describe(next) === describe(rule.repeat) ? rule.repeat : next })
      else addRule({ title: draft.taskTitle, goalId: goal.id, repeat: next })
    } else if (rule && rule.title !== draft.taskTitle) updateRule(rule.id, { title: draft.taskTitle })
    storeChat(key, null)
    toast('Meta ajustada')
    router.replace(`/metas/${goal.id}`)
  }

  const editFields = (draft: GoalDraft) => {
    saveDraft(draft)
    router.push(goal ? `/metas/nova?editar=${goal.id}&rascunho=1` : '/metas/nova?rascunho=1')
  }

  return (
    <div className="flex min-h-full flex-col">
      <TopBar
        title={editing ? `Ajustar com a ${ESTHER}` : `Criar com a ${ESTHER}`}
        back={<BackButton href={goal ? `/metas/${goal.id}` : '/metas'} label={goal ? 'Voltar para a meta' : 'Voltar para Metas'} />}
        right={
          messages.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={thinking}
              onClick={() => {
                setMessages(start)
                setFailure(null)
                setText('')
              }}
            >
              <RotateCcw size={16} strokeWidth={1.75} aria-hidden />
              Recomeçar
            </Button>
          )
        }
      />

      {/* no ajuste, a meta já é SMART; a faixa só aparece ao criar */}
      {smart && !editing && (
        <section aria-label="Pontos da meta já definidos" className="sticky top-14 z-10 -mt-1 mb-2 bg-bg px-4 pb-2">
          <ul className="grid grid-cols-5 gap-1">
            {SMART_STEPS.map(step => {
              const done = !!smart[step.key]
              return (
                <li
                  key={step.key}
                  title={done ? smart[step.key] : 'Ainda falta'}
                  aria-label={`${step.label}: ${done ? smart[step.key] : 'ainda falta'}`}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-ctl px-0.5 py-1.5 text-[11px] leading-tight',
                    done ? 'bg-primary-soft text-ink' : 'text-muted',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'grid size-5 place-items-center rounded-full border-[1.5px]',
                      done ? 'border-primary bg-primary text-on-primary' : 'border-line',
                    )}
                  >
                    {done && <Check size={12} strokeWidth={2.5} />}
                  </span>
                  {step.label}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <ol className="flex flex-1 flex-col gap-3 px-4 pb-4" aria-label={`Conversa com a ${ESTHER}`} aria-live="polite">
        {messages.map(message => (
          <li key={message.id} className={cn('flex flex-col gap-2', message.autor === 'pessoa' ? 'items-end' : 'items-start')}>
            {message.autor === 'ia' ? (
              <div className="flex max-w-[88%] items-end gap-2">
                <EstherAvatar size={30} />
                <p className="card rounded-bl-[4px] px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-line">
                  <span className="sr-only">{ESTHER}: </span>
                  {message.texto}
                </p>
              </div>
            ) : (
              <p className="max-w-[85%] rounded-card rounded-br-[4px] bg-primary px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-line text-on-primary">
                <span className="sr-only">Você: </span>
                {message.texto}
              </p>
            )}

            {message.draft && (
              <Review
                draft={message.draft}
                before={before}
                current={message.id === latestDraftId}
                onConfirm={() => message.draft && (editing ? saveEdit(message.draft) : create(message.draft))}
                onEdit={() => message.draft && editFields(message.draft)}
                onAdjust={() => input.current?.focus()}
              />
            )}

            {message === last && message.autor === 'ia' && !thinking && !message.draft && (!!message.sugestoes?.length || answered >= 2) && (
              <div className="flex flex-wrap gap-2 pl-10" role="group" aria-label="Respostas sugeridas">
                {[...(message.sugestoes ?? []), ...(answered >= 2 && !latestDraftId ? [GO_AHEAD_CHIP] : [])].map(suggestion => (
                  <Chip key={suggestion} onClick={() => void send(suggestion)}>
                    {suggestion}
                  </Chip>
                ))}
              </div>
            )}

            {message.id === 'boas-vindas' && messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pl-10" role="group" aria-label="Exemplos para começar">
                {EXAMPLES[editing ? 'edit' : 'create'].map(example => (
                  <Chip key={example} onClick={() => void send(example)}>
                    {example}
                  </Chip>
                ))}
              </div>
            )}
          </li>
        ))}

        {thinking && (
          <li className="flex items-end gap-2" role="status">
            <EstherAvatar size={30} />
            <p className="card flex items-center gap-1 rounded-bl-[4px] px-4 py-3.5" aria-label={`A ${ESTHER} está escrevendo`}>
              {[0, 1, 2].map(dot => (
                <span
                  key={dot}
                  className="ill-twinkle size-1.5 rounded-full bg-muted"
                  style={{ animationDelay: `${dot * 0.25}s`, animationDuration: '1.2s' }}
                />
              ))}
            </p>
          </li>
        )}

        {failure && (
          <li className="card flex flex-col gap-2 p-3 text-[13px]" role="status">
            {failure === 'offline' && <p>Sem conexão agora. Sua mensagem continua aqui; tente de novo quando a internet voltar.</p>}
            {failure === 'unavailable' && (
              <p>
                A {ESTHER} não está disponível neste app agora. Dá para {editing ? 'editar a meta' : 'criar a meta'} passo a passo, do mesmo jeito.
              </p>
            )}
            {failure === 'error' && <p>Não consegui responder agora. Tente de novo em instantes.</p>}
            <div className="flex flex-wrap gap-2">
              {failure !== 'unavailable' && (
                <Button variant="outline" size="sm" onClick={retry}>
                  <RotateCcw size={16} strokeWidth={1.75} aria-hidden />
                  Tentar de novo
                </Button>
              )}
              <Link href={goal ? `/metas/nova?editar=${goal.id}` : '/metas/nova'} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                {editing ? 'Editar passo a passo' : 'Criar passo a passo'}
              </Link>
            </div>
          </li>
        )}
      </ol>

      <form
        className="sticky bottom-0 flex items-end gap-2 border-t-[0.5px] border-line bg-bg px-4 py-3"
        onSubmit={event => {
          event.preventDefault()
          void send(text)
        }}
      >
        <label htmlFor="chat-mensagem" className="sr-only">
          Mensagem para a {ESTHER}
        </label>
        <textarea
          id="chat-mensagem"
          ref={input}
          rows={1}
          className="field max-h-32 min-h-12 flex-1 py-3"
          placeholder={latestDraftId ? 'Peça um ajuste, se quiser' : 'Escreva aqui'}
          value={text}
          onChange={event => {
            setText(event.target.value)
            // cresce com o texto, até um limite
            event.target.style.height = 'auto'
            event.target.style.height = `${Math.min(event.target.scrollHeight, 128)}px`
          }}
          onKeyDown={event => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void send(text)
            }
          }}
        />
        <button
          type="submit"
          disabled={!text.trim() || thinking}
          aria-label="Enviar"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-on-primary disabled:opacity-40"
        >
          <ArrowUp size={20} strokeWidth={2} />
        </button>
      </form>
    </div>
  )
}

/** Cada parte da meta com o nome SMART, como texto para mostrar e comparar. */
function rowsOf(draft: GoalDraft, goals: Goal[]): [string, string, string][] {
  return [
    ['Específica', 'o que exatamente', draft.description],
    ['Mensurável', 'como medir', describeMetric(draft.metric)],
    ['Alcançável', 'de onde você parte', [draft.startingPoint, draft.achievableNote].filter(Boolean).join(' ')],
    ['Relevante', 'por que importa', draft.why],
    ['Prazo', 'até quando', untilLabel(draft, goals)],
    ['No dia a dia', 'tarefa e agenda', `${draft.taskTitle}${draft.repeat ? `: ${describe(draft.repeat).toLocaleLowerCase('pt-BR')}` : ', sem dias fixos'}`],
    ['Lembrete', '', draft.reminder.on ? `Às ${draft.reminder.time}` : 'Sem lembrete'],
  ]
}

/**
 * Revisão da proposta. Nada é criado nem alterado sem o toque no botão principal.
 * No ajuste (`before`), o que mudou aparece destacado, com o valor antigo embaixo.
 */
function Review({
  draft,
  before,
  current,
  onConfirm,
  onEdit,
  onAdjust,
}: {
  draft: GoalDraft
  before?: GoalDraft
  current: boolean
  onConfirm: () => void
  onEdit: () => void
  onAdjust: () => void
}) {
  const area = useStore(state => state.areas.find(item => item.id === draft.areaId))
  const oldArea = useStore(state => (before ? state.areas.find(item => item.id === before.areaId) : undefined))
  const goals = useStore(state => state.goals)
  const rows = rowsOf(draft, goals)
  const oldRows = before ? rowsOf(before, goals) : []
  const titleChanged = !!before && before.title !== draft.title
  const changes = before
    ? rows.filter(([label, , value]) => oldRows.find(row => row[0] === label)?.[2] !== value).length +
      (titleChanged ? 1 : 0) +
      (before.areaId !== draft.areaId ? 1 : 0)
    : 0

  return (
    <section className={cn('card w-full p-4', !current && 'opacity-60')} aria-label={`Proposta: ${draft.title}`}>
      <p className="text-[12px] text-muted">
        {!current
          ? 'Versão anterior'
          : before
            ? changes
              ? `Revise o ajuste: ${changes} ${changes === 1 ? 'mudança' : 'mudanças'}`
              : 'Nada mudou nesta versão'
            : 'Revise antes de criar'}
      </p>
      <h2 className="mt-0.5 text-[17px] font-medium">
        {draft.title}
        {titleChanged && <ChangedPill />}
      </h2>
      {titleChanged && <p className="text-[12px] text-muted line-through">{before.title}</p>}
      <div className="mt-2 flex items-center gap-2">
        <AreaChip area={area} />
        {before && before.areaId !== draft.areaId && (
          <>
            <ChangedPill />
            <span className="text-[12px] text-muted line-through">{oldArea?.name}</span>
          </>
        )}
      </div>
      <dl className="mt-3 flex flex-col gap-2.5 text-[14px]">
        {rows.map(([label, hint, value]) => {
          const old = oldRows.find(row => row[0] === label)?.[2]
          const changed = !!before && old !== value
          return (
            <div key={label} className={cn(changed && '-mx-2 rounded-ctl bg-primary-soft px-2 py-1.5')}>
              <dt className="text-[12px] text-muted">
                <span className="font-medium text-ink">{label}</span>
                {hint && ` · ${hint}`}
                {changed && <ChangedPill />}
              </dt>
              <dd className={value ? undefined : 'text-muted'}>{value || 'A definir'}</dd>
              {changed && <dd className="mt-0.5 text-[12px] text-muted line-through">{old || 'em branco'}</dd>}
            </div>
          )
        })}
      </dl>
      {current && (
        <div className="mt-4 flex flex-col gap-2">
          <Button block onClick={onConfirm} disabled={!!before && changes === 0}>
            {before ? 'Salvar alterações' : 'Criar esta meta'}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil size={16} strokeWidth={1.75} aria-hidden />
              Editar campos
            </Button>
            <Button variant="ghost" size="sm" onClick={onAdjust}>
              Pedir ajustes
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

function ChangedPill() {
  return <span className="ml-2 inline-flex h-5 items-center rounded-full bg-primary px-2 align-middle text-[11px] font-medium text-on-primary">mudou</span>
}
