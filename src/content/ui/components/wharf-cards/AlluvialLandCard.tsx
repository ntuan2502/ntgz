import React from 'react';
import { AppConfig } from '@/shared/types/config';
import { BAI_CROPS_META } from '@/shared/constants/default-config';
import { Switch } from '@/components/ui/switch';
import { HudSelect } from '../HudSelect';

interface AlluvialLandCardProps {
  config: AppConfig;
  updateField: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => void;
  onUpdateConfig: (updater: (prev: AppConfig) => AppConfig) => void;
}

export function AlluvialLandCard({ config, updateField, onUpdateConfig }: AlluvialLandCardProps) {
  const cropOptions = BAI_CROPS_META.map((c) => ({
    value: c.id,
    label: `${c.name} (${c.minutes}p · ${c.pearl ? `${c.pearlSeed}🦪` : `${c.seed}🐚`} · Thu ${c.yield} ${c.unit})`,
  }));

  const isCocoProcessOn =
    config.benAutoCocoProcess !== undefined
      ? Boolean(config.benAutoCocoProcess)
      : config.benAutoCandy !== false || Boolean(config.benAutoCocoSell);

  const cocoMode: 'candy' | 'sell' =
    config.benCocoMode ?? (config.benAutoCocoSell && config.benAutoCandy === false ? 'sell' : 'candy');

  const handleToggleCocoParent = (checked: boolean) => {
    onUpdateConfig((prev) => {
      const currentMode: 'candy' | 'sell' = prev.benCocoMode ?? 'candy';
      return {
        ...prev,
        benAutoCocoProcess: checked,
        benCocoMode: currentMode,
        benAutoCandy: checked && currentMode === 'candy',
        benAutoCocoSell: checked && currentMode === 'sell',
      };
    });
  };

  const handleSelectCocoMode = (nextMode: 'candy' | 'sell') => {
    onUpdateConfig((prev) => ({
      ...prev,
      benAutoCocoProcess: true,
      benCocoMode: nextMode,
      benAutoCandy: nextMode === 'candy',
      benAutoCocoSell: nextMode === 'sell',
    }));
  };

  return (
    <div className="space-y-3 text-xs">
      <p className="text-[11px] text-slate-500 italic">
        🌾 Vận hành trọn gói hệ sinh thái Chợ Bãi &amp; Đất Của Mình: Luống rau, Lò kẹo dừa, Sân phơi khô cá, Chuồng gà vịt và Lưới cá sông.
      </p>

      {/* Mục 1: Đi đò & Đất bãi */}
      <div className="space-y-2">
        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <div>
            <span className="font-medium text-slate-800">⛵ Tự đi đò qua chăm sóc đất bãi khi có việc</span>
            <p className="text-[10px] text-slate-400">
              Chỉ qua sông khi rau chín, đất trống, kẹo xong, dừa/cá chín; xong việc lập tức về Bến Đò câu cá tiếp.
            </p>
          </div>
          <Switch
            size="sm"
            checked={Boolean(config.benAutoBaiFerry ?? true)}
            onCheckedChange={(c) => updateField('benAutoBaiFerry', c)}
          />
        </label>

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <div>
            <span className="font-medium">📜 Tự mua giấy tay đất bãi (100.000 🐚)</span>
            <p className="text-[10px] text-slate-400">
              Tự động mua một mảnh đất bãi của Ông Tám khi ví có đủ 100k vỏ sò nếu chưa có đất.
            </p>
          </div>
          <Switch
            size="sm"
            checked={Boolean(config.benAutoBuyLand ?? true)}
            onCheckedChange={(c) => updateField('benAutoBuyLand', c)}
          />
        </label>
      </div>

      {/* Mục 2: Luống rau bãi phù sa */}
      <div className="border-t border-slate-200/80 pt-2 space-y-2">
        <span className="font-semibold text-emerald-800 block text-[11px]">🌱 Luống Rau &amp; Canh Tác Phù Sa</span>

        {/* Switch Cha: Tự động canh tác rau màu bãi */}
        <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/40 p-2.5 space-y-2">
          <label className="flex items-center justify-between text-slate-800 cursor-pointer">
            <div>
              <span className="font-semibold text-emerald-900">🧺 Tự động canh tác rau màu bãi phù sa</span>
              <p className="text-[10px] text-slate-500">
                Thao tác từ xa trên toàn bộ luống rau (thu hoạch, gieo trồng, tưới nước, bón phân, bắt sâu).
              </p>
            </div>
            <Switch
              size="sm"
              checked={Boolean(config.benAutoBaiCrops ?? true)}
              onCheckedChange={(c) => updateField('benAutoBaiCrops', c)}
            />
          </label>

          {config.benAutoBaiCrops !== false && (
            <div className="pt-2 border-t border-emerald-200/60 space-y-2 pl-1">
              <span className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider block">
                Tùy chọn từng công việc trên luống rau:
              </span>

              <div className="grid grid-cols-1 gap-1.5 bg-white/90 p-2 rounded-lg border border-emerald-200/70">
                <label className="flex items-center justify-between text-slate-700 cursor-pointer py-0.5">
                  <span className="text-[11px]">🧺 Tự thu hoạch rau chín (thu Bí Ngô Con 🎃)</span>
                  <Switch
                    size="sm"
                    checked={Boolean(config.benAutoBaiHarvest ?? true)}
                    onCheckedChange={(c) => updateField('benAutoBaiHarvest', c)}
                  />
                </label>

                <label className="flex items-center justify-between text-slate-700 cursor-pointer py-0.5">
                  <span className="text-[11px]">🌱 Tự gieo hạt giống vào luống trống</span>
                  <Switch
                    size="sm"
                    checked={Boolean(config.benAutoBaiPlant ?? true)}
                    onCheckedChange={(c) => updateField('benAutoBaiPlant', c)}
                  />
                </label>

                <label className="flex items-center justify-between text-slate-700 cursor-pointer py-0.5">
                  <span className="text-[11px]">💧 Tự tưới nước cho các luống rau bị khô</span>
                  <Switch
                    size="sm"
                    checked={Boolean(config.benAutoBaiWater ?? true)}
                    onCheckedChange={(c) => updateField('benAutoBaiWater', c)}
                  />
                </label>

                <label className="flex items-center justify-between text-slate-700 cursor-pointer py-0.5">
                  <span className="text-[11px]">🌿 Tự bón phân (bón lót / phân hữu cơ)</span>
                  <Switch
                    size="sm"
                    checked={Boolean(config.benAutoBaiFertilize ?? true)}
                    onCheckedChange={(c) => updateField('benAutoBaiFertilize', c)}
                  />
                </label>

                <label className="flex items-center justify-between text-slate-700 cursor-pointer py-0.5">
                  <span className="text-[11px]">🐛 Tự bắt sâu / phun thuốc sâu khi có sâu</span>
                  <Switch
                    size="sm"
                    checked={Boolean(config.benAutoBaiSpray ?? true)}
                    onCheckedChange={(c) => updateField('benAutoBaiSpray', c)}
                  />
                </label>
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-slate-700 font-medium">Hạt giống ưu tiên gieo trồng (Cô Sáu):</span>
                <HudSelect
                  value={config.benBaiPreferCrop || 'rauMuong'}
                  onValueChange={(val) => updateField('benBaiPreferCrop', val)}
                  options={cropOptions}
                />
              </div>

              <label className="flex items-center justify-between text-slate-700 cursor-pointer pt-1">
                <div>
                  <span className="font-medium">🛶 Tự bán rau tươi cho Ghe Lái Tư</span>
                  <p className="text-[10px] text-slate-400">
                    Bán toàn bộ rau củ thu hoạch cho thương lái ở Chợ Bãi lấy vỏ sò.
                  </p>
                </div>
                <Switch
                  size="sm"
                  checked={Boolean(config.benAutoBaiSellCrops ?? true)}
                  onCheckedChange={(c) => updateField('benAutoBaiSellCrops', c)}
                />
              </label>
            </div>
          )}
        </div>

        <label className="flex items-center justify-between text-slate-700 cursor-pointer pt-1">
          <div>
            <span className="font-medium">🥥 Tự hái dừa xiêm &amp; trồng dừa con</span>
            <p className="text-[10px] text-slate-400">
              Hái dừa xiêm ngọt lịm khi chín &amp; tự mua cây dừa con trồng vào mé sông còn trống.
            </p>
          </div>
          <Switch
            size="sm"
            checked={Boolean(config.benAutoCocoPick ?? true)}
            onCheckedChange={(c) => updateField('benAutoCocoPick', c)}
          />
        </label>
      </div>

      {/* Mục 3: Chuỗi Chế Biến Đặc Sản & Xử lý Dừa */}
      <div className="border-t border-slate-200/80 pt-2 space-y-2">
        <span className="font-semibold text-amber-800 block text-[11px]">🍬 Xử Lý Dừa Xiêm &amp; Chế Biến Đặc Sản</span>

        {/* Switch Cha: Xử lý dừa xiêm (Làm kẹo vs Bán dừa) */}
        <div className="rounded-lg border border-amber-200/80 bg-amber-50/40 p-2.5 space-y-2">
          <label className="flex items-center justify-between text-slate-800 cursor-pointer">
            <div>
              <span className="font-semibold text-amber-900">🥥 Tự động xử lý dừa xiêm sau thu hoạch</span>
              <p className="text-[10px] text-slate-500">
                Bật/Tắt thao tác xử lý dừa (chuyển đổi giữa Làm kẹo dừa hoặc Bán dừa tươi).
              </p>
            </div>
            <Switch
              size="sm"
              checked={isCocoProcessOn}
              onCheckedChange={handleToggleCocoParent}
            />
          </label>

          {isCocoProcessOn && (
            <div className="pt-1.5 border-t border-amber-200/60 space-y-2">
              <div className="grid grid-cols-2 gap-1.5 bg-white/90 p-1 rounded-lg border border-amber-200/80">
                <button
                  type="button"
                  onClick={() => handleSelectCocoMode('candy')}
                  className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    cocoMode === 'candy'
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-amber-50'
                  }`}
                >
                  <span>🍬</span>
                  <span>Làm kẹo dừa</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectCocoMode('sell')}
                  className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    cocoMode === 'sell'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-emerald-50'
                  }`}
                >
                  <span>🥥</span>
                  <span>Bán dừa tươi</span>
                </button>
              </div>

              {cocoMode === 'candy' ? (
                <div className="space-y-1.5 pl-1">
                  <p className="text-[10px] text-amber-800">
                    🔥 Tự nhóm lửa nấu dừa + đường mía (2h/mẻ) khi lò trống và thu hoạch kẹo dừa khi ra lò.
                  </p>
                  <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                    <span className="text-[11px] font-medium">🛒 Tự mua đường mía khi thiếu để nấu kẹo</span>
                    <Switch
                      size="sm"
                      checked={Boolean(config.benAutoBuySugar ?? true)}
                      onCheckedChange={(c) => updateField('benAutoBuySugar', c)}
                    />
                  </label>
                </div>
              ) : (
                <p className="text-[10px] text-emerald-800 pl-1">
                  💰 Tự động đem toàn bộ dừa tươi thu hoạch ra Chợ Bãi bán trực tiếp cho Chú Bảy Dừa lấy vỏ sò (không nấu kẹo).
                </p>
              )}
            </div>
          )}
        </div>

        {/* Khối Sân Phơi Khô Cá & Bộ Sưu Tập */}
        <div className="rounded-lg border border-sky-200/80 bg-sky-50/40 p-2.5 space-y-2">
          <span className="font-semibold text-sky-900 block text-[11px]">🐟 Sân Phơi Khô Cá &amp; Sổ Khô Cá</span>

          {/* Phơi cá lên nong */}
          <label className="flex items-center justify-between text-slate-700 cursor-pointer">
            <div>
              <span className="font-medium text-slate-800">☀️ Tự phơi cá lên nong (Ưu tiên con đắt nhất)</span>
              <p className="text-[10px] text-slate-400">
                Xếp cá câu được ở Bến Đò lên nong tre (khô cá bán gấp đôi giá cá tươi hoặc cất lấy danh tiếng).
              </p>
            </div>
            <Switch
              size="sm"
              checked={Boolean(config.benAutoDryFish ?? true)}
              onCheckedChange={(c) => updateField('benAutoDryFish', c)}
            />
          </label>
          {config.benAutoDryFish !== false && (
            <div className="ml-2 pl-2.5 border-l-2 border-sky-200 space-y-1 text-[11px]">
              <label className="flex items-center justify-between text-slate-600 cursor-pointer">
                <span>🔓 Cho phép tự mở khoá cá đang giữ để phơi con đắt nhất</span>
                <Switch
                  size="sm"
                  checked={Boolean(config.benDryIncludeKept ?? true)}
                  onCheckedChange={(c) => updateField('benDryIncludeKept', c)}
                />
              </label>
            </div>
          )}

          {/* Thu hoạch cá khô */}
          <label className="flex items-center justify-between text-slate-700 cursor-pointer">
            <div>
              <span className="font-medium text-slate-800">🧺 Tự thu hoạch cá đã phơi khô</span>
              <p className="text-[10px] text-slate-400">
                Thu khô cá từ các nong đã phơi đủ thời gian cất vào kho để chuẩn bị cất sổ hoặc bán.
              </p>
            </div>
            <Switch
              size="sm"
              checked={Boolean(config.benAutoDryCollect ?? true)}
              onCheckedChange={(c) => updateField('benAutoDryCollect', c)}
            />
          </label>

          {/* Cất vào sổ bộ sưu tập */}
          <label className="flex items-center justify-between text-slate-700 cursor-pointer">
            <div>
              <span className="font-medium text-slate-800">📜 Tự cất khô cá vào Sổ bộ sưu tập (+⭐ Nổi tiếng)</span>
              <p className="text-[10px] text-slate-400">
                Ưu tiên cất khô cá loài mới hoặc có kích thước lớn hơn vào Sổ Khô Cá DryDex leo bảng vàng.
              </p>
            </div>
            <Switch
              size="sm"
              checked={Boolean(config.benAutoDryDexPut ?? true)}
              onCheckedChange={(c) => updateField('benAutoDryDexPut', c)}
            />
          </label>
        </div>

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <div>
            <span className="font-medium">🏪 Tự bán kẹo dừa &amp; khô cá cho Cô Hai</span>
            <p className="text-[10px] text-slate-400">
              Ghé Tiệm đặc sản Cô Hai ở Chợ Bãi bán thanh kẹo dừa và khô cá thừa lấy vỏ sò.
            </p>
          </div>
          <Switch
            size="sm"
            checked={Boolean(config.benAutoCandySell ?? true)}
            onCheckedChange={(c) => updateField('benAutoCandySell', c)}
          />
        </label>
      </div>

      {/* Mục 4: Chăn Nuôi & Thủy Sản Bãi Bồi */}
      <div className="border-t border-slate-200/80 pt-2 space-y-2">
        <span className="font-semibold text-blue-800 block text-[11px]">🐔 Chăn Nuôi Gia Cầm &amp; Lưới Quây Cá Sông</span>

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <div>
            <span className="font-medium">🥚 Tự nhặt trứng gà, trứng vịt trong ổ rơm</span>
            <p className="text-[10px] text-slate-400">
              Tự gom trứng gà vịt trong chuồng tránh để đầy ổ gà vịt ngừng đẻ.
            </p>
          </div>
          <Switch
            size="sm"
            checked={Boolean(config.benAutoCoop ?? true)}
            onCheckedChange={(c) => updateField('benAutoCoop', c)}
          />
        </label>

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <div>
            <span className="font-medium">💊 Tự mua thuốc &amp; chữa bệnh cho gà vịt</span>
            <p className="text-[10px] text-slate-400">
              Phát hiện gia cầm bị ủ rũ, tự mua thuốc thú y Bà Bảy cho uống tránh chết gia cầm.
            </p>
          </div>
          <Switch
            size="sm"
            checked={Boolean(config.benAutoCureBirds ?? true)}
            onCheckedChange={(c) => updateField('benAutoCureBirds', c)}
          />
        </label>

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <div>
            <span className="font-medium">🥚 Tự bán trứng gia cầm cho Chú Năm</span>
            <p className="text-[10px] text-slate-400">
              Ghé sạp Chú Năm ở Chợ Bãi bán trứng gà và trứng vịt lấy vỏ sò.
            </p>
          </div>
          <Switch
            size="sm"
            checked={Boolean(config.benAutoEggSell ?? true)}
            onCheckedChange={(c) => updateField('benAutoEggSell', c)}
          />
        </label>

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <div>
            <span className="font-medium">🎣 Tự kéo lưới thu hoạch cá sông trưởng thành</span>
            <p className="text-[10px] text-slate-400">
              Tự kéo lưới quây mé sông thu hoạch cá lớn đem vào kho.
            </p>
          </div>
          <Switch
            size="sm"
            checked={Boolean(config.benAutoNet ?? true)}
            onCheckedChange={(c) => updateField('benAutoNet', c)}
          />
        </label>

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <div>
            <span className="font-medium">🌾 Tự mua cám &amp; rải cám nuôi cá sông</span>
            <p className="text-[10px] text-slate-400">
              Tự mua bao cám từ ghe Anh Mười rải cho cá ăn khi đói giúp cá lớn nhanh.
            </p>
          </div>
          <Switch
            size="sm"
            checked={Boolean(config.benAutoFeedNet ?? true)}
            onCheckedChange={(c) => updateField('benAutoFeedNet', c)}
          />
        </label>

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <div>
            <span className="font-medium">🐟 Tự bán cá nuôi cho Ghe Anh Mười</span>
            <p className="text-[10px] text-slate-400">
              Bán cá kéo lưới cho ghe Anh Mười ở Chợ Bãi thu vỏ sò.
            </p>
          </div>
          <Switch
            size="sm"
            checked={Boolean(config.benAutoNetSell ?? true)}
            onCheckedChange={(c) => updateField('benAutoNetSell', c)}
          />
        </label>
      </div>

      {/* Mục 5: Bãi Bùn Phù Sa & Sạp Bốc Thăm Thím Hên */}
      <div className="border-t border-slate-200/80 pt-2 space-y-2">
        <span className="font-semibold text-amber-800 block text-[11px]">🌊 Bãi Bùn Phù Sa &amp; Sạp Thím Hên</span>

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <div>
            <span className="font-medium text-slate-800">🫳 Mò ốc &amp; bắt cua bãi bùn khi nước ròng</span>
            <p className="text-[10px] text-slate-400">
              Lội bãi bùn cào bắt ốc bươu, sò huyết, cua bùn khi con nước rút cạn (tốn 2 thể lực/ổ).
            </p>
          </div>
          <Switch
            size="sm"
            checked={Boolean(config.benAutoMudDig ?? true)}
            onCheckedChange={(c) => updateField('benAutoMudDig', c)}
          />
        </label>

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <div>
            <span className="font-medium text-slate-800">🎋 Bốc thăm may mắn tại Sạp Thím Hên</span>
            <p className="text-[10px] text-slate-400">
              Tự mang que thăm HTX đến Sạp Thím Hên ở Chợ Bãi để lắc ống thăm nhận quà xịn.
            </p>
          </div>
          <Switch
            size="sm"
            checked={Boolean(config.benAutoLuckDraw ?? true)}
            onCheckedChange={(c) => updateField('benAutoLuckDraw', c)}
          />
        </label>

        {config.benAutoLuckDraw !== false && (
          <div className="ml-2 pl-2.5 border-l-2 border-amber-200 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-slate-600 shrink-0">Ưu tiên ống thăm:</span>
              <HudSelect
                value={config.benLuckDrawPool || 'back'}
                onValueChange={(val) => updateField('benLuckDrawPool', val as AppConfig['benLuckDrawPool'])}
                options={[
                  { value: 'back', label: '🪽 Ống đồ đeo lưng (Ba lô/Cánh/Áo)' },
                  { value: 'pet', label: '🐾 Ống thú cưng đồng hành' },
                ]}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
