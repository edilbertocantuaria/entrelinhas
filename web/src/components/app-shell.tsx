'use client'

import { BookOpen, Settings2, Sun, Target, WifiOff } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useStore } from '@/shared/store'
import { useClock } from '@/shared/time'
import { cn } from '@/shared/utils'
import { Illustration, OverridesContext } from './illustration'
import { Login } from './login'
import { Onboarding } from './onboarding'
import { useSummaryAI } from './summary-ai'

interface Shell {
  /** moldura do celular: é nela que as folhas são montadas */
  frame: HTMLElement | null
  scroller: HTMLElement | null
  toast: (message: string) => void
}

const ShellContext = createContext<Shell>({ frame: null, scroller: null, toast: () => {} })
export const useShell = () => useContext(ShellContext)

const TABS = [
  { href: '/', label: 'Hoje', icon: Sun, match: (path: string) => path === '/' },
  {
    href: '/metas',
    label: 'Metas',
    icon: Target,
    match: (path: string) => ['/metas', '/fitness', '/estudos', '/modulos'].some(prefix => path.startsWith(prefix)),
  },
  { href: '/diario', label: 'Diário', icon: BookOpen, match: (path: string) => path.startsWith('/diario') || path.startsWith('/revisao') },
  { href: '/ajustes', label: 'Ajustes', icon: Settings2, match: (path: string) => path.startsWith('/ajustes') },
]

/** Fluxos em tela cheia, sem a barra de abas. */
const FULLSCREEN = ['/abertura', '/fechamento', '/metas/nova', '/metas/ia', '/retrospectiva']

export function AppShell({ children, overrides }: { children: ReactNode; overrides: string[] }) {
  const [frame, setFrame] = useState<HTMLElement | null>(null)
  const [scroller, setScroller] = useState<HTMLElement | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const pathname = usePathname()

  const signedIn = useStore(state => !!state.session)
  const onboarded = useStore(state => state.onboarded)
  const theme = useStore(state => state.settings.theme)
  const runSchedule = useStore(state => state.runSchedule)
  const { today, time } = useClock()

  useEffect(() => {
    Promise.resolve(useStore.persist.rehydrate()).finally(() => setHydrated(true))
  }, [])

  // App instalável e offline: registra o service worker (só na versão publicada, não no npm run dev)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(error => console.warn('[sw] não registrou:', error))
  }, [])

  // Tema: claro, escuro ou o do sistema
  useEffect(() => {
    if (!hydrated) return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && media.matches))
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme, hydrated])

  // Resumos e retrospectiva: gera o que estiver pendente ao abrir o app
  useEffect(() => {
    if (hydrated && signedIn && onboarded) runSchedule(today, time)
  }, [hydrated, signedIn, onboarded, today, time, runSchedule])

  // Resumos que esperam o texto da IA
  useSummaryAI()

  // Tarefas que se repetem: as ocorrências de hoje entram na lista
  const rules = useStore(state => state.rules)
  const goalsCount = useStore(state => state.goals.length)
  const ensureOccurrences = useStore(state => state.ensureOccurrences)
  useEffect(() => {
    if (hydrated && signedIn && onboarded) ensureOccurrences(today)
  }, [hydrated, signedIn, onboarded, today, rules, goalsCount, ensureOccurrences])

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  useEffect(() => {
    scroller?.scrollTo({ top: 0 })
  }, [pathname, scroller])

  const toast = useCallback((text: string) => {
    setMessage(text)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMessage(null), 2600)
  }, [])

  const shell = useMemo(() => ({ frame, scroller, toast }), [frame, scroller, toast])
  const showTabs = !FULLSCREEN.some(prefix => pathname.startsWith(prefix))

  return (
    <OverridesContext.Provider value={overrides}>
      <ShellContext.Provider value={shell}>
        <div className="stage">
          <div className="phone" ref={setFrame}>
            {!hydrated ? (
              <div className="grid flex-1 place-items-center" role="status" aria-label="Carregando" />
            ) : !signedIn ? (
              <Login />
            ) : !onboarded ? (
              <Onboarding />
            ) : (
              <>
                {offline && (
                  <p role="status" className="flex items-center justify-center gap-2 bg-primary-soft px-4 py-2 text-[12px] text-ink">
                    <WifiOff size={14} strokeWidth={1.75} aria-hidden />
                    Sem conexão. Tudo continua guardado neste aparelho.
                  </p>
                )}
                <main ref={setScroller} className="scroller">
                  {children}
                </main>
                {showTabs && (
                  <nav
                    aria-label="Navegação principal"
                    className="grid shrink-0 grid-cols-4 border-t-[0.5px] border-line bg-surface px-2 pb-[max(4px,env(safe-area-inset-bottom))]"
                  >
                    {TABS.map(tab => {
                      const active = tab.match(pathname)
                      return (
                        <Link
                          key={tab.href}
                          href={tab.href}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex h-[60px] flex-col items-center justify-center gap-1 rounded-ctl text-[12px]',
                            active ? 'font-medium text-primary' : 'text-muted',
                          )}
                        >
                          <tab.icon size={20} strokeWidth={1.75} aria-hidden />
                          {tab.label}
                        </Link>
                      )
                    })}
                  </nav>
                )}
              </>
            )}
            <div aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-[84px] z-50 flex justify-center px-6">
              {message && <p className="fade-in rounded-ctl bg-ink px-4 py-2.5 text-center text-[13px] text-bg">{message}</p>}
            </div>
          </div>
        </div>
      </ShellContext.Provider>
    </OverridesContext.Provider>
  )
}

/** Cabeçalho simples das telas internas. */
export function TopBar({ title, back, right }: { title: string; back?: ReactNode; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-1 bg-bg px-2">
      {back ?? <span className="w-3" />}
      <h1 className="min-w-0 flex-1 truncate text-[17px] font-medium">{title}</h1>
      {right}
    </header>
  )
}

/** Cena de espera para rotas que dependem de um item que ainda não existe. */
export function Missing({ title, description, href, action }: { title: string; description: string; href: string; action: string }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-8 py-16 text-center">
      <Illustration name="not-found" level="core" decorative />
      <h1 className="mt-4 text-[17px] font-medium">{title}</h1>
      <p className="mt-1 text-muted">{description}</p>
      <Link href={href} className="mt-5 inline-flex h-12 items-center rounded-ctl bg-primary px-5 text-[15px] font-medium text-on-primary">
        {action}
      </Link>
    </div>
  )
}
