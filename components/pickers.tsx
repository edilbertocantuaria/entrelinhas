'use client'

import { Check, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { areaColor, COLOR_PRESETS, ICON_GROUPS } from '@/lib/areas'
import type { ColorKey } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Ícones lucide agrupados, com busca. Usado em áreas e módulos. */
export function IconPicker({ value, onChange, label }: { value: string; onChange: (icon: string) => void; label: string }) {
  const [query, setQuery] = useState('')
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

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search size={18} strokeWidth={1.75} aria-hidden className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
        <input className="field" style={{ paddingLeft: 42 }} type="search" aria-label="Buscar ícone" placeholder="Buscar ícone" value={query} onChange={event => setQuery(event.target.value)} />
      </div>
      <div className="card max-h-56 overflow-y-auto p-3" role="radiogroup" aria-label={label}>
        {groups.length === 0 && <p className="py-4 text-center text-[13px] text-muted">Nenhum ícone com esse nome.</p>}
        {groups.map(group => (
          <div key={group.name} className="mb-3 last:mb-0">
            <p className="mb-1.5 text-[12px] text-muted">{group.name}</p>
            <div className="grid grid-cols-5 gap-2">
              {group.icons.map(def => {
                const selected = def.name === value
                return (
                  <button
                    key={def.name}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={def.label}
                    onClick={() => onChange(def.name)}
                    className={cn('grid h-11 place-items-center rounded-ctl border', selected ? 'border-primary bg-primary-soft text-primary' : 'border-transparent text-muted hover:bg-primary-soft')}
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
  )
}

/** As 10 cores fixas. */
export function ColorPicker({ value, onChange, label }: { value: ColorKey; onChange: (color: ColorKey) => void; label: string }) {
  return (
    <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label={label}>
      {COLOR_PRESETS.map(preset => {
        const selected = preset.key === value
        return (
          <button
            key={preset.key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={preset.label}
            onClick={() => onChange(preset.key)}
            className={cn('grid h-11 place-items-center rounded-ctl border', selected ? 'border-primary bg-primary-soft' : 'border-transparent')}
          >
            <span className="grid size-7 place-items-center rounded-full" style={{ background: areaColor(preset.key) }}>
              {selected && <Check size={16} strokeWidth={2.25} className="text-surface" aria-hidden />}
            </span>
          </button>
        )
      })}
    </div>
  )
}
