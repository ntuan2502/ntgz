import { stores, getMainState } from '../../core/engine-access';
import { dismissInterruptsIfNeeded } from '../../core/interrupts';
import { AppConfig, FarmstaySubAreaId } from '../../../shared/types/config';
import { StepResult, NOT_ACTED } from '../farm/types';
import { MainGameStoreState, FarmstayOrder, FarmstayVegPlot } from '../../../shared/types/game-store';

const FS_VEG_PRICES: Record<string, number> = {
  rauMuong: 5000,
  caChua: 10000,
  duaLeo: 8000,
  ot: 8000,
  duaHau: 20000,
};

const FS_VEG_NAMES: Record<string, string> = {
  rauMuong: 'Rau muống 🥬',
  caChua: 'Cà chua 🍅',
  duaLeo: 'Dưa leo 🥒',
  ot: 'Ớt cay 🌶️',
  duaHau: 'Dưa hấu 🍉',
};

const FS_STAFF_NAMES: Record<string, string> = {
  manager: 'Quản lý',
  gardener: 'Người làm vườn Con Tí',
  cook: 'Đầu bếp Chín Cơm',
  cleaner: 'Tạp vụ',
  guide: 'Hướng dẫn viên Anh Tài',
  guard: 'Bảo vệ Ông Bảy',
  media: 'Quay clip Linh Ròm',
};

function hasEnoughOrderItems(state: MainGameStoreState, order: FarmstayOrder): boolean {
  if (!order || !order.items) return false;
  const fs = state.farmstay;
  const pantry = fs?.veg?.pantry || {};
  const produce = state.produce || {};
  const eggs = state.eggs || 0;
  const milk = state.dairy?.milk || 0;

  for (const [key, qty] of Object.entries(order.items)) {
    const required = Number(qty) || 0;
    if (required <= 0) continue;

    if (key in FS_VEG_PRICES) {
      if ((pantry[key] || 0) < required) return false;
    } else if (key === 'egg') {
      if (eggs < required) return false;
    } else if (key === 'milk') {
      if (milk < required) return false;
    } else {
      if ((produce[key] || 0) < required) return false;
    }
  }
  return true;
}

export function handleFarmstayOperations(m: MainGameStoreState, cfg: AppConfig): StepResult {
  const fs = m.farmstay;
  if (!fs) return NOT_ACTED;
  const minGold = cfg.farmstayMinGoldKeep ?? 10000;

  // 1. Tự động xác nhận cẩm nang đón khách nếu chưa nhận
  if (cfg.farmstayAutoGuide && fs.guideDay !== m.day) {
    if (typeof m.acceptFarmstayGuide === 'function') {
      m.acceptFarmstayGuide();
      return { acted: true, msg: '📖 Đã tiếp nhận cẩm nang đón khách du lịch ngày mới' };
    }
  }

  // 2. Tự động mở cửa Farmstay nếu đủ điều kiện
  if (cfg.farmstayAutoOpen && !fs.open) {
    const hasGate = Boolean(fs.built && (fs.built.gate || 0) > 0);
    const hasManager = Boolean(fs.staff && fs.staff.manager);
    if (hasGate && hasManager && typeof m.setFarmstayOpen === 'function') {
      const res = m.setFarmstayOpen(true);
      if (res === 'ok') {
        return { acted: true, msg: '🏡 Đã mở cửa đón khách Farmstay Ông Năm' };
      }
    }
  }

  // 3. Tự động trả lương nhân viên nếu bị nợ lương
  if (cfg.farmstayAutoPayStaff && typeof m.farmstayDebt === 'function' && typeof m.payFarmstayStaff === 'function') {
    const debt = m.farmstayDebt();
    if (debt > 0 && (m.gold || 0) >= debt + minGold) {
      const ok = m.payFarmstayStaff();
      if (ok) {
        return { acted: true, msg: `💰 Đã trả lương nhân viên Farmstay (${debt.toLocaleString()} vàng)` };
      }
    }
  }

  return NOT_ACTED;
}

