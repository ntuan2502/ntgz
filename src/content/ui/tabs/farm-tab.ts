import { AppConfig, FarmSubAreaId } from '../../../shared/types/config';
import { SUBAREA_META } from '../../../shared/constants/default-config';

export function getFarmSubCardBodyHtml(subId: FarmSubAreaId): string {
  switch (subId) {
    case 'house':
      return `
        <label class="opt-row">
          <span>💬 Tắt thông báo Điện thoại & Loa phường</span>
          <input type="checkbox" data-key="autoDismissInterrupts">
        </label>

        <label class="opt-row">
          <span>🍳 Tự nấu món ăn trong Bếp</span>
          <input type="checkbox" data-key="autoCook">
        </label>
        <div class="opt-sub" data-show-if="autoCook">
          <div class="opt-row">
            <span>Món ưu tiên nấu:</span>
            <select data-key="preferDish">
              <option value="auto">✨ Tự chọn món có sẵn nguyên liệu</option>
              <option value="comTam">🍛 Cơm tấm ốp la (No lâu)</option>
              <option value="eggBread">🥪 Bánh mì ốp la (Tốc độ)</option>
              <option value="radishSoup">🍲 Canh củ cải</option>
              <option value="carrotJuice">🧃 Nước ép cà rốt</option>
              <option value="grilledCorn">🌽 Bắp nướng mỡ hành</option>
              <option value="boiledEgg">🥚 Trứng luộc</option>
              <option value="cornCake">🥮 Bánh bắp nướng</option>
            </select>
          </div>
        </div>

        <label class="opt-row">
          <span>🍲 Tự ăn khi Đói</span>
          <input type="checkbox" data-key="autoRecoverHunger">
        </label>
        <div class="opt-sub" data-show-if="autoRecoverHunger">
          <div class="opt-row">
            <span>Hồi khi Đói &lt; (%):</span>
            <input type="number" data-key="hungerThreshold" min="10" max="90" step="5">
          </div>
          <div class="opt-row">
            <span>Nguồn thức ăn:</span>
            <select data-key="foodSource">
              <option value="kitchen_first">🍲 Ưu tiên món Bếp, thiếu mua Tiệm bánh</option>
              <option value="kitchen_only">🏡 Chỉ ăn món nấu trong Bếp / Kho</option>
              <option value="shop_only">🥖 Chỉ mua đồ ăn Tiệm bánh</option>
            </select>
          </div>
          <div class="opt-row">
            <span>Món mua ở Tiệm bánh:</span>
            <select data-key="preferFoodShop">
              <option value="banhMiThit">🥖 Bánh mì thịt (15.000đ · +50 no)</option>
              <option value="banhMiCha">🐟 Bánh mì chả cá (15.000đ · +45 no)</option>
              <option value="banhMiTrung">🍳 Bánh mì trứng (10.000đ · +35 no)</option>
              <option value="banhBao">🥟 Bánh bao (8.000đ · +25 no)</option>
              <option value="banhMiFull">🤤 Bánh mì full topping (25.000đ · +80 no)</option>
            </select>
          </div>
        </div>

        <label class="opt-row">
          <span>🥤 Tự uống khi Khát</span>
          <input type="checkbox" data-key="autoRecoverThirst">
        </label>
        <div class="opt-sub" data-show-if="autoRecoverThirst">
          <div class="opt-row">
            <span>Hồi khi Khát &lt; (%):</span>
            <input type="number" data-key="thirstThreshold" min="10" max="90" step="5">
          </div>
          <div class="opt-row">
            <span>Nguồn nước uống:</span>
            <select data-key="drinkSource">
              <option value="kitchen_first">🧃 Ưu tiên nước Bếp, thiếu mua Tiệm giải khát</option>
              <option value="shop_only">🥤 Chỉ mua nước tại Tiệm giải khát</option>
              <option value="both">✨ Linh hoạt cả Bếp & Tiệm</option>
            </select>
          </div>
          <div class="opt-row">
            <span>Loại nước ưu tiên ở Tiệm:</span>
            <select data-key="preferDrinkShop">
              <option value="nuocMia">🥤 Nước mía (8.000đ · +35 nước)</option>
              <option value="traDao">🍑 Trà đào cam sả (15.000đ · +50 nước)</option>
              <option value="traSua">🧋 Trà sữa trân châu (18.000đ · +40 nước)</option>
              <option value="caPheSua">☕ Cà phê sữa đá (12.000đ · +25 nước)</option>
              <option value="traDa">🧊 Trà đá vỉa hè (3.000đ · +20 nước)</option>
            </select>
          </div>
        </div>

        <label class="opt-row">
          <span>☕ Tự uống Cà phê sáng (+50% tốc độ chạy)</span>
          <input type="checkbox" data-key="autoMorningCoffee">
        </label>

        <label class="opt-row">
          <span>🔋 Tự sạc điện cho Xe máy điện EV</span>
          <input type="checkbox" data-key="autoChargeVehicle">
        </label>
        <div class="opt-sub" data-show-if="autoChargeVehicle">
          <div class="opt-row">
            <span>Sạc khi Pin xe &lt; (%):</span>
            <input type="number" data-key="batteryThreshold" min="10" max="90" step="5">
          </div>
        </div>

        <label class="opt-row">
          <span>💆 Chị Linh Salon: Gội đầu dưỡng sinh (Buff thư giãn)</span>
          <input type="checkbox" data-key="autoSalonShampoo">
        </label>

        <label class="opt-row">
          <span>✨ Chị Linh Salon: Tắm trắng nâng tông khi đen da</span>
          <input type="checkbox" data-key="autoSalonWhiten">
        </label>

        <label class="opt-row">
          <span>🛏️ Tự đi ngủ qua ngày mới</span>
          <input type="checkbox" data-key="autoSleep">
        </label>
        <div class="opt-sub" data-show-if="autoSleep">
          <div class="opt-row">
            <span>Giờ đi ngủ buổi tối (h):</span>
            <input type="number" data-key="sleepHour" min="18" max="23" step="1">
          </div>
          <label class="opt-row">
            <span>🌙 Ngủ ngay khi hết câu được buổi tối</span>
            <input type="checkbox" data-key="sleepOnFishingLimit">
          </label>
        </div>
      `;

    case 'crops':
      return `
        <label class="opt-row">
          <span>🌾 Tự thu hoạch nông sản chín</span>
          <input type="checkbox" data-key="autoHarvest">
        </label>
        <label class="opt-row">
          <span>🐛 Tự mua thuốc & diệt sâu bệnh</span>
          <input type="checkbox" data-key="autoPesticide">
        </label>
        <label class="opt-row">
          <span>💧 Tự tưới nước giữ ẩm</span>
          <input type="checkbox" data-key="autoWater">
        </label>
        <label class="opt-row">
          <span>🧪 Tự mua & bón phân NPK</span>
          <input type="checkbox" data-key="autoFertilize">
        </label>

        <label class="opt-row">
          <span>🌱 Tự mua & gieo hạt giống mới</span>
          <input type="checkbox" data-key="autoPlant">
        </label>
        <div class="opt-sub" data-show-if="autoPlant">
          <div class="opt-row">
            <span>Hạt giống ưu tiên:</span>
            <select data-key="preferSeed">
              <option value="auto">✨ Tự chọn tối ưu</option>
              <option value="rice">🌾 Lúa (8 ngày)</option>
              <option value="corn">🌽 Bắp (6 ngày)</option>
              <option value="carrot">🥕 Cà rốt (4 ngày)</option>
              <option value="radish">大根 Củ cải (2 ngày)</option>
            </select>
          </div>
        </div>

        <label class="opt-row">
          <span>⛏️ Tự mua thêm ô đất ruộng khi mở bán</span>
          <input type="checkbox" data-key="autoBuyPlots">
        </label>
      `;

    case 'pet':
      return `
        <label class="opt-row">
          <span>🍖 Tự mua đồ ăn & cho Thú cưng ăn</span>
          <input type="checkbox" data-key="petAutoFeed">
        </label>
        <label class="opt-row">
          <span>💖 Tự vuốt ve tăng vui vẻ</span>
          <input type="checkbox" data-key="petAutoCuddle">
        </label>
        <label class="opt-row">
          <span>🧼 Tự tắm sạch cho Thú cưng</span>
          <input type="checkbox" data-key="petAutoBath">
        </label>
        <label class="opt-row">
          <span>🎾 Tự tập trò huấn luyện (+XP)</span>
          <input type="checkbox" data-key="petAutoTrick">
        </label>
      `;

    case 'barn':
      return `
        <label class="opt-row">
          <span>🐃 Tự cho Trâu ăn cỏ / rơm</span>
          <input type="checkbox" data-key="barnAutoFeedBuffalo">
        </label>
        <label class="opt-row">
          <span>🚿 Tự tắm mát cho Trâu</span>
          <input type="checkbox" data-key="barnAutoBathBuffalo">
        </label>
        <label class="opt-row">
          <span>🤝 Tự cho hàng xóm thuê Trâu cày (tăng vui & tiền)</span>
          <input type="checkbox" data-key="barnAutoLendBuffalo">
        </label>
        <label class="opt-row">
          <span>🐄 Tự cho đàn Bò sữa ăn cỏ</span>
          <input type="checkbox" data-key="barnAutoFeedCows">
        </label>
        <label class="opt-row">
          <span>💊 Tự mua thuốc & chữa bệnh cho Bò</span>
          <input type="checkbox" data-key="barnAutoCureCows">
        </label>
        <label class="opt-row">
          <span>🥛 Tự vắt sữa & bán sữa bò</span>
          <input type="checkbox" data-key="barnAutoSellMilk">
        </label>
        <label class="opt-row">
          <span>💸 Tự trả lương người phụ Chuồng</span>
          <input type="checkbox" data-key="barnAutoPayHelper">
        </label>
      `;

    case 'coop':
      return `
        <label class="opt-row">
          <span>🥚 Tự nhặt trứng gà mỗi ngày</span>
          <input type="checkbox" data-key="coopAutoCollectEggs">
        </label>
        <label class="opt-row">
          <span>🐤 Tự mua thêm Gà con khi chuồng trống</span>
          <input type="checkbox" data-key="coopAutoBuyChick">
        </label>
        <label class="opt-row">
          <span>💸 Tự trả lương người phụ Chuồng gà</span>
          <input type="checkbox" data-key="coopAutoPayHelper">
        </label>
      `;

    case 'pond':
      return `
        <label class="opt-row">
          <span>🐟 Tự kéo lưới thu hoạch cá trưởng thành</span>
          <input type="checkbox" data-key="pondAutoNet">
        </label>
        <label class="opt-row">
          <span>🍞 Tự rải cám cho cá ăn mỗi ngày</span>
          <input type="checkbox" data-key="pondAutoFeed">
        </label>
        <label class="opt-row">
          <span>🐟 Tự thả cá giống mới khi ao trống</span>
          <input type="checkbox" data-key="pondAutoStock">
        </label>
        <div class="opt-sub" data-show-if="pondAutoStock">
          <div class="opt-row">
            <span>Loại cá giống thả:</span>
            <select data-key="preferPondFish">
              <option value="chep">🐟 Cá chép (Lời cao)</option>
              <option value="tre">🐟 Cá trê</option>
              <option value="ro">🐟 Cá rô</option>
            </select>
          </div>
        </div>
        <label class="opt-row">
          <span>💸 Tự trả lương người phụ Ao cá</span>
          <input type="checkbox" data-key="pondAutoPayHelper">
        </label>
      `;

    case 'market':
      return `
        <label class="opt-row">
          <span>📦 Tự giao đơn hàng Tạp hóa Chị Na</span>
          <input type="checkbox" data-key="autoDeliverOrder">
        </label>
        <label class="opt-row">
          <span>📋 Tự giao đơn Bảng tin làng</span>
          <input type="checkbox" data-key="autoVillageBoard">
        </label>
        <label class="opt-row">
          <span>🔥 Tự bán Nông sản Trend (x2 giá, bán đúng quota)</span>
          <input type="checkbox" data-key="autoSellTrend">
        </label>
        <label class="opt-row">
          <span>📜 Tự bán nông sản để hoàn thành Việc Sổ tay</span>
          <input type="checkbox" data-key="autoSellDailyTask">
        </label>
        <label class="opt-row">
          <span>🏪 Tự bán nông sản dư thừa trong kho</span>
          <input type="checkbox" data-key="autoSellProduce">
        </label>
        <div class="opt-sub" data-show-if="autoSellProduce">
          <div class="opt-row">
            <span>Số lượng nông sản tối thiểu giữ lại:</span>
            <input type="number" data-key="surplusKeepQty" min="5" max="200" step="5">
          </div>
        </div>

        <label class="opt-row">
          <span>🪙 Tự mua vàng đầu tư tại Cô Kim Tiệm Vàng</span>
          <input type="checkbox" data-key="goldAutoBuy">
        </label>
        <div class="opt-sub" data-show-if="goldAutoBuy">
          <div class="opt-row">
            <span>Loại vàng ưu tiên:</span>
            <select data-key="goldPreferType">
              <option value="mieng">🟨 Vàng miếng 9999 (Chênh thấp, giữ lâu)</option>
              <option value="nhan">💍 Nhẫn trơn 9999 (Ổn định nhất)</option>
              <option value="k18">📿 Vàng 18K (Trang sức)</option>
              <option value="non">🪙 Vàng non 10K (Lướt sóng)</option>
            </select>
          </div>
          <div class="opt-row">
            <span>Tiền mặt tối thiểu giữ lại:</span>
            <input type="number" data-key="goldKeepCash" min="100000" max="10000000" step="100000">
          </div>
        </div>

        <label class="opt-row">
          <span>📈 Tự bán vàng Cô Kim khi có lãi chốt lời</span>
          <input type="checkbox" data-key="goldAutoSell">
        </label>
        <div class="opt-sub" data-show-if="goldAutoSell">
          <div class="opt-row">
            <span>Chốt lời khi lãi đạt &gt;= (%):</span>
            <input type="number" data-key="goldProfitPercent" min="3" max="50" step="1">
          </div>
        </div>
      `;

    case 'dibay':
      return `
        <label class="opt-row">
          <span>🎁 Tự nhận thưởng Việc hôm nay & Sổ tay</span>
          <input type="checkbox" data-key="autoClaimQuests">
        </label>
        <label class="opt-row">
          <span>📜 Tự làm chuỗi hướng dẫn Ngày 1 & 2 (thắp nhang, rau mầm...)</span>
          <input type="checkbox" data-key="autoFirstDayTasks">
        </label>
        <label class="opt-row">
          <span>📔 Tự thu thập trang Sổ tay Ông Năm & ngâm giống Lúa</span>
          <input type="checkbox" data-key="autoNotebookPages">
        </label>
        <label class="opt-row">
          <span>🪙 Tự bỏ tiền vào Heo đất mỗi ngày</span>
          <input type="checkbox" data-key="autoFeedPiggy">
        </label>
        <label class="opt-row">
          <span>🔨 Tự đập Heo đất khi no (đủ 7 ngày streak)</span>
          <input type="checkbox" data-key="autoBreakPiggy">
        </label>
        <label class="opt-row">
          <span>🛒 Tự mua Heo đất mới khi chuồng trống</span>
          <input type="checkbox" data-key="autoNewPiggy">
        </label>
        <label class="opt-row">
          <span>🏦 Tự gửi Sổ tiết kiệm Dì Bảy</span>
          <input type="checkbox" data-key="autoSavings">
        </label>
        <div class="opt-sub" data-show-if="autoSavings">
          <div class="opt-row">
            <span>Giữ lại tiền mặt tối thiểu:</span>
            <input type="number" data-key="savingsKeepGold" min="50000" max="5000000" step="50000">
          </div>
        </div>
      `;

    default:
      return '';
  }
}

