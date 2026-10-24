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
    <div className="space-y-2.5 text-xs font-sans text-slate-800">
      <div className="flex items-center justify-between rounded-xl bg-purple-50 border border-purple-200/80 px-3.5 py-2 text-purple-900 shadow-xs">
        <span className="font-semibold text-xs flex items-center gap-1.5">
          🏙️ Cho phép chạy Khu vực Thành Phố
        </span>
        <Switch checked={isCityAreaEnabled} onCheckedChange={handleToggleArea} />
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-6 text-center space-y-2.5 shadow-xs">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-200/80 shadow-xs">
          <Construction className="h-6 w-6" />
        </div>
        <div className="font-bold text-xs text-slate-900">
          Khu Vực Thành Phố &amp; Hội Chợ Xóm Vui
        </div>
        <p className="text-[11px] text-slate-500 max-w-[270px] leading-relaxed">
          Tính năng tự động cho Khu vực Thành Phố &amp; Hội Chợ (Xe lam, Mini-game Câu Vịt) đang được phát triển và sẽ sớm ra mắt ở bản cập nhật tiếp theo!
        </p>
      </div>
    </div>
  );
}
