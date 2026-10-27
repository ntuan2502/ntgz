import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';

interface HudSubHeaderProps {
  title: string;
  version: string;
  onBack: () => void;
}

export function HudSubHeader({ title, version, onBack }: HudSubHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 bg-white border-b border-slate-200/90 shrink-0 select-none shadow-2xs">
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-7.5 px-2 -ml-1 cursor-pointer font-medium"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4 mr-1 text-slate-500" />
        Quay lại bảng điều khiển
      </Button>
      <div className="flex items-center gap-2">
        <span className="font-bold text-xs text-slate-700">{title}</span>
        <Badge variant="outline" className="text-[10px] font-mono text-slate-500 bg-slate-50">
          v{version}
        </Badge>
      </div>
    </div>
  );
}
