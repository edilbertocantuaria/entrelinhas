'use client'

import { Archive, ChevronDown, Ellipsis, GripVertical, LayoutGrid, Pencil, Trash2 } from 'lucide-react'
import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { AreaEditor } from '@/components/area-editor'
import { TopBar, useShell } from '@/components/app-shell'
import { AreaIcon, BackButton, EmptyState } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/controls'
import { Sheet } from '@/components/ui/sheet'
import { MAX_ACTIVE_AREAS } from '@/lib/areas'
import { plural } from '@/lib/format'
import { useStore } from '@/lib/store'
import type { Area } from '@/lib/types'
import { cn } from '@/lib/utils'

const ROW = 60

export default function AreasPage() {
  const { toast } = useShell()
  const areas = useStore(state => state.areas)
  const goals = useStore(state => state.goals)
  const reorderAreas = useStore(state => state.reorderAreas)
  const archiveArea = useStore(state => state.archiveArea)
  const restoreArea = useStore(state => state.restoreArea)
  const deleteArea = useStore(state => state.deleteArea)

  const [editor, setEditor] = useState<{ open: boolean; id?: string }>({ open: false })
  const [menu, setMenu] = useState<Area | null>(null)
  const [removing, setRemoving] = useState<Area | null>(null)
  const [choice, setChoice] = useState<'move' | 'archive'>('move')
  const [moveTo, setMoveTo] = useState('')
  const [archivedOpen, setArchivedOpen] = useState(false)
  const [dragOrder, setDragOrder] = useState<string[] | null>(null)
  const drag = useRef<{ id: string; startY: number; startIndex: number } | null>(null)

  const active = areas.filter(area => !area.archived).sort((a, b) => a.order - b.order)
  const archived = areas.filter(area => area.archived).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  const ids = dragOrder ?? active.map(area => area.id)
  const rows = ids.map(id => active.find(area => area.id === id)).filter((area): area is Area => !!area)
  const count = (id: string) => goals.filter(goal => goal.areaId === id).length
  const atLimit = active.length >= MAX_ACTIVE_AREAS
  const removingGoals = removing ? count(removing.id) : 0
  const others = active.filter(area => area.id !== removing?.id)

  const move = (list: string[], id: string, to: number) => {
    const next = list.filter(item => item !== id)
    next.splice(Math.max(0, Math.min(list.length - 1, to)), 0, id)
    return next
  }

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>, id: string, index: number) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { id, startY: event.clientY, startIndex: index }
    setDragOrder(active.map(area => area.id))
  }
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const state = drag.current
    if (!state) return
    const to = state.startIndex + Math.round((event.clientY - state.startY) / ROW)
    setDragOrder(move(active.map(area => area.id), state.id, to))
  }
  const onPointerUp = () => {
    if (drag.current && dragOrder) reorderAreas(dragOrder)
    drag.current = null
    setDragOrder(null)
  }
  const onKeyDown = (event: KeyboardEvent, id: string, index: number) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return
    event.preventDefault()
    reorderAreas(move(active.map(area => area.id), id, index + (event.key === 'ArrowUp' ? -1 : 1)))
  }

  const askRemove = (area: Area) => {
    setMenu(null)
    if (active.length <= 1) return toast('Pelo menos uma área precisa ficar ativa.')
    setChoice('move')
    setMoveTo(active.find(item => item.id !== area.id)?.id ?? '')
    setRemoving(area)
  }

  const confirmRemove = () => {
    if (!removing) return
    if (removingGoals === 0) deleteArea(removing.id)
    else if (choice === 'archive') archiveArea(removing.id)
    else deleteArea(removing.id, moveTo)
    toast(removingGoals > 0 && choice === 'archive' ? 'Área arquivada' : 'Área excluída')
    setRemoving(null)
  }

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Áreas da vida" back={<BackButton label="Voltar" />} />
      <div className="flex-1 px-5 pb-4">
        <p className="text-[13px] text-muted">As metas ficam agrupadas por área. Arraste para mudar a ordem.</p>

        {active.length === 0 ? (
          <EmptyState illustration="areas-empty" icon={LayoutGrid} title="Nenhuma área ativa" description="Crie uma área para agrupar suas metas." />
        ) : (
          <ul className="card mt-4 divide-y-[0.5px] divide-line">
            {rows.map((area, index) => {
              const total = count(area.id)
              return (
                <li key={area.id} className={cn('flex items-center gap-1 pr-1', drag.current?.id === area.id && 'bg-primary-soft')} style={{ height: ROW }}>
                  <button
                    type="button"
                    className="icon-btn cursor-grab touch-none active:cursor-grabbing"
                    aria-label={`Reordenar ${area.name}. Use as setas para cima e para baixo.`}
                    onPointerDown={event => onPointerDown(event, area.id, index)}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onKeyDown={event => onKeyDown(event, area.id, index)}
                  >
                    <GripVertical size={20} strokeWidth={1.75} />
                  </button>
                  <AreaIcon area={area} size={32} />
                  <div className="min-w-0 flex-1 pl-2">
                    <p className="truncate text-[15px]">{area.name}</p>
                    <p className="text-[12px] text-muted">{total === 0 ? 'Nenhuma meta' : `${total} ${plural(total, 'meta ativa', 'metas ativas')}`}</p>
                  </div>
                  <button type="button" className="icon-btn" aria-label={`Opções de ${area.name}`} onClick={() => setMenu(area)}>
                    <Ellipsis size={20} strokeWidth={1.75} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {archived.length > 0 && (
          <section className="mt-5">
            <button type="button" aria-expanded={archivedOpen} onClick={() => setArchivedOpen(!archivedOpen)} className="flex min-h-11 w-full items-center gap-2 rounded-ctl px-1 text-left text-muted">
              <Archive size={18} strokeWidth={1.75} aria-hidden />
              <span className="flex-1 text-[14px]">Arquivadas</span>
              <span className="text-[12px] tabular-nums">{archived.length}</span>
              <ChevronDown size={20} strokeWidth={1.75} aria-hidden className={cn('transition-transform', archivedOpen && 'rotate-180')} />
            </button>
            {archivedOpen && (
              <ul className="card fade-in divide-y-[0.5px] divide-line">
                {archived.map(area => (
                  <li key={area.id} className="flex min-h-14 items-center gap-3 pr-1 pl-4">
                    <AreaIcon area={area} size={28} />
                    <span className="min-w-0 flex-1 truncate text-[14px] text-muted">{area.name}</span>
                    <Button variant="ghost" size="sm" onClick={() => !restoreArea(area.id) && toast(`O limite é de ${MAX_ACTIVE_AREAS} áreas ativas.`)}>
                      Restaurar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <div className="sticky bottom-0 border-t-[0.5px] border-line bg-bg px-5 py-3">
        {atLimit && <p className="mb-2 text-center text-[12px] text-muted">Você chegou a {MAX_ACTIVE_AREAS} áreas ativas. Arquive uma para criar outra.</p>}
        <Button block disabled={atLimit} onClick={() => setEditor({ open: true })}>
          Nova área
        </Button>
      </div>

      <AreaEditor open={editor.open} areaId={editor.id} onClose={() => setEditor(previous => ({ ...previous, open: false }))} />

      <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu?.name ?? ''}>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            block
            className="justify-start"
            onClick={() => {
              setEditor({ open: true, id: menu?.id })
              setMenu(null)
            }}
          >
            <Pencil size={18} strokeWidth={1.75} aria-hidden />
            Editar
          </Button>
          <Button
            variant="outline"
            block
            className="justify-start"
            onClick={() => {
              if (menu) toast(archiveArea(menu.id) ? 'Área arquivada' : 'Pelo menos uma área precisa ficar ativa.')
              setMenu(null)
            }}
          >
            <Archive size={18} strokeWidth={1.75} aria-hidden />
            Arquivar
          </Button>
          <Button variant="outline" block className="justify-start" onClick={() => menu && askRemove(menu)}>
            <Trash2 size={18} strokeWidth={1.75} aria-hidden />
            Excluir
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={removingGoals ? `O que fazer com ${removing?.name}?` : `Excluir a área ${removing?.name ?? ''}?`}
        description={
          removingGoals
            ? `Esta área tem ${removingGoals} ${plural(removingGoals, 'meta', 'metas')}. Nada se perde: escolha para onde elas vão.`
            : 'Ela não tem metas. Dá para criar de novo quando quiser.'
        }
      >
        {removingGoals > 0 && (
          <div className="mb-4 flex flex-col gap-2" role="radiogroup" aria-label="Destino das metas">
            <button type="button" role="radio" aria-checked={choice === 'move'} onClick={() => setChoice('move')} className={cn('rounded-card border-[0.5px] p-4 text-left', choice === 'move' ? 'border-primary bg-primary-soft' : 'border-line bg-surface')}>
              <span className="block text-[14px] font-medium">Mover as metas para outra área</span>
              <span className="text-[12px] text-muted">A área é excluída e as metas continuam com todo o histórico.</span>
            </button>
            {choice === 'move' && (
              <div className="flex flex-wrap gap-2 py-1" role="radiogroup" aria-label="Área de destino">
                {others.map(area => (
                  <Chip key={area.id} selected={moveTo === area.id} onClick={() => setMoveTo(area.id)} className="pl-2">
                    <AreaIcon area={area} />
                    {area.name}
                  </Chip>
                ))}
              </div>
            )}
            <button type="button" role="radio" aria-checked={choice === 'archive'} onClick={() => setChoice('archive')} className={cn('rounded-card border-[0.5px] p-4 text-left', choice === 'archive' ? 'border-primary bg-primary-soft' : 'border-line bg-surface')}>
              <span className="block text-[14px] font-medium">Arquivar a área</span>
              <span className="text-[12px] text-muted">Mantém metas, registros e histórico. Ela some dos filtros e das novas metas.</span>
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setRemoving(null)}>
            Cancelar
          </Button>
          <Button variant={removingGoals ? 'primary' : 'outline'} className="flex-1" disabled={removingGoals > 0 && choice === 'move' && !moveTo} onClick={confirmRemove}>
            {removingGoals === 0 ? 'Excluir área' : choice === 'archive' ? 'Arquivar área' : 'Mover e excluir'}
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