export function handleFarmstayRepairs(m: MainGameStoreState, cfg: AppConfig): StepResult {
  if (!cfg.farmstayAutoRepair) return NOT_ACTED;
  const fs = m.farmstay;
  if (!fs || !fs.broken || typeof m.repairFarmstay !== 'function') return NOT_ACTED;

  const minGold = cfg.farmstayMinGoldKeep ?? 10000;
  const entries = Object.entries(fs.broken);
  for (const [facilityId, info] of entries) {
    const cost = Number((info as { cost?: number })?.cost) || 0;
    if ((m.gold || 0) >= cost + minGold) {
      const res = m.repairFarmstay(facilityId);
      if (res === 'ok') {
        return { acted: true, msg: `🛠️ Sửa chữa đồ khách làm hư: ${facilityId} (-${cost.toLocaleString()} vàng)` };
      }
    }
  }

  return NOT_ACTED;
}

export function handleFarmstayGarden(m: MainGameStoreState, cfg: AppConfig): StepResult {
  if (!cfg.farmstayAutoVeg) return NOT_ACTED;
  const fs = m.farmstay;
  if (!fs || !fs.veg) return NOT_ACTED;
  const veg = fs.veg;
  const minGold = cfg.farmstayMinGoldKeep ?? 10000;
  const openCount = veg.open || 0;
  const plots = veg.plots || [];

  // 1. Tự động mua thêm luống rau mới nếu bật
  if (cfg.farmstayVegAutoBuyPlots && openCount < 24 && typeof m.buyVegPlot === 'function') {
    const plotCost = openCount < 4 ? 0 : Math.round(2000000 * Math.pow(1.15, openCount - 4) / 100000) * 100000;
    if ((m.gold || 0) >= plotCost + minGold) {
      const res = m.buyVegPlot();
      if (res === 'ok') {
        return { acted: true, msg: `🌱 Khai hoang mở thêm luống rau thứ ${openCount + 1}` };
      }
    }
  }

  // Tính thời gian hiện tại
  const curTime = (m.day || 0) * 24 * 60 + (m.minutes || 0);

  // 2. Thu hoạch rau chín
  if (cfg.farmstayVegAutoHarvest && typeof m.harvestVeg === 'function') {
    const hasRipe = plots.some(
      (p: FarmstayVegPlot | null, i: number) => i < openCount && p && typeof p.readyAt === 'number' && curTime >= p.readyAt
    );
    if (hasRipe) {
      const harvested = m.harvestVeg();
      if (harvested > 0) {
        return { acted: true, msg: `🧺 Thu hoạch ${harvested} luống rau chín vào kho bếp Farmstay` };
      }
    }
  }

  // 3. Tưới nước cho các luống rau khô
  if (cfg.farmstayVegAutoWater && typeof m.waterVeg === 'function') {
    const hasDry = plots.some(
      (p: FarmstayVegPlot | null, i: number) => i < openCount && p && p.readyAt === null
    );
    if (hasDry) {
      const watered = m.waterVeg();
      if (watered > 0) {
        return { acted: true, msg: `🚿 Đã tưới nước cho ${watered} luống rau hữu cơ` };
      }
    }
  }

  // 4. Bón phân hữu cơ
  if (cfg.farmstayVegAutoFeed && (m.items?.fertilizer || 0) > 0 && typeof m.feedVeg === 'function') {
    for (let i = 0; i < openCount; i++) {
      const p = plots[i];
      if (p && typeof p.readyAt === 'number' && !p.fed && curTime < p.readyAt) {
        const ok = m.feedVeg(i);
        if (ok) {
          return { acted: true, msg: `🧪 Bón phân hữu cơ cho luống rau #${i + 1}` };
        }
      }
    }
  }

  // 5. Gieo hạt giống vào luống trống
  if (cfg.farmstayVegAutoPlant) {
    const hasEmpty = plots.some((p: FarmstayVegPlot | null, i: number) => i < openCount && !p) || plots.length < openCount;
    if (hasEmpty) {
      let seed = cfg.farmstayVegPreferSeed;
      if (!seed || seed === 'auto' || !FS_VEG_PRICES[seed]) {
        // Tự động: ưu tiên cà chua hoặc dưa leo
        seed = 'caChua';
      }
      const seedPrice = FS_VEG_PRICES[seed] || 5000;
      if ((m.gold || 0) >= seedPrice + minGold) {
        if (typeof m.plantAllVeg === 'function') {
          const planted = m.plantAllVeg(seed);
          if (planted > 0) {
            return { acted: true, msg: `🌱 Gieo ${planted} luống hạt ${FS_VEG_NAMES[seed] || seed}` };
          }
        } else if (typeof m.plantVeg === 'function') {
          for (let i = 0; i < openCount; i++) {
            if (!plots[i]) {
              const res = m.plantVeg(i, seed);
              if (res === 'ok') {
                return { acted: true, msg: `🌱 Gieo luống #${i + 1} hạt ${FS_VEG_NAMES[seed] || seed}` };
              }
            }
          }
        }
      }
    }
  }

  return NOT_ACTED;
}

