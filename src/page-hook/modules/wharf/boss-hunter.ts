import { sendBenWs } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { BenExecutionContext, BenStepResult, BEN_MAP_CENTER_TILE } from './types';

let lastBossPxX = 0;
let lastBossPxY = 0;
let lastBossTime = 0;
let lastDispatchedBossTile = { x: -1, y: -1 };

/**
 * Xử lý Săn Boss Bí Ngô (Mỗi 30 phút, chạy 3 phút) & Đón lõng 10s giữa map.
 */
export function runBossHuntOrImpendingStep(ctx: BenExecutionContext): BenStepResult | null {
  const { cfg, bn, benScene, isBossImpending, secondsToNextBoss } = ctx;

  // 1. Khi Boss Bí Ngô đang xuất hiện trên bản đồ -> Bám sát tọa độ Boss
  if (cfg.benAutoBossHunt !== false) {
    const isBossVisible = Boolean(benScene?.boss?.visible);
    const hasBossState = Boolean(bn.hlwBoss);
    if ((isBossVisible || hasBossState) && benScene?.boss && benScene.farmer) {
      const bossPxX = benScene.boss.x ?? 0;
      const bossPxY = benScene.boss.y ?? 0;
      if (bossPxX > 0 || bossPxY > 0) {
        const bossTileX = Math.round(bossPxX / 16);
        const bossTileY = Math.round(bossPxY / 16);

        const farmerPxX = benScene.farmer.x ?? bossPxX;
        const farmerPxY = benScene.farmer.y ?? bossPxY;
        const farmerTile = benScene.farmer.tile || {
          x: Math.round(farmerPxX / 16),
          y: Math.round(farmerPxY / 16),
        };

        const now = performance.now();
        const dt = lastBossTime > 0 ? Math.max(30, now - lastBossTime) : 100;
        const vx = lastBossTime > 0 ? (bossPxX - lastBossPxX) / dt : 0;
        const vy = lastBossTime > 0 ? (bossPxY - lastBossPxY) / dt : 0;
        const speed = Math.hypot(vx, vy);

        lastBossPxX = bossPxX;
        lastBossPxY = bossPxY;
        lastBossTime = now;

        // Predict lead target if boss is moving (lead by ~260ms in movement direction)
        let targetTileX = bossTileX;
        let targetTileY = bossTileY;
        if (speed > 0.02) {
          const leadPx = Math.min(28, speed * 260);
          const angle = Math.atan2(vy, vx);
          targetTileX = Math.round((bossPxX + Math.cos(angle) * leadPx) / 16);
          targetTileY = Math.round((bossPxY + Math.sin(angle) * leadPx) / 16);
        }

        const distTiles = Math.hypot(bossTileX - farmerTile.x, bossTileY - farmerTile.y);
        const targetDistFromDispatched = Math.hypot(
          targetTileX - lastDispatchedBossTile.x,
          targetTileY - lastDispatchedBossTile.y
        );

        const needMove = distTiles > 1.2;
        const cooldownElapsed = canAct('ben_boss_hunt', 200);

        if (needMove && (targetDistFromDispatched >= 1 || cooldownElapsed)) {
          markActed('ben_boss_hunt');
          lastDispatchedBossTile = { x: targetTileX, y: targetTileY };
          benScene.goFarmer?.({ x: targetTileX, y: targetTileY });
          return {
            acted: true,
            isBossHunt: true,
            msg: `👑 Bám sát Boss Bí Ngô tại (${targetTileX}, ${targetTileY}) · Cách ${distTiles.toFixed(1)} ô 🎃`,
          };
        }

        if (benScene.farmer.lookAt) {
          benScene.farmer.lookAt(bossPxX, bossPxY);
        }

        return {
          acted: true,
          isBossHunt: true,
          msg: `👑 Đang áp sát Boss Bí Ngô (${bossTileX}, ${bossTileY}) · Hứng bí ngô rắc rơi 🎃`,
        };
      }
    }
  }

  // 2. Khi đếm ngược còn <= 10s -> Thu cần ngay và chạy ra giữa map chờ sẵn
  if (isBossImpending) {
    if (bn.fishing !== 'idle') {
      sendBenWs({ t: 'hook' });
    }

    const curTile = benScene?.farmer?.tile;
    const isAtCenter =
      curTile &&
      Math.abs(curTile.x - BEN_MAP_CENTER_TILE.x) <= 1 &&
      Math.abs(curTile.y - BEN_MAP_CENTER_TILE.y) <= 1;

    if (!isAtCenter && benScene && typeof benScene.goFarmer === 'function') {
      if (!benScene.farmer?.running) {
        benScene.goFarmer(BEN_MAP_CENTER_TILE);
      }
      return {
        acted: true,
        isBossHunt: true,
        allowCast: false,
        msg: `👑 Boss Bí Ngô sắp xuất hiện (còn ${secondsToNextBoss}s) ➔ Đang chạy ra giữa map (${BEN_MAP_CENTER_TILE.x}, ${BEN_MAP_CENTER_TILE.y}) chờ sẵn 🎃`,
      };
    }

    return {
      acted: true,
      isBossHunt: true,
      allowCast: false,
      msg: `👑 Đã đứng giữa map chờ Boss Bí Ngô xuất hiện (còn ${secondsToNextBoss}s) 🎃`,
    };
  }

  return null;
}
