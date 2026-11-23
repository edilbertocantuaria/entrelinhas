'use client'

import { ArrowDown, ArrowUp, ChevronRight, Ellipsis, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { TopBar, useShell } from '@/components/app-shell'
import { AreaIcon, BackButton } from '@/components/common'
import { RemoveModuleSheet } from '@/components/module-ui'
import { Button, buttonVariants } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { fieldTypeLabel, moduleHref, TEMPLATES } from '@/domain/modules'
import { useStore } from '@/shared/store'
import type { AppModule } from '@/domain/types'
import { cn } from '@/shared/utils'

export default function ModulesPage() {
  const { toast } = useShell()
  const modules = useStore(state => state.modules)
  const moveModule = useStore(state => state.moveModule)
  const restoreModule = useStore(state => state.restoreModule)
  const [removing, setRemoving] = useState<AppModule | null>(null)
  const [menu, setMenu] = useState<{ module: AppModule; index: number } | null>(null)

  const visible = modules.filter(module => !module.hidden).sort((a, b) => a.order - b.order)
  const hidden = modules.filter(module => module.hidden)
  const used = new Set(visible.map(module => module.name.toLocaleLowerCase('pt-BR')))
  const templates = TEMPLATES.filter(template => !used.has(template.name.toLocaleLowerCase('pt-BR')))

  return (
    <div className="flex min-h-full flex-col">
      <TopBar title="Módulos" back={<BackButton href="/metas" label="Voltar para Metas" />} />
      <div className="flex flex-col gap-6 px-5 pb-8">
        <p className="text-[13px] text-muted">Módulos são cantinhos para registrar o dia a dia de um assunto, como treinos, estudos ou leitura. Eles aparecem no topo da aba Metas.</p>

        <section aria-labelledby="seus-modulos">
          <h2 id="seus-modulos" className="mb-2 text-[15px] font-medium">
            Seus módulos
          </h2>
          {visible.length === 0 ? (
            <p className="card p-4 text-[13px] text-muted">Nenhum módulo na aba Metas. Crie um abaixo ou traga de volta um que você removeu.</p>
          ) : (
            <ul className="card divide-y-[0.5px] divide-line">
              {visible.map((module, index) => (
                <li key={module.id} className="flex items-center gap-1 py-1.5 pr-1 pl-3">
                  <Link href={moduleHref(module)} className="flex min-h-12 min-w-0 flex-1 items-center gap-3">
                    <AreaIcon area={module} size={32} />
                    <span className="min-w-0">
                      <span className="block truncate text-[15px]">{module.name}</span>
                      <span className="block truncate text-[12px] text-muted">
                        {module.kind === 'fitness' ? 'Treinos, peso e cargas' : module.kind === 'study' ? 'Disciplinas, tempo e acertos' : module.fields.map(field => field.label).join(', ')}
                      </span>
                    </span>
                  </Link>
                  <button type="button" className="icon-btn" aria-label={`Opções de ${module.name}`} onClick={() => setMenu({ module, index })}>
                    <Ellipsis size={20} strokeWidth={1.75} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {hidden.length > 0 && (
          <section aria-labelledby="removidos">
            <h2 id="removidos" className="mb-2 text-[15px] font-medium">
              Removidos
            </h2>
            <ul className="card divide-y-[0.5px] divide-line">
              {hidden.map(module => (
                <li key={module.id} className="flex min-h-14 items-center gap-3 pr-1 pl-3">
                  <AreaIcon area={module} size={28} />
                  <span className="min-w-0 flex-1 truncate text-[14px] text-muted">{module.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      restoreModule(module.id)
                      toast(`${module.name} voltou para a aba Metas`)
                    }}
                  >
                    <RotateCcw size={16} strokeWidth={1.75} aria-hidden />
                    Trazer de volta
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="novo-modulo">
          <h2 id="novo-modulo" className="text-[15px] font-medium">
            Criar um módulo
          </h2>
          <p className="mb-2 text-[12px] text-muted">Comece de um modelo e ajuste os campos, ou monte do zero.</p>
          <ul className="flex flex-col gap-2">
            <li>
              <Link href="/modulos/editor" className="card flex min-h-16 items-center gap-3 border-dashed p-3">
                <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                  <Plus size={18} strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium">Em branco</span>
                  <span className="block text-[12px] text-muted">Você escolhe o nome e o que registrar.</span>
                </span>
                <ChevronRight size={20} strokeWidth={1.75} aria-hidden className="text-muted" />
              </Link>
            </li>
            {templates.map(template => (
              <li key={template.key}>
                <Link href={`/modulos/editor?modelo=${template.key}`} className="card flex min-h-16 items-center gap-3 p-3">
                  <AreaIcon area={template} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium">{template.name}</span>
                    <span className="block text-[12px] text-muted">{template.description}</span>
                    <span className="mt-0.5 block truncate text-[12px] text-muted">{template.fields.map(field => `${field.label} (${fieldTypeLabel(field.type).toLocaleLowerCase('pt-BR')})`).join(' · ')}</span>
                  </span>
                  <ChevronRight size={20} strokeWidth={1.75} aria-hidden className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <Sheet open={!!menu} onClose={() => setMenu(null)} title={menu?.module.name ?? ''}>
        {menu && (
          <div className="flex flex-col gap-2">
            <Link href={`/modulos/editor?id=${menu.module.id}`} className={cn(buttonVariants({ variant: 'outline', block: true }), 'justify-start')}>
              <Pencil size={18} strokeWidth={1.75} aria-hidden />
              Editar nome, ícone e cor{menu.module.kind === 'custom' ? ' e campos' : ''}
            </Link>
            <Button
              variant="outline"
              block
              className="justify-start"
              disabled={menu.index === 0}
              onClick={() => {
                moveModule(menu.module.id, -1)
                setMenu(null)
              }}
            >
              <ArrowUp size={18} strokeWidth={1.75} aria-hidden />
              Mover para cima
            </Button>
            <Button
              variant="outline"
              block
              className="justify-start"
              disabled={menu.index === visible.length - 1}
              onClick={() => {
                moveModule(menu.module.id, 1)
                setMenu(null)
              }}
            >
              <ArrowDown size={18} strokeWidth={1.75} aria-hidden />
              Mover para baixo
            </Button>
            <Button
              variant="outline"
              block
              className="justify-start"
              onClick={() => {
                setRemoving(menu.module)
                setMenu(null)
              }}
            >
              <Trash2 size={18} strokeWidth={1.75} aria-hidden />
              {menu.module.kind === 'custom' ? 'Excluir módulo' : 'Remover do app'}
            </Button>
          </div>
        )}
      </Sheet>

      <RemoveModuleSheet module={removing} onClose={() => setRemoving(null)} />
    </div>
  )
}
