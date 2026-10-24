import React from 'react';
import { AppConfig } from '@/shared/types/config';
import { Switch } from '@/components/ui/switch';
import { Construction } from 'lucide-react';

interface CityTabContentProps {
  config: AppConfig;
  onUpdateConfig: (updater: (prev: AppConfig) => AppConfig) => void;
}

export function CityTabContent({ config, onUpdateConfig }: CityTabContentProps) {
  const isCityAreaEnabled = config.areaEnabled.city !== false;

  const handleToggleArea = (checked: boolean) => {
    onUpdateConfig((prev) => ({
      ...prev,
      areaEnabled: {
        ...prev.areaEnabled,
        city: checked,
      },
    }));
  };

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between rounded-md bg-purple-950/40 border border-purple-500/30 px-3 py-2 text-purple-300">
        <span className="font-semibold text-xs flex items-center gap-1.5">
          🏙️ Cho phép chạy Khu vực Thành Phố
        </span>
        <Switch checked={isCityAreaEnabled} onCheckedChange={handleToggleArea} />
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 p-6 text-center space-y-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Construction className="h-5 w-5" />
        </div>
        <div className="font-semibold text-xs text-slate-200">
          Khu Vực Thành Phố &amp; Hội Chợ Xóm Vui
        </div>
        <p className="text-[11px] text-slate-400 max-w-[260px] leading-relaxed">
          Tính năng tự động cho Khu vực Thành Phố &amp; Hội Chợ (Xe lam, Mini-game Câu Vịt) đang được phát triển và sẽ sớm ra mắt ở bản cập nhật tiếp theo!
        </p>
      </div>
    </div>
  );
}