export function handleFarmstayStaff(m: MainGameStoreState, cfg: AppConfig): StepResult {
  const fs = m.farmstay;
  if (!fs || !fs.staff) return NOT_ACTED;

  // 1. Tự động trả lời sự kiện tâm sự nhân viên
  if (cfg.farmstayAutoAnswerStory && fs.story?.pending && typeof m.answerStory === 'function') {
    const res = m.answerStory(0);
    if (res && res.ok) {
      return { acted: true, msg: `📜 Đã giải quyết tâm tư nhân viên: ${res.reply || 'Xong'}` };
    }
  }

  // 2. Tự động trò chuyện tăng thân thiết (Bond)
  if (cfg.farmstayAutoChatStaff && typeof m.chatStaff === 'function') {
    const roles = ['manager', 'gardener', 'cook', 'cleaner', 'guide', 'guard', 'media'];
    for (const role of roles) {
      const s = fs.staff[role];
      if (s && s.chatDay !== m.day && (s.bond || 0) < 10) {
        try {
          const ok = m.chatStaff(role);
          if (ok) {
            const bondNow = (s.bond || 0) + 1;
            return {
              acted: true,
              msg: `💬 Trò chuyện với ${FS_STAFF_NAMES[role] || role} (Thân thiết: ${bondNow}/10 ⭐)`,
            };
          }
        } catch (e) {
          console.warn(`[Farmstay] chatStaff(${role}) failed:`, e);
        }
      }
    }
  }

  return NOT_ACTED;
}

export function handleFarmstayOrders(m: MainGameStoreState, cfg: AppConfig): StepResult {
  const fs = m.farmstay;
  if (!fs) return NOT_ACTED;

  // 1. Tự động nhận đoàn khách du lịch Chị Hồng
  if (cfg.farmstayAutoGroupBooking && fs.booking && !fs.booking.accepted && typeof m.answerGroup === 'function') {
    const reply = m.answerGroup(true);
    if (reply) {
      return { acted: true, msg: `🚌 Chốt nhận đoàn khách du lịch: ${fs.booking.who || 'Đoàn khách'} (${reply})` };
    }
  }

  // 2. Tự động phục vụ các đơn đặt món ăn
  if (cfg.farmstayAutoOrders && fs.orders && typeof m.serveFarmstayOrder === 'function') {
    for (const order of fs.orders) {
      if (!order.done && hasEnoughOrderItems(m, order)) {
        const res = m.serveFarmstayOrder(order.id);
        if (res && res.ok) {
          const tipStr = res.tip ? ` (+${res.tip.toLocaleString()} bo)` : '';
          return { acted: true, msg: `🍽️ Phục vụ món cho khách ${order.who || 'khách'}${tipStr}` };
        }
      }
    }
  }

  return NOT_ACTED;
}

