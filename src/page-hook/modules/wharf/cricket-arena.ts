import { sendBenWs } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { CricketItem, SoiNpc } from '../../../shared/types/game-store';
import { getBenHuntSpots, BEN_HUNT_ZONES } from '../../../shared/constants/default-config';
import {
  CRICKET_SPECIES_NAMES,
  CRICKET_SPECIES_RARITY,
  CRICKET_RARITY_REFUND,
} from '../../../shared/constants/wharf-catalog';
import { getBenServerNow, getBenHour, markHuntLightSent } from './cricket-watchers';
import {
  BenExecutionContext,
  BenStepResult,
  BOSS_LADDER,
  SOI_TILE,
  CRICKET_BOX_MAX,
  HUNT_STAMINA_COST,
  cricketTotal,
} from './types';
import { tryRecoverBenStamina } from './stamina-recovery';

let huntLightAt = 0;
let huntSpotIdx = 0;
let lastHandledGotAwaySeq = -1;
let lastHuntZoneChoice: string | null = null;

export function getHuntLightAt(): number {
  return huntLightAt;
}

/**
 * SUB-AREA RUNNER 2: CRICKET ARENA & BOSS FIGHT (Sới dế Ông Sáu)
 */
export function runCricketBossStep(ctx: BenExecutionContext): BenStepResult {
  const { bn, bossEnabled, walkAndRun } = ctx;

  if (!bossEnabled) {
    return { acted: false };
  }

  if (!bn.soi) {
    if (canAct('ben_soi_fetch', 4000)) {
      return walkAndRun(
        SOI_TILE,
        () => {
          sendBenWs({ t: 'soi' });
        },
        '🥊 Đi lại Sới Dế Ông Sáu để xem danh sách Boss...',
        'ben_soi_fetch',
        { panel: 'soi' },
        1200
      );
    }
    return { acted: false };
  }

  if (!canAct('ben_boss_wait', 3000)) {
    return { acted: false };
  }

  const npcs: SoiNpc[] = bn.soi.npcs || [];
  let targetNpcId: string | null = null;
  let nextBossMeta: (typeof BOSS_LADDER)[number] | null = null;

  for (const b of BOSS_LADDER) {
    const npcState = npcs.find((n: SoiNpc) => {
      const nid = String(n.id).toLowerCase();
      return b.aliases.some((a) => nid === a || nid.includes(a));
    });
    if (npcState && npcState.open && !npcState.paidToday) {
      targetNpcId = npcState.id;
      nextBossMeta = b;
      break;
    }
  }
  if (!nextBossMeta) return { acted: false };

  const box: CricketItem[] = bn.soi.box?.length ? bn.soi.box : bn.crickets?.box || [];
  const nowServer = getBenServerNow(bn);
  const readyCrickets = box
    .filter((c) => (!c.restUntil || c.restUntil <= nowServer) && (!c.diesAt || c.diesAt > nowServer))
    .sort((a, b) => {
      const combatScore = (c: CricketItem) =>
        (c.stats?.power || 0) * 1.2 + (c.stats?.tough || 0) * 1.1 + (c.stats?.nerve || 0) * 1.0;
      return combatScore(b) - combatScore(a);
    });
  const bestCricket = readyCrickets[0];
  if (!bestCricket) return { acted: false };

  const bossNpcId = targetNpcId || nextBossMeta.id;
  const cTotal = cricketTotal(bestCricket);
  const cName = CRICKET_SPECIES_NAMES[bestCricket.species] || 'Dế';
  return walkAndRun(
    SOI_TILE,
    () => {
      sendBenWs({ t: 'bout', npc: bossNpcId, cricket: bestCricket.id });
    },
    `🥊 Thách đấu ${nextBossMeta.name} tại Sới Dế (+${nextBossMeta.reward}🐚) với ${cName} (Tổng: ${cTotal} vs ${nextBossMeta.total})`,
    'ben_boss_bout',
    { panel: 'soi' },
    1200
  );
}

