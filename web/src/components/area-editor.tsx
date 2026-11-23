'use client'

import { useState } from 'react'
import { COLOR_PRESETS, MAX_AREA_NAME } from '@/domain/areas'
import { useStore } from '@/shared/store'
import type { Area, ColorKey } from '@/domain/types'
import { AreaChip } from './common'
import { Illustration } from './illustration'
import { ColorPicker, IconPicker } from './pickers'
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
  const [error, setError] = useState('')

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
        <span className="text-[12px] text-muted">Ficará assim:</span>
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
        <IconPicker value={icon} onChange={setIcon} label="Ícone da área" />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-[13px] text-muted">Cor</span>
        <ColorPicker value={color} onChange={setColor} label="Cor da área" />
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