const FARMTAY_SUBAREA_HANDLERS: Record<FarmstaySubAreaId, (m: MainGameStoreState, cfg: AppConfig) => StepResult> = {
  operation: handleFarmstayOperations,
  repairs: handleFarmstayRepairs,
  garden: handleFarmstayGarden,
  staff: handleFarmstayStaff,
  orders: handleFarmstayOrders,
};

/**
 * Kiểm tra xem Farmstay Ông Năm còn công việc nào đang chờ xử lý hay không.
 * Trả về false CHỈ KHI chắc chắn 100% đã hết mọi việc được bật trong cấu hình.
 * Nếu có lỗi hoặc không thể xác định chắc chắn, luôn mặc định trả về true (Defensive) để không đá người chơi ra.
 */
export function hasPendingFarmstayWork(m: MainGameStoreState, cfg: AppConfig): boolean {
  try {
    const fs = m.farmstay;
    if (!fs) return false;

    const curTime = (m.day || 0) * 24 * 60 + (m.minutes || 0);

    // 1. Cẩm nang đón khách du lịch ngày mới
    if (cfg.farmstayAutoGuide && fs.guideDay !== m.day) {
      return true;
    }

    // 2. Mở cửa Farmstay (nếu có cổng + có quản lý và đang đóng)
    if (cfg.farmstayAutoOpen && !fs.open) {
      const hasGate = Boolean(fs.built && (fs.built.gate || 0) > 0);
      const hasManager = Boolean(fs.staff && fs.staff.manager);
      if (hasGate && hasManager) return true;
    }

    // 3. Trả lương nhân viên (nếu có nợ lương)
    if (cfg.farmstayAutoPayStaff && typeof m.farmstayDebt === 'function') {
      try {
        const debt = m.farmstayDebt();
        const minGold = cfg.farmstayMinGoldKeep ?? 10000;
        if (debt > 0 && (m.gold || 0) >= debt + minGold) return true;
      } catch (e) {
        console.warn('[Farmstay] check debt error:', e);
      }
    }

    // 4. Sửa chữa tiện ích hỏng (broken)
    if (cfg.farmstayAutoRepair && fs.broken && Object.keys(fs.broken).length > 0) {
      return true;
    }

    // 5. Vườn rau hữu cơ (Veg garden)
    // Cấu trúc ground-truth từ play.formatted.js:44675:
    // plots: Array(24), mỗi phần tử là null hoặc { crop: string, readyAt: number | null, fed?: boolean }
    if (cfg.farmstayAutoVeg && fs.veg) {
      const openCount = fs.veg.open || 0;
      const plots = fs.veg.plots || [];

      // 5.1. Luống rau chín cần thu hoạch (readyAt !== null && curTime >= readyAt)
      if (cfg.farmstayVegAutoHarvest) {
        const hasRipe = plots.some(
          (p: FarmstayVegPlot | null, i: number) =>
            i < openCount && p && typeof p.readyAt === 'number' && curTime >= p.readyAt
        );
        if (hasRipe) return true;
      }

      // 5.2. Luống rau khô cần tưới nước (readyAt === null)
      if (cfg.farmstayVegAutoWater) {
        const hasDry = plots.some(
          (p: FarmstayVegPlot | null, i: number) =>
            i < openCount && p && p.readyAt === null
        );
        if (hasDry) return true;
      }

      // 5.3. Bón phân hữu cơ (readyAt !== null && !fed && curTime < readyAt)
      if (cfg.farmstayVegAutoFeed && (m.items?.fertilizer || 0) > 0) {
        for (let i = 0; i < openCount; i++) {
          const p = plots[i];
          if (p && typeof p.readyAt === 'number' && !p.fed && curTime < p.readyAt) {
            return true;
          }
        }
      }

      // 5.4. Gieo hạt vào luống trống (p === null && index < openCount && built.veggie)
      if (cfg.farmstayVegAutoPlant && fs.built?.veggie) {
        const hasEmpty = plots.some((p: FarmstayVegPlot | null, i: number) => i < openCount && !p) || plots.length < openCount;
        if (hasEmpty) {
          const minGold = cfg.farmstayMinGoldKeep ?? 10000;
          if ((m.gold || 0) >= 5000 + minGold) {
            return true;
          }
        }
      }
    }

    // 6. Nhân viên Farmstay (Staff - 7 vai trò)
    if (fs.staff) {
      if (cfg.farmstayAutoAnswerStory && fs.story?.pending) {
        return true;
      }

      if (cfg.farmstayAutoChatStaff) {
        const roles = ['manager', 'gardener', 'cook', 'cleaner', 'guide', 'guard', 'media'];
        for (const role of roles) {
          const s = fs.staff[role];
          if (s && s.chatDay !== m.day && (s.bond || 0) < 10) {
            return true;
          }
        }
      }
    }

    // 7. Đoàn khách Chị Hồng & Đơn món ăn
    if (cfg.farmstayAutoGroupBooking && fs.booking && !fs.booking.accepted) {
      return true;
    }

    if (cfg.farmstayAutoOrders && fs.orders) {
      for (const order of fs.orders) {
        if (!order.done && hasEnoughOrderItems(m, order)) {
          return true;
        }
      }
    }

    return false;
  } catch (err) {
    console.error('[Farmstay Error] hasPendingFarmstayWork failed:', err);
    return true; // Defensive: Luôn ở lại nếu gặp lỗi không mong muốn
  }
}

