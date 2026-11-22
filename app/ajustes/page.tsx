'use client'

import { Bell, ChevronRight, Cloud, Download, Image as ImageIcon, LayoutGrid, Leaf, LogOut, Mail, Monitor, Moon, Settings2, Sun } from 'lucide-react'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { useShell } from '@/components/app-shell'
import { AreaIcon, SectionTitle } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Segmented, Stepper, Switch } from '@/components/ui/controls'
import { Sheet } from '@/components/ui/sheet'
import { fmt } from '@/lib/format'
import { useStore } from '@/lib/store'
import { penultimateThursday } from '@/lib/summaries'
import { useClock } from '@/lib/time'
import type { IllustrationDensity, ThemeSetting } from '@/lib/types'

function Row({ title, hint, children, htmlFor }: { title: string; hint?: string; children?: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex min-h-14 items-center gap-3 py-2">
      <label htmlFor={htmlFor} className="min-w-0 flex-1">
        <span className="block text-[14px]">{title}</span>
        {hint && <span className="block text-[12px] text-muted">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

const timeField = 'field w-[108px] shrink-0 px-2 text-center'

export default function SettingsPage() {
  const { today } = useClock()
  const { toast } = useShell()
  const settings = useStore(state => state.settings)
  const set = useStore(state => state.setSettings)
  const goals = useStore(state => state.goals)
  const areas = useStore(state => state.areas)
  const updateGoal = useStore(state => state.updateGoal)
  const resetAll = useStore(state => state.resetAll)
  const session = useStore(state => state.session)
  const signOut = useStore(state => state.signOut)
  const [resetting, setResetting] = useState(false)

  const year = Number(today.slice(0, 4))
  const defaultRetro = penultimateThursday(year)
  const retroDate = settings.retroDate ?? defaultRetro
  const activeAreas = areas.filter(area => !area.archived).length

  const exportData = () => {
    const { areas, goals, logs, tasks, journal, summaries, retros, reviews, settings } = useStore.getState()
    const blob = new Blob([JSON.stringify({ areas, goals, logs, tasks, journal, summaries, retros, reviews, settings }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `entrelinhas-${today}.json`
    link.click()
    URL.revokeObjectURL(url)
    toast('Arquivo exportado')
  }

  return (
    <div className="px-5 pt-6 pb-10">
      <h1 className="text-[22px] font-medium">Ajustes</h1>

      {session && (
        <section className="card mt-5 flex items-center gap-3 p-4">
          <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-[17px] font-medium">
            {session.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium">{session.name}</p>
            <p className="truncate text-[12px] text-muted">{session.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut size={16} strokeWidth={1.75} aria-hidden />
            Sair
          </Button>
        </section>
      )}

      <section className="card mt-5 p-4">
        <SectionTitle title="Modo saudável" illustration="settings-healthy-mode" icon={Leaf} />
        <div className="mt-2 divide-y-[0.5px] divide-line">
          <Row title="Máximo de tarefas por dia" hint="O que passar disso espera em Depois.">
            <Stepper label="Máximo de tarefas por dia" min={1} max={10} value={settings.maxTasks} onChange={maxTasks => set({ maxTasks })} />
          </Row>
          <Row title="Esconder sequências" hint="Sem contagem de dias seguidos.">
            <Switch label="Esconder sequências" checked={settings.hideStreaks} onChange={hideStreaks => set({ hideStreaks })} />
          </Row>
          <Row title="Esconder porcentagens" hint="As barras continuam, sem os números.">
            <Switch label="Esconder porcentagens de conclusão" checked={settings.hidePercent} onChange={hidePercent => set({ hidePercent })} />
          </Row>
          <div className="py-3">
            <p className="text-[14px]">Horário de silêncio</p>
            <p className="text-[12px] text-muted">Nenhum lembrete neste intervalo.</p>
            <div className="mt-2 flex items-center gap-2 text-[13px] text-muted">
              <input type="time" aria-label="Início do silêncio" className={timeField} value={settings.quietFrom} onChange={event => set({ quietFrom: event.target.value })} />
              às
              <input type="time" aria-label="Fim do silêncio" className={timeField} value={settings.quietTo} onChange={event => set({ quietTo: event.target.value })} />
            </div>
          </div>
          <Row title="Virada do dia" hint="Antes desse horário ainda conta como ontem." htmlFor="virada">
            <input id="virada" type="time" className={timeField} value={settings.rollover} onChange={event => event.target.value && set({ rollover: event.target.value })} />
          </Row>
        </div>
      </section>

      <section className="card mt-4 p-4">
        <SectionTitle title="Áreas da vida" illustration="settings-areas" icon={LayoutGrid} />
        <Link href="/ajustes/areas" className="mt-2 flex min-h-14 items-center gap-3 rounded-ctl">
          <span className="flex-1">
            <span className="block text-[14px]">Gerenciar áreas</span>
            <span className="block text-[12px] text-muted">{activeAreas} ativas</span>
          </span>
          <ChevronRight size={20} strokeWidth={1.75} aria-hidden className="text-muted" />
        </Link>
      </section>

      <section className="card mt-4 p-4">
        <SectionTitle title="Resumos e IA" illustration="settings-summaries" icon={Mail} />
        <div className="mt-2 divide-y-[0.5px] divide-line">
          <Row title="Resumos mensais automáticos" hint="No primeiro dia do mês seguinte.">
            <Switch label="Resumos mensais automáticos" checked={settings.monthlyAuto} onChange={monthlyAuto => set({ monthlyAuto })} />
          </Row>
          <Row title="Resumos trimestrais" hint="Depois de março, junho, setembro e dezembro.">
            <Switch label="Resumos trimestrais" checked={settings.quarterlyAuto} onChange={quarterlyAuto => set({ quarterlyAuto })} />
          </Row>
          <Row title="Retrospectiva anual">
            <Switch label="Retrospectiva anual" checked={settings.retroEnabled} onChange={retroEnabled => set({ retroEnabled })} />
          </Row>
          {settings.retroEnabled && (
            <div className="py-3">
              <p className="text-[14px]">Quando gerar a retrospectiva</p>
              <div className="mt-2 flex gap-2">
                <input type="date" aria-label="Data da retrospectiva" className="field min-w-0 flex-1" min={`${year}-12-01`} max={`${year}-12-31`} value={retroDate} onChange={event => event.target.value && set({ retroDate: event.target.value })} />
                <input type="time" aria-label="Horário da retrospectiva" className={timeField} value={settings.retroTime} onChange={event => event.target.value && set({ retroTime: event.target.value })} />
              </div>
              <p className="mt-1.5 flex items-center gap-2 text-[12px] text-muted">
                <span className="flex-1">Padrão: penúltima quinta de dezembro ({fmt(defaultRetro, "d 'de' MMM")}), às 20:00.</span>
                {(settings.retroDate || settings.retroTime !== '20:00') && (
                  <button type="button" className="min-h-11 px-1 text-primary" onClick={() => set({ retroDate: null, retroTime: '20:00' })}>
                    Usar padrão
                  </button>
                )}
              </p>
            </div>
          )}
          <Row title="Usar IA nos resumos" hint="Sem IA, o resumo traz só os seus números.">
            <Switch label="Usar IA nos resumos" checked={settings.useAI} onChange={useAI => set({ useAI })} />
          </Row>
        </div>
        <p className="mt-2 rounded-ctl bg-primary-soft p-3 text-[12px] leading-relaxed">
          Para gerar resumos, o texto do seu diário é enviado a um serviço de IA. Você pode desativar quando quiser.
        </p>
      </section>

      <section className="card mt-4 p-4">
        <SectionTitle title="Aparência" illustration="settings-appearance" icon={Sun} />
        <p className="mt-3 mb-1.5 text-[13px] text-muted">Tema</p>
        <Segmented<ThemeSetting>
          label="Tema"
          value={settings.theme}
          onChange={theme => set({ theme })}
          options={[
            { value: 'light', label: 'Claro', icon: <Sun size={16} strokeWidth={1.75} aria-hidden /> },
            { value: 'dark', label: 'Escuro', icon: <Moon size={16} strokeWidth={1.75} aria-hidden /> },
            { value: 'system', label: 'Sistema', icon: <Monitor size={16} strokeWidth={1.75} aria-hidden /> },
          ]}
        />
        <p className="mt-4 mb-1.5 flex items-center gap-1.5 text-[13px] text-muted">
          <ImageIcon size={16} strokeWidth={1.75} aria-hidden />
          Ilustrações
        </p>
        <Segmented<IllustrationDensity>
          label="Ilustrações"
          value={settings.illustrations}
          onChange={illustrations => set({ illustrations })}
          options={[
            { value: 'many', label: 'Muitas' },
            { value: 'few', label: 'Poucas' },
            { value: 'none', label: 'Nenhuma' },
          ]}
        />
        <p className="mt-1.5 text-[12px] text-muted">
          {settings.illustrations === 'many' ? 'Ilustrações em todo o app.' : settings.illustrations === 'few' ? 'Só em telas vazias, boas-vindas e retrospectiva.' : 'Apenas ícones.'}
        </p>
      </section>

      <section className="card mt-4 p-4">
        <SectionTitle title="Lembretes por meta" illustration="settings-reminders" icon={Bell} />
        {goals.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted">Os lembretes aparecem aqui quando você criar uma meta.</p>
        ) : (
          <ul className="mt-2 divide-y-[0.5px] divide-line">
            {goals.map(goal => (
              <li key={goal.id} className="flex min-h-14 items-center gap-2 py-2">
                <AreaIcon area={areas.find(area => area.id === goal.areaId)} />
                <span className="min-w-0 flex-1 truncate text-[14px]">{goal.title}</span>
                {goal.reminder.on && (
                  <input type="time" aria-label={`Horário do lembrete de ${goal.title}`} className={timeField} value={goal.reminder.time} onChange={event => event.target.value && updateGoal(goal.id, { reminder: { ...goal.reminder, time: event.target.value } })} />
                )}
                <Switch label={`Lembrete de ${goal.title}`} checked={goal.reminder.on} onChange={on => updateGoal(goal.id, { reminder: { ...goal.reminder, on } })} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card mt-4 p-4">
        <SectionTitle title="Backup e sincronização" illustration="settings-backup" icon={Cloud} />
        <p className="mt-3 text-[13px] text-muted">Seus dados ficam só neste aparelho. A sincronização entre aparelhos chega em breve.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={exportData}>
          <Download size={16} strokeWidth={1.75} aria-hidden />
          Exportar dados
        </Button>
      </section>

      <section className="card mt-4 p-4">
        <SectionTitle title="Protótipo" illustration="settings-prototype" icon={Settings2} />
        <div className="mt-2 divide-y-[0.5px] divide-line">
          <div className="py-3">
            <label htmlFor="data-simulada" className="text-[14px]">
              Data simulada
            </label>
            <p className="text-[12px] text-muted">Para testar a virada do mês, os resumos e a retrospectiva (24 de dezembro de 2026).</p>
            <div className="mt-2 flex gap-2">
              <input id="data-simulada" type="date" className="field min-w-0 flex-1" value={settings.demoDate ?? ''} onChange={event => set({ demoDate: event.target.value || null })} />
              {settings.demoDate && (
                <Button variant="ghost" size="sm" className="h-12" onClick={() => set({ demoDate: null })}>
                  Usar data real
                </Button>
              )}
            </div>
          </div>
          <div className="pt-3">
            <Button variant="outline" size="sm" onClick={() => setResetting(true)}>
              Restaurar dados de exemplo
            </Button>
          </div>
        </div>
      </section>

      <Sheet open={resetting} onClose={() => setResetting(false)} title="Restaurar os dados de exemplo?" description="Tudo o que você criou neste aparelho é substituído pelo exemplo inicial, e as boas-vindas aparecem de novo.">
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => setResetting(false)}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => {
              resetAll()
              setResetting(false)
            }}
          >
            Restaurar
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
