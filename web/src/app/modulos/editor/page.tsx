'use client'

import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Missing, TopBar, useShell } from '@/components/app-shell'
import { AreaChip, BackButton } from '@/components/common'
import { RemoveModuleSheet } from '@/components/module-ui'
import { ColorPicker, IconPicker } from '@/components/pickers'
import { Button } from '@/components/ui/button'
import { Chip, Field } from '@/components/ui/controls'
import { uid } from '@/shared/format'
import { FIELD_TYPES, MAX_FIELDS, MAX_MODULE_NAME, moduleHref, TEMPLATES } from '@/domain/modules'
import { useStore } from '@/shared/store'
import type { AppModule, ColorKey, FieldType, ModuleField } from '@/domain/types'

/** Campo em edição: as opções ficam como texto até salvar. */
type DraftField = ModuleField & { optionsText: string }

const toDraft = (field: ModuleField): DraftField => ({ ...field, optionsText: (field.options ?? []).join(', ') })
const newField = (): DraftField => ({ id: `c-${uid()}`, label: '', type: 'number', optionsText: '' })

/**
 * Cria (em branco ou a partir de um modelo: ?modelo=) ou edita um módulo (?id=).
 * Os parâmetros vêm do useSearchParams: durante a navegação, o window.location ainda é o da página anterior.
 */
export default function ModuleEditorPage() {
  return (
    <Suspense fallback={null}>
      <ModuleEditorRoute />
    </Suspense>
  )
}

function ModuleEditorRoute() {
  const params = useSearchParams()
  const id = params.get('id')
  const template = params.get('modelo')
  const mod = useStore(state => state.modules.find(item => item.id === id))
  if (id && !mod) return <Missing title="Módulo não encontrado" description="Ele pode ter sido excluído." href="/modulos" action="Ver módulos" />
  return <Editor key={id ?? template ?? 'novo'} mod={mod} templateKey={template} />
}

