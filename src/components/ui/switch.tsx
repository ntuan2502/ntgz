import * as React from 'react';
import { cn } from '@/lib/utils';
import { Switch as SwitchPrimitive } from 'radix-ui';

function Switch({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: 'sm' | 'default';
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        'peer group/switch inline-flex shrink-0 items-center rounded-full border-2 transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer',
        'data-[size=default]:h-5 data-[size=default]:w-9 data-[size=sm]:h-4 data-[size=sm]:w-7',
        'data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-400 data-[state=checked]:shadow-[0_0_8px_rgba(16,185,129,0.35)]',
        'data-[state=unchecked]:bg-slate-700/80 data-[state=unchecked]:border-slate-600 dark:data-[state=unchecked]:bg-slate-800 dark:data-[state=unchecked]:border-slate-700',
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block rounded-full transition-transform',
          'group-data-[size=default]/switch:size-3.5 group-data-[size=sm]/switch:size-2.5',
          'data-[state=checked]:translate-x-4 data-[state=checked]:bg-white data-[state=checked]:shadow-md',
          'data-[state=unchecked]:translate-x-0.5 data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-slate-400'
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
