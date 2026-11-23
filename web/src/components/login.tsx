'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { cap } from '@/shared/format'
import { useStore } from '@/shared/store'
import { Illustration } from './illustration'
import { Button } from './ui/button'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 8

type Mode = 'login' | 'signup'

/**
 * Entrada no app. Neste protótipo a conta vive só neste aparelho:
 * nada é enviado e a senha não é guardada. O modelo em prisma/schema.prisma
 * é o destino quando houver servidor.
 */
export function Login() {
  const signIn = useStore(state => state.signIn)
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({})

  const signup = mode === 'signup'

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    const cleanName = name.trim()
    const next: typeof errors = {}
    if (signup && !cleanName) next.name = 'Diga como podemos chamar você.'
    if (!EMAIL.test(cleanEmail)) next.email = 'Confira o e-mail, parece incompleto.'
    if (password.length < MIN_PASSWORD) next.password = `A senha precisa de pelo menos ${MIN_PASSWORD} caracteres.`
    setErrors(next)
    if (Object.keys(next).length) return
    signIn({ name: signup ? cleanName : cap(cleanEmail.split('@')[0].split(/[._-]/)[0]), email: cleanEmail })
  }

  const swap = () => {
    setMode(signup ? 'login' : 'signup')
    setErrors({})
  }

  return (
    <main className="scroller flex flex-col px-6 pt-8 pb-6">
      <div className="flex flex-col items-center text-center">
        <Illustration name="onboarding-journal" height={150} level="core" decorative className="w-full" />
        <h1 className="voice mt-4 text-[30px] leading-tight">Entrelinhas</h1>
        <p className="mt-1 text-[15px] text-muted">{signup ? 'Crie sua conta para começar.' : 'Entre para continuar de onde parou.'}</p>
      </div>

      <form className="mt-7 flex flex-col gap-4" onSubmit={submit} noValidate>
        {signup && (
          <div>
            <label htmlFor="login-nome" className="mb-1.5 block text-[13px] text-muted">
              Nome
            </label>
            <input
              id="login-nome"
              className="field"
              autoComplete="name"
              value={name}
              onChange={event => setName(event.target.value)}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'login-nome-erro' : undefined}
            />
            {errors.name && (
              <p id="login-nome-erro" role="alert" className="mt-1.5 text-[12px]">
                {errors.name}
              </p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-[13px] text-muted">
            E-mail
          </label>
          <input
            id="login-email"
            type="email"
            inputMode="email"
            className="field"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="voce@exemplo.com"
            value={email}
            onChange={event => setEmail(event.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'login-email-erro' : undefined}
          />
          {errors.email && (
            <p id="login-email-erro" role="alert" className="mt-1.5 text-[12px]">
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="login-senha" className="mb-1.5 block text-[13px] text-muted">
            Senha
          </label>
          <div className="relative">
            <input
              id="login-senha"
              type={visible ? 'text' : 'password'}
              className="field pr-12"
              autoComplete={signup ? 'new-password' : 'current-password'}
              value={password}
              onChange={event => setPassword(event.target.value)}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'login-senha-erro' : signup ? 'login-senha-dica' : undefined}
            />
            <button
              type="button"
              className="icon-btn absolute top-0.5 right-0.5"
              aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={visible}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={20} strokeWidth={1.75} /> : <Eye size={20} strokeWidth={1.75} />}
            </button>
          </div>
          {errors.password ? (
            <p id="login-senha-erro" role="alert" className="mt-1.5 text-[12px]">
              {errors.password}
            </p>
          ) : (
            signup && (
              <p id="login-senha-dica" className="mt-1.5 text-[12px] text-muted">
                Pelo menos {MIN_PASSWORD} caracteres.
              </p>
            )
          )}
        </div>

        <Button type="submit" block className="mt-1">
          {signup ? 'Criar conta' : 'Entrar'}
        </Button>
      </form>

      <p className="mt-2 flex items-center justify-center gap-1 text-[14px] text-muted">
        {signup ? 'Já tem conta?' : 'Ainda não tem conta?'}
        <button type="button" className="min-h-11 px-1 font-medium text-primary" onClick={swap}>
          {signup ? 'Entrar' : 'Criar conta'}
        </button>
      </p>

      <p className="mt-auto pt-6 text-center text-[12px] leading-relaxed text-muted">
        Protótipo: a conta fica só neste aparelho. Qualquer e-mail e senha válidos entram, e a senha não é guardada.
      </p>
    </main>
  )
}
