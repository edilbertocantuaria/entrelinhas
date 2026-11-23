import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/utils'

/** Uma ação primária por tela (variant "primary"). As demais usam outline ou ghost. */
export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-ctl font-medium whitespace-nowrap select-none transition-colors disabled:opacity-45 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary',
        outline: 'border-[0.5px] border-line bg-surface text-ink hover:bg-primary-soft',
        soft: 'bg-primary-soft text-ink',
        ghost: 'text-primary hover:bg-primary-soft',
        quiet: 'text-muted hover:bg-primary-soft hover:text-ink',
      },
      size: {
        default: 'h-12 px-5 text-[15px]',
        sm: 'h-11 px-3.5 text-[13px]',
        icon: 'size-11',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
)

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, block, type = 'button', ...props }: ButtonProps) {
  return <button type={type} data-slot="button" className={cn(buttonVariants({ variant, size, block }), className)} {...props} />
}
