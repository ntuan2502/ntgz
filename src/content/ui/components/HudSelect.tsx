import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from 'cn';

export interface HudSelectOption {
  value: string;
  label: string;
}

interface HudSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: HudSelectOption[];
  placeholder?: string;
  className?: string;
}

export function HudSelect({
  value,
  onValueChange,
  options,
  placeholder,
  className,
}: HudSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        size="sm"
        className={cn(
          'flex-1 w-full min-w-0 h-8 min-h-8 px-2.5 py-1 text-xs rounded-lg bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800 shadow-none overflow-hidden focus-visible:ring-1 focus-visible:ring-emerald-500 focus-visible:border-emerald-500',
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        position="popper"
        align="end"
        sideOffset={4}
        className="z-[2147483647] w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] max-w-[min(650px,calc(100vw-24px))] max-h-[280px] rounded-xl border border-slate-200 bg-white text-slate-800 shadow-xl"
      >
        {options.map((opt) => (
          <SelectItem
            key={opt.value}
            value={opt.value}
            className="text-xs py-1.5 pr-7 pl-2 rounded-lg cursor-pointer text-slate-700 focus:bg-emerald-50 focus:text-emerald-800 data-[state=checked]:font-medium data-[state=checked]:text-emerald-700"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
