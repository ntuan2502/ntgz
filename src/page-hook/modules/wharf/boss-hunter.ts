import { sendBenWs } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { BenExecutionContext, BenStepResult } from './types';

let lastBossPxX = 0;
let lastBossPxY = 0;
let lastBossTime = 0;
let lastDispatchedBossTile = { x: -1, y: -1 };

/**
 * Xử lý Săn Boss Bí Ngô (Mỗi 30 phút, chạy 3 phút) & Thu cần chờ sẵn (không chạy ra giữa map).
 */
export function runBossHuntOrImpendingStep(ctx: BenExecutionContext): BenStepResult | null {
  const { cfg, bn, benScene, isBossActive, isBossImpending, secondsToNextBoss } = ctx;

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

        const allowTrackingMove = cfg.benBossTracking !== false;
        const needMove = allowTrackingMove && distTiles > 1.2;
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
          msg: `👑 ${allowTrackingMove ? 'Đang áp sát' : 'Đang hướng nhìn'} Boss Bí Ngô (${bossTileX}, ${bossTileY}) · Hứng bí ngô rắc rơi 🎃`,
        };
      }
    }
  }

  // 2. Khi đếm ngược còn <= 10s -> Chỉ cần thu cần lại, đứng tại chỗ chờ săn Boss (không cần ra giữa map)
  if (isBossImpending) {
    if (bn.fishing !== 'idle') {
      sendBenWs({ t: 'hook' });
    }

    return {
      acted: true,
      isBossHunt: true,
      allowCast: false,
      msg: `👑 Boss Bí Ngô sắp xuất hiện (còn ${secondsToNextBoss}s) ➔ Đã thu cần đứng chờ sẵn săn Boss 🎃`,
    };
  }

  // 3. Khi Boss đang hoạt động nhưng chưa thấy trên map -> Thu cần đứng quan sát
  if (isBossActive) {
    if (bn.fishing !== 'idle') {
      sendBenWs({ t: 'hook' });
    }

    return {
      acted: true,
      isBossHunt: true,
      allowCast: false,
      msg: '👑 Boss Bí Ngô đang hoạt động ➔ Đã thu cần, đứng quan sát chờ Boss 🎃',
    };
  }

  return null;
}
