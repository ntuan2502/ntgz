import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown, Check } from 'lucide-react';
import { cn } from 'cn';

export interface MultiSelectOption {
  id: string;
  label: string;
  icon?: string;
}

interface MultiSelectComboboxProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelectCombobox({
  options,
  value,
  onChange,
  placeholder = 'Chọn độ hiếm giữ lại...',
  className,
}: MultiSelectComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  const toggleItem = (id: string) => {
    const next = value.includes(id)
      ? value.filter((v) => v !== id)
      : [...value, id];
    onChange(next);
  };

  const selectAll = () => {
    onChange(options.map((o) => o.id));
  };

  const clearAll = () => {
    onChange([]);
  };

  const selectedCount = value.length;
  const isAllSelected = selectedCount === options.length && options.length > 0;

  // Format trigger label
  const renderTriggerContent = () => {
    if (selectedCount === 0) {
      return <span className="text-slate-400 font-normal">{placeholder}</span>;
    }
    if (isAllSelected) {
      return (
        <span className="font-semibold text-amber-800">
          ⭐ Tất cả độ hiếm ({options.length})
        </span>
      );
    }
    const selectedOptions = options.filter((o) => value.includes(o.id));
    if (selectedOptions.length <= 2) {
      return (
        <span className="font-medium text-slate-800 truncate">
          {selectedOptions.map((o) => `${o.icon || ''} ${o.label}`).join(', ')}
        </span>
      );
    }
    const firstTwo = selectedOptions.slice(0, 2);
    const remaining = selectedOptions.length - 2;
    return (
      <span className="font-medium text-slate-800 truncate">
        {firstTwo.map((o) => `${o.icon || ''} ${o.label}`).join(', ')}{' '}
        <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
          +{remaining}
        </span>
      </span>
    );
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between w-full h-8 px-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-800 shadow-2xs cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        <div className="flex items-center gap-1 min-w-0 pr-1">
          {renderTriggerContent()}
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0 text-slate-500" />
      </button>

      {/* Floating Popover Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-[9999] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-100">
          {/* Header Quick Controls */}
          <div className="flex items-center justify-between pb-1.5 mb-1 px-1 border-b border-slate-100 text-[10px] text-slate-500">
            <span>Đã chọn: <strong className="text-amber-800">{selectedCount}/{options.length}</strong></span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px] text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                onClick={selectAll}
              >
                Chọn hết
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px] text-slate-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                onClick={clearAll}
              >
                Bỏ chọn
              </Button>
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto space-y-0.5">
            {options.map((opt) => {
              const isChecked = value.includes(opt.id);
              return (
                <div
                  key={opt.id}
                  onClick={() => toggleItem(opt.id)}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer transition-colors select-none ${
                    isChecked
                      ? 'bg-amber-50/90 text-amber-950 font-medium'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm shrink-0">{opt.icon}</span>
                    <span className="truncate">{opt.label}</span>
                  </div>
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded border transition-colors shrink-0 ${
                      isChecked
                        ? 'border-amber-500 bg-amber-500 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