function Editor({ mod, templateKey }: { mod?: AppModule; templateKey: string | null }) {
  const router = useRouter()
  const { toast } = useShell()
  const goals = useStore(state => state.goals)
  const saveModule = useStore(state => state.saveModule)
  const preset = TEMPLATES.find(item => item.key === templateKey)
  const custom = !mod || mod.kind === 'custom'

  const [name, setName] = useState(mod?.name ?? preset?.name ?? '')
  const [icon, setIcon] = useState(mod?.icon ?? preset?.icon ?? 'sparkles')
  const [color, setColor] = useState<ColorKey>(mod?.color ?? preset?.color ?? 'mar')
  const [fields, setFields] = useState<DraftField[]>(() =>
    mod ? mod.fields.map(toDraft) : preset ? preset.fields.map(field => toDraft({ ...field, id: `c-${uid()}` })) : [newField()],
  )
  const [goalId, setGoalId] = useState<string | undefined>(mod?.goal?.goalId)
  const [fieldId, setFieldId] = useState<string | undefined>(mod?.goal?.fieldId)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState(false)

  const linkable = goals.filter(goal => goal.metric.type !== 'milestones')
  const goal = goals.find(item => item.id === goalId)
  const numeric = fields.filter(field => (field.type === 'number' || field.type === 'duration') && field.label.trim())
  const needsField = goal && (goal.metric.type === 'sum' || goal.metric.type === 'value' || goal.metric.type === 'days')
  const feed =
    numeric.find(field => field.id === fieldId) ??
    (needsField
      ? ((goal?.metric.type === 'days' ? numeric.find(field => field.type === 'duration') : numeric.find(field => field.type === 'number')) ?? numeric[0])
      : undefined)

  // qualquer mudança tira a mensagem de erro anterior
  const edit =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setError('')
    }
  const patch = (index: number, change: Partial<DraftField>) => {
    setFields(previous => previous.map((field, i) => (i === index ? { ...field, ...change } : field)))
    setError('')
  }
  const move = (index: number, direction: -1 | 1) =>
    setFields(previous => {
      const next = [...previous]
      ;[next[index], next[index + direction]] = [next[index + direction], next[index]]
      return next
    })

  const save = () => {
    const result = saveModule(
      {
        name,
        icon,
        color,
        fields: custom
          ? fields.map(({ optionsText, ...field }) => ({ ...field, options: field.type === 'choice' ? optionsText.split(',') : undefined }))
          : undefined,
        goal: custom && goalId ? { goalId, fieldId: needsField ? feed?.id : undefined } : undefined,
      },
      mod?.id,
    )
    if (!result.ok) return setError(result.error)
    toast(mod ? 'Módulo salvo' : 'Módulo criado')
    router.replace(moduleHref({ id: result.id, kind: mod?.kind ?? 'custom' }))
  }

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title={mod ? 'Editar módulo' : 'Novo módulo'} back={<BackButton label="Voltar" />} />

      <div className="flex flex-1 flex-col gap-5 px-5 pb-6">
        <div className="card flex items-center justify-between px-4 py-3">
          <span className="text-[12px] text-muted">Ficará assim:</span>
          <AreaChip area={{ name: name.trim() || 'Nome do módulo', icon, color }} />
        </div>

        <Field
          label="Nome"
          htmlFor="modulo-nome"
          hint={
            <span className="flex justify-end tabular-nums">
              {name.length}/{MAX_MODULE_NAME}
            </span>
          }
        >
          <input
            id="modulo-nome"
            className="field"
            maxLength={MAX_MODULE_NAME}
            placeholder="Ex.: Leitura"
            value={name}
            onChange={event => edit(setName)(event.target.value)}
          />
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-muted">Ícone</span>
          <IconPicker value={icon} onChange={setIcon} label="Ícone do módulo" />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[13px] text-muted">Cor</span>
          <ColorPicker value={color} onChange={setColor} label="Cor do módulo" />
        </div>

        {custom ? (
          <>
            <section aria-labelledby="campos" className="flex flex-col gap-2">
              <div>
                <h2 id="campos" className="text-[15px] font-medium">
                  O que registrar
                </h2>
                <p className="text-[12px] text-muted">
                  Cada campo vira uma pergunta na hora de registrar. Todos são opcionais no dia a dia. Um texto no topo vira o título do registro, como o nome
                  do livro.
                </p>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="card flex flex-col gap-2 p-3">
                  <div className="flex items-center gap-1">
                    <input
                      className="field min-w-0 flex-1"
                      aria-label={`Nome do campo ${index + 1}`}
                      placeholder="Nome do campo, ex.: Páginas"
                      maxLength={30}
                      value={field.label}
                      onChange={event => patch(index, { label: event.target.value })}
                    />
                    <button type="button" className="icon-btn" aria-label={`Subir o campo ${index + 1}`} disabled={index === 0} onClick={() => move(index, -1)}>
                      <ArrowUp size={18} strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Descer o campo ${index + 1}`}
                      disabled={index === fields.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown size={18} strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Remover o campo ${index + 1}`}
                      disabled={fields.length === 1}
                      onClick={() => edit(setFields)(fields.filter((_, i) => i !== index))}
                    >
                      <X size={18} strokeWidth={1.75} />
                    </button>
                  </div>
                  <select
                    className="field"
                    aria-label={`Tipo do campo ${index + 1}`}
                    value={field.type}
                    onChange={event => patch(index, { type: event.target.value as FieldType })}
                  >
                    {FIELD_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[12px] text-muted">{FIELD_TYPES.find(type => type.value === field.type)?.hint}</p>
                  {field.type === 'number' && (
                    <input
                      className="field"
                      aria-label={`Unidade do campo ${index + 1}`}
                      placeholder="Unidade (opcional): páginas, km, copos, R$"
                      maxLength={14}
                      value={field.unit ?? ''}
                      onChange={event => patch(index, { unit: event.target.value })}
                    />
                  )}
                  {field.type === 'choice' && (
                    <input
                      className="field"
                      aria-label={`Opções do campo ${index + 1}`}
                      placeholder="Opções separadas por vírgula"
                      value={field.optionsText}
                      onChange={event => patch(index, { optionsText: event.target.value })}
                    />
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="self-start"
                disabled={fields.length >= MAX_FIELDS}
                onClick={() => edit(setFields)([...fields, newField()])}
              >
                <Plus size={18} strokeWidth={1.75} aria-hidden />
                Adicionar campo
              </Button>
            </section>

            {linkable.length > 0 && (
              <section aria-labelledby="meta-ligada" className="flex flex-col gap-2">
                <div>
                  <h2 id="meta-ligada" className="text-[15px] font-medium">
                    Contar para uma meta
                  </h2>
                  <p className="text-[12px] text-muted">Opcional. Cada registro do módulo também vale como registro da meta.</p>
                </div>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Meta ligada">
                  <Chip selected={!goalId} onClick={() => setGoalId(undefined)}>
                    Não contar
                  </Chip>
                  {linkable.map(item => (
                    <Chip key={item.id} selected={goalId === item.id} onClick={() => setGoalId(item.id)}>
                      {item.title}
                    </Chip>
                  ))}
                </div>
                {needsField &&
                  (numeric.length ? (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[13px] text-muted">Qual campo vai para a meta</span>
                      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Campo enviado para a meta">
                        {numeric.map(field => (
                          <Chip key={field.id} selected={feed?.id === field.id} onClick={() => setFieldId(field.id)}>
                            {field.label}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[12px] text-muted">Esta meta pede um número. Adicione um campo de número ou de tempo para ligar.</p>
                  ))}
              </section>
            )}
          </>
        ) : (
          <p className="card p-4 text-[13px] text-muted">
            Os campos de {mod?.kind === 'fitness' ? 'treino e peso' : 'estudo'} são fixos. Aqui você muda o nome, o ícone e a cor.
          </p>
        )}

        {mod && (
          <Button variant="ghost" size="sm" className="self-start" onClick={() => setRemoving(true)}>
            <Trash2 size={18} strokeWidth={1.75} aria-hidden />
            {custom ? 'Excluir módulo' : 'Remover do app'}
          </Button>
        )}
      </div>

      <div className="sticky bottom-0 border-t-[0.5px] border-line bg-bg px-5 py-3">
        {error && (
          <p role="alert" className="mb-2 text-center text-[12px]">
            {error}
          </p>
        )}
        <Button block onClick={save}>
          {mod ? 'Salvar' : 'Criar módulo'}
        </Button>
      </div>

      <RemoveModuleSheet mod={removing ? (mod ?? null) : null} onClose={() => setRemoving(false)} onRemoved={() => router.replace('/modulos')} />
    </div>
  )
}
