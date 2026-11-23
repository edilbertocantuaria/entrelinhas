'use client'

import { Unplug } from 'lucide-react'
import { EmptyState } from '@/components/common'
import { Button } from '@/components/ui/button'

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-full flex-col justify-center">
      <EmptyState
        illustration="error"
        icon={Unplug}
        title="Algo saiu do lugar"
        description="Seus dados continuam guardados. Tente abrir de novo."
        action={<Button onClick={reset}>Tentar de novo</Button>}
      />
    </div>
  )
}
