'use client'

import { Compass } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/common'
import { buttonVariants } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col justify-center">
      <EmptyState
        illustration="not-found"
        icon={Compass}
        title="Esta página não existe"
        description="O caminho mudou ou o endereço está incompleto."
        action={
          <Link href="/" className={buttonVariants()}>
            Voltar para Hoje
          </Link>
        }
      />
    </div>
  )
}
