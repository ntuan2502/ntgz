import { GameSnapshot } from '@/shared/types/game-state';
import fishDexRaw from '@/shared/constants/fish-dex-data.json';

const fishNameMap = new Map<string, string>(
  (fishDexRaw as Array<{ id: string; name: string }>).map((f) => [f.id, f.name])
);

export type ItemCategory = 'crops' | 'dishes' | 'seeds' | 'supplies' | 'farmstay' | 'marine';

export interface InventoryEntry {
  id: string;
  name: string;
  category: ItemCategory;
  count: number;
  unitPrice: number;
  totalValue: number;
  icon: string;
  desc?: string;
}

export function formatVnd(amount: number): string {
  return (amount || 0).toLocaleString('vi-VN');
}

export function formatCompactVnd(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)} Tỷ`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)} Triệu`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(0)}K`;
  }
  return String(num || 0);
}

export const CATEGORY_LABELS: Record<ItemCategory, { label: string; icon: string }> = {
  crops: { label: 'Nông sản & Trại', icon: '🌾' },
  dishes: { label: 'Món ăn Bếp', icon: '🍲' },
  seeds: { label: 'Hạt giống', icon: '🌱' },
  supplies: { label: 'Vật tư Nông nghiệp', icon: '🧪' },
  farmstay: { label: 'Rau củ Farmstay', icon: '🏡' },
  marine: { label: 'Thủy hải sản', icon: '🐟' },
};

export const CROP_CONFIG: Record<string, { name: string; icon: string; defaultPrice: number; desc: string }> = {
  radish: { name: 'Củ cải trắng', icon: '🌱', defaultPrice: 12_000, desc: 'Vụ 4 ngày' },
  carrot: { name: 'Cà rốt', icon: '🥕', defaultPrice: 28_000, desc: 'Vụ 4 ngày' },
  corn: { name: 'Bắp ngô vàng', icon: '🌽', defaultPrice: 50_000, desc: 'Vụ 6 ngày' },
  rice: { name: 'Lúa thơm', icon: '🌾', defaultPrice: 90_000, desc: 'Vụ 8 ngày' },
};

export const SEED_CONFIG: Record<string, { name: string; icon: string; price: number }> = {
  radish: { name: 'Hạt giống Củ cải', icon: '🌱', price: 20_000 },
  carrot: { name: 'Hạt giống Cà rốt', icon: '🥕', price: 35_000 },
  corn: { name: 'Hạt giống Bắp', icon: '🌽', price: 60_000 },
  rice: { name: 'Hạt giống Lúa', icon: '🌾', price: 120_000 },
};

export const DISH_CONFIG: Record<string, { name: string; icon: string; price: number }> = {
  radishSoup: { name: 'Canh củ cải', icon: '🍲', price: 20_000 },
  boiledEgg: { name: 'Trứng luộc', icon: '🥚', price: 18_000 },
  grilledCorn: { name: 'Bắp nướng mỡ hành', icon: '🌽', price: 55_000 },
  carrotJuice: { name: 'Nước ép cà rốt', icon: '🧃', price: 32_000 },
  eggBread: { name: 'Bánh mì ốp la', icon: '🥪', price: 35_000 },
  comTam: { name: 'Cơm tấm ốp la', icon: '🍛', price: 60_000 },
  cornCake: { name: 'Bánh bắp nướng', icon: '🥮', price: 45_000 },
};

export const SUPPLY_CONFIG: Record<string, { name: string; icon: string; price: number }> = {
  fertilizer: { name: 'Phân bón NPK', icon: '🧪', price: 15_000 },
  pesticide: { name: 'Thuốc trừ sâu', icon: '🧴', price: 8_000 },
  mysteryBag: { name: 'Túi may mắn', icon: '🎁', price: 50_000 },
  medicine: { name: 'Thuốc thú y cho bò', icon: '💉', price: 80_000 },
};

export const FS_VEG_CONFIG: Record<string, { name: string; icon: string; price: number }> = {
  rauMuong: { name: 'Rau muống hữu cơ', icon: '🥬', price: 5_000 },
  caChua: { name: 'Cà chua chín', icon: '🍅', price: 10_000 },
  duaLeo: { name: 'Dưa leo giòn', icon: '🥒', price: 8_000 },
  ot: { name: 'Ớt hiểm cay', icon: '🌶️', price: 8_000 },
  duaHau: { name: 'Dưa hấu ngọt', icon: '🍉', price: 20_000 },
};

export function getInventoryAssetKey(id: string): string {
  if (id.startsWith('crop_')) return `crop-${id.slice(5)}`;
  if (id.startsWith('seed_')) return `seed-${id.slice(5)}`;
  if (id.startsWith('supply_')) return id.slice(7);
  if (id.startsWith('fsveg_')) return `fsveg-${id.slice(6)}`;
  if (id.startsWith('marine_')) return `benfish-${id.slice(7)}`;
  if (id.startsWith('dish_')) return id.slice(5);
  if (id === 'produce_egg') return 'i-egg';
  if (id === 'produce_milk') return 'i-drink';
  return id;
}

export function computeInventory(snap: GameSnapshot | null): {
  entries: InventoryEntry[];
  totalValuation: number;
  categoryTotals: Record<ItemCategory, number>;
} {
  const entries: InventoryEntry[] = [];
  const categoryTotals: Record<ItemCategory, number> = {
    crops: 0,
    dishes: 0,
    seeds: 0,
    supplies: 0,
    farmstay: 0,
    marine: 0,
  };

  if (!snap) {
    return { entries, totalValuation: 0, categoryTotals };
  }

  // 1. Crops & Animal Produce
  const produce = snap.produce || {};
  const prices = snap.prices || {};

  for (const [cropId, meta] of Object.entries(CROP_CONFIG)) {
    const count = Number(produce[cropId]) || 0;
    if (count > 0) {
      const unitPrice = Number(prices[cropId]) || meta.defaultPrice;
      const totalValue = count * unitPrice;
      entries.push({
        id: `crop_${cropId}`,
        name: meta.name,
        category: 'crops',
        count,
        unitPrice,
        totalValue,
        icon: meta.icon,
        desc: meta.desc,
      });
      categoryTotals.crops += totalValue;
    }
  }

  // Eggs in inventory
  const eggs = Number(snap.eggs) || 0;
  if (eggs > 0) {
    const unitPrice = 15_000;
    const totalValue = eggs * unitPrice;
    entries.push({
      id: 'produce_egg',
      name: 'Trứng gà ta',
      category: 'crops',
      count: eggs,
      unitPrice,
      totalValue,
      icon: '🥚',
      desc: 'Ổ trứng trại',
    });
    categoryTotals.crops += totalValue;
  }

  // Fresh Milk in tank
  const dairyObj = snap.dairy as Record<string, unknown> | undefined;
  const milk = Number(dairyObj?.milk) || 0;
  if (milk > 0) {
    const unitPrice = 12_000;
    const totalValue = milk * unitPrice;
    entries.push({
      id: 'produce_milk',
      name: 'Sữa bò tươi nguyên chất',
      category: 'crops',
      count: milk,
      unitPrice,
      totalValue,
      icon: '🥛',
      desc: 'Đã vắt trong ngày (Lít)',
    });
    categoryTotals.crops += totalValue;
  }

  // 2. Kitchen Dishes
  const kitchenStock = (snap.kitchen as { stock?: Record<string, number> } | undefined)?.stock || {};
  for (const [dishId, meta] of Object.entries(DISH_CONFIG)) {
    const count = Number(kitchenStock[dishId]) || 0;
    if (count > 0) {
      const unitPrice = meta.price;
      const totalValue = count * unitPrice;
      entries.push({
        id: `dish_${dishId}`,
        name: meta.name,
        category: 'dishes',
        count,
        unitPrice,
        totalValue,
        icon: meta.icon,
        desc: 'Món ăn Bếp Nhà',
      });
      categoryTotals.dishes += totalValue;
    }
  }

  // 3. Seeds
  const seeds = snap.seeds || {};
  for (const [seedId, meta] of Object.entries(SEED_CONFIG)) {
    const count = Number(seeds[seedId]) || 0;
    if (count > 0) {
      const unitPrice = meta.price;
      const totalValue = count * unitPrice;
      entries.push({
        id: `seed_${seedId}`,
        name: meta.name,
        category: 'seeds',
        count,
        unitPrice,
        totalValue,
        icon: meta.icon,
        desc: 'Hạt giống trong túi',
      });
      categoryTotals.seeds += totalValue;
    }
  }

  // 4. Farming Supplies
  const items = snap.items || {};
  for (const [itemId, meta] of Object.entries(SUPPLY_CONFIG)) {
    let count = Number(items[itemId]) || 0;
    if (itemId === 'medicine') {
      count += Number(dairyObj?.medicine) || 0;
    }
    if (count > 0) {
      const unitPrice = meta.price;
      const totalValue = count * unitPrice;
      entries.push({
        id: `supply_${itemId}`,
        name: meta.name,
        category: 'supplies',
        count,
        unitPrice,
        totalValue,
        icon: meta.icon,
        desc: 'Vật tư nông trại',
      });
      categoryTotals.supplies += totalValue;
    }
  }

  // 5. Farmstay Veg Pantry
  const pantry = snap.farmstay?.veg?.pantry || {};
  for (const [vegId, meta] of Object.entries(FS_VEG_CONFIG)) {
    const count = Number(pantry[vegId]) || 0;
    if (count > 0) {
      const unitPrice = meta.price;
      const totalValue = count * unitPrice;
      entries.push({
        id: `fs_veg_${vegId}`,
        name: meta.name,
        category: 'farmstay',
        count,
        unitPrice,
        totalValue,
        icon: meta.icon,
        desc: 'Kho nông sản Farmstay',
      });
      categoryTotals.farmstay += totalValue;
    }
  }

  // 6. Marine & Fish Baskets
  // Wharf basket (Ben Net)
  const wharfBasket = snap.benNet?.basket;
  if (Array.isArray(wharfBasket) && wharfBasket.length > 0) {
    const fishGroup: Record<string, { name: string; count: number; totalVal: number }> = {};
    for (const f of wharfBasket) {
      const fishId = String(f.fish || f.id || '');
      const fName = fishNameMap.get(fishId) || (f as { name?: string }).name || fishId || 'Cá bến đò';
      const fPrice = Number(f.price) || 8_000;
      if (!fishGroup[fName]) {
        fishGroup[fName] = { name: fName, count: 0, totalVal: 0 };
      }
      fishGroup[fName].count += 1;
      fishGroup[fName].totalVal += fPrice;
    }
    for (const [fKey, g] of Object.entries(fishGroup)) {
      entries.push({
        id: `marine_wharf_${fKey}`,
        name: g.name,
        category: 'marine',
        count: g.count,
        unitPrice: Math.round(g.totalVal / g.count),
        totalValue: g.totalVal,
        icon: '🐟',
        desc: 'Giỏ cá Bến Đò',
      });
      categoryTotals.marine += g.totalVal;
    }
  }

  // Sea basket
  const seaBasket = snap.fishing?.basket;
  if (Array.isArray(seaBasket) && seaBasket.length > 0) {
    const count = seaBasket.length;
    const estVal = count * 15_000;
    entries.push({
      id: 'marine_sea_basket',
      name: 'Giỏ cá biển tươi sống',
      category: 'marine',
      count,
      unitPrice: 15_000,
      totalValue: estVal,
      icon: '🎣',
      desc: 'Câu tại bãi biển',
    });
    categoryTotals.marine += estVal;
  }

  const totalValuation = Object.values(categoryTotals).reduce((sum, v) => sum + v, 0);

  return { entries, totalValuation, categoryTotals };
}

export function computeNetWorth(
  snap: GameSnapshot | null,
  inventoryValuation: number
): {
  gold: number;
  savingsPrincipal: number;
  savingsInterest: number;
  pigAmount: number;
  wharfShells: number;
  inventoryValue: number;
  totalNetWorth: number;
} {
  if (!snap) {
    return {
      gold: 0,
      savingsPrincipal: 0,
      savingsInterest: 0,
      pigAmount: 0,
      wharfShells: 0,
      inventoryValue: 0,
      totalNetWorth: 0,
    };
  }

  const gold = Number(snap.gold) || 0;
  const savingsObj = snap.savings as {
    pig?: { amount?: number };
    books?: Array<{ amount?: number; days?: number }>;
  } | undefined;
  const pigAmount = Number(savingsObj?.pig?.amount) || 0;
  const wharfShells = Number(snap.benNet?.wallet?.shells) || 0;

  let savingsPrincipal = 0;
  let savingsInterest = 0;
  const books = Array.isArray(savingsObj?.books) ? savingsObj!.books : [];
  for (const b of books) {
    const amt = Number(b.amount) || 0;
    savingsPrincipal += amt;
    const days = Number(b.days) || 7;
    const rate = days === 3 ? 0.05 : days === 14 ? 0.35 : 0.15;
    savingsInterest += Math.round(amt * rate);
  }

  const totalNetWorth = gold + savingsPrincipal + savingsInterest + pigAmount + inventoryValuation;

  return {
    gold,
    savingsPrincipal,
    savingsInterest,
    pigAmount,
    wharfShells,
    inventoryValue: inventoryValuation,
    totalNetWorth,
  };
}