/**
 * SUB-AREA RUNNER 3: CRICKET HUNT & TUBE CARE (Bắt dế đêm & Nuôi dế ống tre)
 */
export function runCricketHuntStep(ctx: BenExecutionContext): BenStepResult {
  const { cfg, bn, bnStore, benScene, stamina, huntEnabled, runWithOptionalPanel } = ctx;

  if (!huntEnabled) {
    return { acted: false };
  }
  if (!bn.crickets) {
    if (canAct('ben_crickets_open', 4000)) {
      markActed('ben_crickets_open');
      runWithOptionalPanel(
        () => {
          sendBenWs({ t: 'crickets' });
        },
        '🎋 Đang mở Ống tre nuôi dế để kiểm tra dế...',
        { panel: 'crickets' },
        1200
      );
      return { acted: true, msg: '🎋 Đang mở Ống tre nuôi dế...' };
    }
    return { acted: false };
  }
  const box: CricketItem[] = bn.crickets.box || [];

  // 1. Night window check (wharf runs on real Vietnam time, 18h-5h)
  const hour = getBenHour(bn);
  const isNight = hour >= 18 || hour < 5;
  const isRareHour = hour >= 23 || hour < 4;
  if (!isNight || (cfg.benHuntRareOnly && !isRareHour)) {
    return { acted: false };
  }

  // 2. Full tube: release cricket according to smart priority rules
  if (box.length >= CRICKET_BOX_MAX) {
    if (cfg.benAutoReleaseLowCricket === false || !canAct('ben_cricket_release', 3000)) {
      return { acted: false };
    }

    const keepSpecies = Array.isArray(cfg.benKeepCricketSpecies)
      ? cfg.benKeepCricketSpecies
      : ['deVuong', 'deMa', 'deSat', 'deNgoc', 'deLua', 'deVang'];
    const keepRarities = Array.isArray(cfg.benKeepCricketRarities)
      ? cfg.benKeepCricketRarities
      : ['rare', 'epic', 'legendary'];

    const rankOrder: Record<string, number> = {
      common: 1,
      uncommon: 2,
      rare: 3,
      epic: 4,
      legendary: 5,
    };

    const sortedBox = [...box].sort((a, b) => {
      const rarityA = CRICKET_SPECIES_RARITY[a.species] || 'common';
      const rarityB = CRICKET_SPECIES_RARITY[b.species] || 'common';
      const rankA = rankOrder[rarityA] || 1;
      const rankB = rankOrder[rarityB] || 1;

      const wantedA = keepSpecies.includes(a.species) || keepRarities.includes(rarityA);
      const wantedB = keepSpecies.includes(b.species) || keepRarities.includes(rarityB);

      if (wantedA !== wantedB) {
        return wantedA ? 1 : -1;
      }
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      const cpA = cricketTotal(a);
      const cpB = cricketTotal(b);
      if (cpA !== cpB) {
        return cpA - cpB;
      }
      const capA = (a.caps?.power || 0) + (a.caps?.tough || 0) + (a.caps?.nerve || 0);
      const capB = (b.caps?.power || 0) + (b.caps?.tough || 0) + (b.caps?.nerve || 0);
      return capA - capB;
    });

    const lowest = sortedBox[0];
    const lowestRarity = CRICKET_SPECIES_RARITY[lowest.species] || 'common';
    const lowestCp = cricketTotal(lowest);

    markActed('ben_cricket_release');
    const cName = CRICKET_SPECIES_NAMES[lowest.species] || 'Dế';
    const rarityLabelMap: Record<string, string> = {
      common: 'Thường',
      uncommon: 'Đặc biệt',
      rare: 'Hiếm',
      epic: 'Sử thi',
      legendary: 'Huyền thoại',
    };
    const rarityStr = rarityLabelMap[lowestRarity] || lowestRarity;
    const releaseLabel = `🎋 Ống tre đầy (6/6) -> Mở ống tre thả ${cName} (CP ${lowestCp} · ${rarityStr}) về đồng (+${CRICKET_RARITY_REFUND[lowestRarity] || 5}🐚)`;

    runWithOptionalPanel(
      () => {
        sendBenWs({ t: 'release', id: lowest.id });
      },
      releaseLabel,
      { panel: 'crickets' },
      1400
    );

    return {
      acted: true,
      msg: releaseLabel,
    };
  }

  // 3. Stamina: each light costs 3
  if (stamina < HUNT_STAMINA_COST) {
    const stamRes = tryRecoverBenStamina(ctx);
    if (stamRes) return stamRes;
    return {
      acted: false,
      exhausted: true,
      reason: '😮‍💨 Bến Đò: Hết Sức rọi đèn bắt dế đêm -> Chuyển khu vực tiếp theo!',
    };
  }

  // 4. Hunt spot & zone selection
  const zoneChoice = cfg.benHuntZone || 'field';
  if (zoneChoice !== lastHuntZoneChoice) {
    lastHuntZoneChoice = zoneChoice;
    huntSpotIdx = 0;
  }
  const spots = getBenHuntSpots(zoneChoice);
  if (!spots || spots.length === 0) {
    return { acted: false };
  }

  const gotAway = bn.gotAway;
  if (gotAway && typeof gotAway.seq === 'number' && gotAway.seq !== lastHandledGotAwaySeq) {
    lastHandledGotAwaySeq = gotAway.seq;
    if (gotAway.why === 'none') {
      huntSpotIdx = (huntSpotIdx + 1) % spots.length;
      const nextSpot = spots[huntSpotIdx % spots.length];
      const nextMeta = BEN_HUNT_ZONES[nextSpot.zone] ?? BEN_HUNT_ZONES.field;
      return {
        acted: true,
        msg: `🌾 Bụi này im re không có tiếng dế -> Di chuyển sang ${nextMeta.label} (${nextSpot.x}, ${nextSpot.y}) tìm dế...`,
      };
    }
  }

  const currentSpot = spots[huntSpotIdx % spots.length];
  const zoneMeta = BEN_HUNT_ZONES[currentSpot.zone] ?? BEN_HUNT_ZONES.field;

  // 5. Walk to target spot and shine flashlight
  return {
    acted: false,
    deferred: () => {
      if (!benScene || typeof benScene.goFarmer !== 'function') return { acted: false };
      const cur = benScene.farmer?.tile;
      const atTarget = Boolean(
        cur && Math.abs(cur.x - currentSpot.x) <= 1 && Math.abs(cur.y - currentSpot.y) <= 1
      );

      if (!atTarget) {
        if (benScene.farmer?.running) {
          return {
            acted: true,
            msg: `🚶 Đang di chuyển sang ${zoneMeta.label} (${currentSpot.x}, ${currentSpot.y})...`,
          };
        }
        benScene.goFarmer({ x: currentSpot.x, y: currentSpot.y });
        return {
          acted: true,
          msg: `🚶 Ra ${zoneMeta.label} (${currentSpot.x}, ${currentSpot.y}) săn dế đêm...`,
        };
      }

      if (!canAct('ben_hunt_light', 2500)) {
        return { acted: true, msg: '🔦 Chuẩn bị rọi đèn bắt dế...' };
      }

      markActed('ben_hunt_light');
      markHuntLightSent();
      huntLightAt = Date.now();
      bnStore.setState({ hunt: { phase: 'light' } });
      sendBenWs({ t: 'light' });

      return {
        acted: true,
        msg: `🔦 Rọi đèn bắt dế đêm tại ${zoneMeta.label} (⚡${HUNT_STAMINA_COST} Sức · ống tre ${box.length}/${CRICKET_BOX_MAX})`,
      };
    },
  };
}
