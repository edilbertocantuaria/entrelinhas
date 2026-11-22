'use client'

import { Check, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { areaColor, COLOR_PRESETS, ICON_GROUPS, MAX_AREA_NAME } from '@/lib/areas'
import { useStore } from '@/lib/store'
import type { Area, ColorKey } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AreaChip } from './common'
import { Illustration } from './illustration'
import { Button } from './ui/button'
import { Field } from './ui/controls'
import { Sheet } from './ui/sheet'

interface Props {
  open: boolean
  /** sem id: cria uma área nova */
  areaId?: string
  onClose: () => void
  onSaved?: (id: string) => void
}

export function AreaEditor({ open, areaId, onClose, onSaved }: Props) {
  const area = useStore(state => state.areas.find(item => item.id === areaId))
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={area ? 'Editar área' : 'Nova área'}
      header={
        <div className="-mb-1 flex justify-center">
          <Illustration name="sparkle" height={56} decorative />
        </div>
      }
    >
      <EditorForm key={`${areaId ?? 'new'}-${open}`} area={area} onClose={onClose} onSaved={onSaved} />
    </Sheet>
  )
}

function EditorForm({ area, onClose, onSaved }: { area?: Area; onClose: () => void; onSaved?: (id: string) => void }) {
  const saveArea = useStore(state => state.saveArea)
  const used = useStore(state => state.areas)
  const firstFree = COLOR_PRESETS.find(preset => !used.some(item => item.color === preset.key))?.key ?? 'verde'

  const [name, setName] = useState(area?.name ?? '')
  const [icon, setIcon] = useState(area?.icon ?? 'sparkles')
  const [color, setColor] = useState<ColorKey>(area?.color ?? firstFree)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  const groups = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR')
    if (!term) return ICON_GROUPS
    return ICON_GROUPS.map(group => ({
      ...group,
      icons: group.name.toLocaleLowerCase('pt-BR').includes(term)
        ? group.icons
        : group.icons.filter(def => def.label.toLocaleLowerCase('pt-BR').includes(term) || def.name.includes(term)),
    })).filter(group => group.icons.length)
  }, [query])

  const submit = () => {
    const result = saveArea({ name, icon, color }, area?.id)
    if (!result.ok) return setError(result.error)
    onSaved?.(result.id)
    onClose()
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={event => {
        event.preventDefault()
        submit()
      }}
    >
      <div className="card flex items-center justify-between px-4 py-3">
        <span className="text-[12px] text-muted">Prévia</span>
        <AreaChip area={{ name: name.trim() || 'Nome da área', icon, color }} />
      </div>

      <Field
        label="Nome"
        htmlFor="area-name"
        hint={
          <span className="flex justify-between gap-3">
            <span role={error ? 'alert' : undefined}>{error}</span>
            <span className="tabular-nums">
              {name.length}/{MAX_AREA_NAME}
            </span>
          </span>
        }
      >
        <input
          id="area-name"
          className="field"
          maxLength={MAX_AREA_NAME}
          value={name}
          aria-invalid={!!error}
          placeholder="Ex.: Família"
          onChange={event => {
            setName(event.target.value)
            setError('')
          }}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] text-muted">Ícone</span>
        <div className="relative">
          <Search size={18} strokeWidth={1.75} aria-hidden className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
          <input className="field" style={{ paddingLeft: 42 }} type="search" aria-label="Buscar ícone" placeholder="Buscar ícone" value={query} onChange={event => setQuery(event.target.value)} />
        </div>
        <div className="card max-h-56 overflow-y-auto p-3" role="radiogroup" aria-label="Ícone da área">
          {groups.length === 0 && <p className="py-4 text-center text-[13px] text-muted">Nenhum ícone com esse nome.</p>}
          {groups.map(group => (
            <div key={group.name} className="mb-3 last:mb-0">
              <p className="mb-1.5 text-[12px] text-muted">{group.name}</p>
              <div className="grid grid-cols-5 gap-2">
                {group.icons.map(def => {
                  const selected = def.name === icon
                  return (
                    <button
                      key={def.name}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      aria-label={def.label}
                      onClick={() => setIcon(def.name)}
                      className={cn(
                        'grid h-11 place-items-center rounded-ctl border',
                        selected ? 'border-primary bg-primary-soft text-primary' : 'border-transparent text-muted hover:bg-primary-soft',
                      )}
                    >
                      <def.icon size={20} strokeWidth={1.75} />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] text-muted">Cor</span>
        <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Cor da área">
          {COLOR_PRESETS.map(preset => {
            const selected = preset.key === color
            return (
              <button
                key={preset.key}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={preset.label}
                onClick={() => setColor(preset.key)}
                className={cn('grid h-11 place-items-center rounded-ctl border', selected ? 'border-primary bg-primary-soft' : 'border-transparent')}
              >
                <span className="grid size-7 place-items-center rounded-full" style={{ background: areaColor(preset.key) }}>
                  {selected && <Check size={16} strokeWidth={2.25} className="text-surface" aria-hidden />}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="sticky -bottom-5 -mx-5 flex gap-2 bg-bg px-5 pt-2 pb-5">
        <Button variant="ghost" className="flex-1" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1">
          Salvar
        </Button>
      </div>
    </form>
  )
}