let dragSubId: FarmSubAreaId | null = null;

export function buildFarmSubCards(
  container: HTMLElement,
  config: AppConfig,
  saveConfig: () => void,
  bindDataKeyInputs: (parent: HTMLElement) => void
): void {
  container.innerHTML = '';

  config.farmSubOrder.forEach((subId, index) => {
    const meta = SUBAREA_META[subId];
    if (!meta) return;

    const enabled = config.farmSubEnabled[subId] !== false;
    const collapsed = Boolean(config.farmSubCollapsed[subId]);

    const card = document.createElement('div');
    card.className = `sub-card${!enabled ? ' disabled-card' : ''}${collapsed ? ' collapsed' : ''}`;
    card.dataset.subId = subId;
    card.draggable = true;

    card.innerHTML = `
      <div class="sub-card-head">
        <div class="sub-card-head-left">
          <span class="drag-handle" title="Kéo thả để đổi thứ tự">⠿</span>
          <span class="order-idx">#${index + 1}</span>
          <span>${meta.icon} ${meta.name}</span>
        </div>
        <div class="sub-card-head-right">
          <button type="button" class="mini-move-btn" data-move="up" title="Đưa lên trên">▲</button>
          <button type="button" class="mini-move-btn" data-move="down" title="Đưa xuống dưới">▼</button>
          <input type="checkbox" class="sub-enable-chk" ${enabled ? 'checked' : ''} title="Bật / Tắt khu vực con này">
        </div>
      </div>
      <div class="sub-card-body">
        ${getFarmSubCardBodyHtml(subId)}
      </div>
    `;

    const head = card.querySelector('.sub-card-head') as HTMLElement;
    head.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('input')) return;
      config.farmSubCollapsed[subId] = !config.farmSubCollapsed[subId];
      saveConfig();
    });

    const chk = card.querySelector('.sub-enable-chk') as HTMLInputElement;
    chk.addEventListener('change', () => {
      config.farmSubEnabled[subId] = chk.checked;
      if (chk.checked) config.farmSubCollapsed[subId] = false;
      saveConfig();
    });

    card.querySelectorAll('.mini-move-btn').forEach((btnEl) => {
      const btn = btnEl as HTMLButtonElement;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dir = btn.dataset.move;
        const idx = config.farmSubOrder.indexOf(subId);
        if (idx < 0) return;
        const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= config.farmSubOrder.length) return;
        const arr = [...config.farmSubOrder];
        const temp = arr[idx];
        arr[idx] = arr[targetIdx];
        arr[targetIdx] = temp;
        config.farmSubOrder = arr;
        buildFarmSubCards(container, config, saveConfig, bindDataKeyInputs);
        saveConfig();
      });
    });

    card.addEventListener('dragstart', (e) => {
      dragSubId = subId;
      card.classList.add('dragging');
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      dragSubId = null;
      card.classList.remove('dragging');
    });
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    });
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!dragSubId || dragSubId === subId) return;
      const arr = [...config.farmSubOrder];
      const fromIdx = arr.indexOf(dragSubId);
      const toIdx = arr.indexOf(subId);
      if (fromIdx < 0 || toIdx < 0) return;
      arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, dragSubId);
      config.farmSubOrder = arr;
      buildFarmSubCards(container, config, saveConfig, bindDataKeyInputs);
      saveConfig();
    });

    container.appendChild(card);
  });

  bindDataKeyInputs(container);
}