export const finishFarmstayCycle = async () => {
  const st = getMainState();
  if (st.screen !== 'farmstay') return;
  st.leaveFarmstay?.();
  await new Promise((r) => setTimeout(r, 100));
};

export function execFarmstayStep(cfg: AppConfig): StepResult {
  try {
    const mainStore = stores.main;
    if (!mainStore) return NOT_ACTED;
    const m = mainStore.getState();
    if (!m || !m.farmstay) return NOT_ACTED;

    // Acknowledge farmstay news if any
    if (m.farmstay.news && typeof m.ackFarmstayNews === 'function') {
      try {
        m.ackFarmstayNews();
      } catch (e) {
        console.warn('[Farmstay] ackFarmstayNews failed:', e);
      }
    }

    // Dismiss any dialogs/interrupts
    const interrupted = dismissInterruptsIfNeeded(cfg);
    if (interrupted) return interrupted;

    // Execute sub-areas in configured order
    const subOrder = cfg.farmstaySubOrder || ['operation', 'repairs', 'garden', 'staff', 'orders'];
    for (const subId of subOrder) {
      if (cfg.farmstaySubEnabled && cfg.farmstaySubEnabled[subId] === false) continue;
      const handler = FARMTAY_SUBAREA_HANDLERS[subId];
      if (handler) {
        try {
          const res = handler(m, cfg);
          if (res && res.acted) {
            return res;
          }
        } catch (subErr) {
          console.error(`[Farmstay SubArea Error] SubArea "${subId}" failed:`, subErr);
        }
      }
    }

    // VÔ HIỆU HÓA AUTO-LEAVE:
    // Tuyệt đối không tự động gọi leaveFarmstay() để tránh làm sập vòng lặp hoặc đá người chơi ra ngoài.
    // Việc chuyển scene chỉ diễn ra khi người chơi chuyển tab hoặc do scheduler cấp cao điều phối.

    return NOT_ACTED;
  } catch (err: unknown) {
    console.error('[Farmstay Error] execFarmstayStep failed:', err);
    return NOT_ACTED;
  }
}
