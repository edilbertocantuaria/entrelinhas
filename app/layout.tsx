import fs from 'node:fs'
import path from 'node:path'
import type { Metadata, Viewport } from 'next'
import { Figtree, Marck_Script } from 'next/font/google'
import { AppShell } from '@/components/app-shell'
import { STORAGE_KEY } from '@/lib/constants'
import './globals.css'

const figtree = Figtree({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-figtree' })
const voice = Marck_Script({ subsets: ['latin'], weight: '400', variable: '--font-voice-face' })

export const metadata: Metadata = {
  title: 'Entrelinhas: metas no seu ritmo',
  description: 'Metas anuais, tarefas do dia e um diário, sem pressão.',
  applicationName: 'Entrelinhas',
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: 'Entrelinhas', statusBarStyle: 'default' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F1F8FB' },
    { media: '(prefers-color-scheme: dark)', color: '#07202D' },
  ],
}

/** Arquivos em /public/illustrations/{nome}.svg substituem a arte desenhada em código. */
function illustrationOverrides(): string[] {
  try {
    return fs
      .readdirSync(path.join(process.cwd(), 'public', 'illustrations'))
      .filter(file => file.endsWith('.svg'))
      .map(file => file.slice(0, -4))
  } catch {
    return []
  }
}

// Aplica o tema antes da primeira pintura, para não piscar.
const themeScript = `(function(){try{var s=JSON.parse(localStorage.getItem('${STORAGE_KEY}')||'{}');var t=(s.state&&s.state.settings&&s.state.settings.theme)||'system';if(t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${figtree.variable} ${voice.variable}`}>
        <AppShell overrides={illustrationOverrides()}>{children}</AppShell>
      </body>
    </html>
  )
}
