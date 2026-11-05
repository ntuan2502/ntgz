import { AppConfig } from '../../shared/types/config';
import { GameSnapshot } from '../../shared/types/game-state';
import {
  computeBasketKeepPlan,
  getFishRarity,
  resolveFishId,
  shouldKeepFishByConfig,
} from '../../shared/constants/wharf-catalog';
import { execGameAction } from '../bridge/content-bridge';
import { isVisible, triggerPointerDownAndClick, triggerPointerDownAt } from './dom-helpers';
import {
  classifyMilitiaImage,
  detectMilitiaCheckType,
  MILITIA_KIND_LABELS,
  MilitiaAskKind,
  MilitiaCheckType,
  MilitiaClassificationResult,
  MilitiaTapAnswerResolution,
  parseMilitiaTarget,
  playMilitiaAlertBeep,
  resolveMilitiaAnswer,
  solveMilitiaOddImage,
  solveMilitiaQuizImage,
  solveMilitiaTapImage,
  solveMilitiaDragImage,
  type MilitiaDragAnswerResolution,
} from './militia-solver';

let lastModalClickAt = 0;
let catchCardSeenAt = 0;
let catchReadMs = 0;
let lastWheelActionAt = 0;
let lastAtmActionAt = 0;
let lastCricketCatchAt = 0;
let lastBoutCloseAt = 0;
let militiaFirstSeenAt = 0;
let lastMilitiaClickAt = 0;
let militiaCheckType: MilitiaCheckType = 'count';
let militiaSolvingPromise: Promise<unknown> | null = null;
let militiaSolvedResult: MilitiaClassificationResult | null = null;
let militiaSolvedTapResult: MilitiaTapAnswerResolution | null = null;
let militiaSolvedDragResult: MilitiaDragAnswerResolution | null = null;
let militiaTargetKind: MilitiaAskKind = 'fish';
let militiaOptions: number[] = [];
let militiaHasAlerted = false;

export function formatBenCatchSummary(card: HTMLElement, kept: boolean): string {
  const fishName = card.querySelector('h3')?.textContent?.trim() || 'Cá';
  const rarityText = card.querySelector('h3')?.nextElementSibling?.textContent?.trim() || 'Thường';
  const isRainbow = Boolean(card.querySelector('.catch-tag.rainbow'));
  const isOdd = Boolean(card.querySelector('.catch-tag.odd'));
  const isRecord = Boolean(card.querySelector('.catch-tag.record'));

  const variantTag = isRainbow ? ' · 🌈 Cầu vồng' : isOdd ? ' · ✨ Cá lạ' : '';
  const recordTag = isRecord ? ' · 📏 Kỷ lục' : '';
  const typeLabel = `${rarityText}${variantTag}${recordTag}`;

  const fullText = card.textContent || '';
  const sizeMatch = fullText.match(/Dài\s+([\d.,]+)\s*cm/i);
  const sizePart = sizeMatch ? `Dài ${sizeMatch[1]} cm` : '';

  const priceRaw = card.querySelector('.ben-catch-price')?.textContent?.trim() || '';
  const sellMatch = priceRaw.match(/🐚\s*([\d.,]+)\s*vỏ sò/i);
  const releaseMatch = priceRaw.match(/thưởng\s*🐚\s*\+?([\d.,]+)/i);
  const pricePart = sellMatch
    ? `Bán ${sellMatch[1]} vỏ sò 🐚`
    : releaseMatch
      ? `Thả sông +${releaseMatch[1]} vỏ sò 🐚`
      : priceRaw;

  const ticketMatch = fullText.match(/có\s+(\d+)\s*tấm vé quay/i);
  const hasTicket = ticketMatch
    ? ` · 🎟️ +${ticketMatch[1]} vé quay`
    : fullText.includes('tấm vé quay')
      ? ' · 🎟️ +1 vé quay'
      : '';

  const prefix = kept ? '⭐ Giữ lại' : '🐟 Câu được';
  const parts = [`${prefix}: ${fishName} (${typeLabel})`];
  if (sizePart) parts.push(sizePart);
  if (pricePart) parts.push(pricePart);
  return parts.join(' · ') + hasTicket;
}

export function handleBenCatchModal(
  snap: GameSnapshot,
  config: AppConfig,
  setStatus: (text: string) => void,
  onCatchIncrement: () => void,
  delayMs: number
): { handled: boolean; microBreakMs?: number; nextCastDelayMs?: number } {
  const bn = snap.benNet;
  if (bn?.fishing !== 'landing' && !document.querySelector('.catch-card.ben-catch')) {
    return { handled: false };
  }

  const now = performance.now();
  if (now - lastModalClickAt <= Math.max(120, Math.min(delayMs * 0.25, 250))) {
    return { handled: true };
  }

  const card = document.querySelector('.catch-card.ben-catch') as HTMLElement | null;
  if (!card) {
    catchCardSeenAt = 0;
    if (bn?.fishing === 'landing' || bn?.landed) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', bubbles: true }));
      void execGameAction('BEN_DISMISS_CATCH', { config });
    }
    return { handled: true };
  }

  // Look at the catch card for a moment like a human before pressing a button
  if (config.benHumanJitter !== false) {
    if (!catchCardSeenAt) {
      catchCardSeenAt = now;
      catchReadMs = 550 + Math.floor(Math.random() * 650);
    }
    if (now - catchCardSeenAt < catchReadMs) {
      return { handled: true };
    }
  }
  catchCardSeenAt = 0;

  const landed = bn?.landed as {
    id?: string;
    fish?: string;
    rarity?: string;
    price?: number;
    size?: number;
    odd?: boolean;
    rainbow?: boolean;
    released?: boolean;
    [key: string]: unknown;
  } | null | undefined;

  const h3Name = card.querySelector('h3')?.textContent?.trim() || '';
  const h3Next = card.querySelector('h3')?.nextElementSibling?.textContent?.trim()?.toLowerCase() || '';
  const fishId = resolveFishId(landed?.fish, h3Name);
  const fallbackRarity = landed?.rarity || (card.classList.contains('mythic') ? 'mythic' : h3Next);
  const rawRarity = getFishRarity(fishId || h3Name, fallbackRarity);

  const isRainbow = Boolean(landed?.rainbow || card.querySelector('.catch-tag.rainbow'));
  const isOdd = Boolean(landed?.odd || card.querySelector('.catch-tag.odd'));

  const fishPrice =
    Number(landed?.price) ||
    (() => {
      const priceText = card.querySelector('.ben-catch-price')?.textContent || '';
      const m = priceText.match(/([\d.,]+)\s*vỏ sò/i);
      return m ? Number(m[1].replace(/[.,]/g, '')) : 0;
    })();

  const shouldKeep = shouldKeepFishByConfig(
    {
      id: landed?.id || 'landed',
      fish: fishId || h3Name,
      name: h3Name,
      rarity: rawRarity,
      price: fishPrice,
      size: Number(landed?.size) || 0,
      odd: isOdd,
      rainbow: isRainbow,
      released: Boolean(landed?.released),
    },
    config
  );

  const keepBtn = card.querySelector('.ben-catch-btns button.btn-yellow') as HTMLButtonElement | null;
  const bagBtn = card.querySelector('.ben-catch-btns button.btn-green') as HTMLButtonElement | null;

  let shouldKeepFinal = shouldKeep;
  const oldKeptIdsToUnkeep: string[] = [];
  let duplicateNote = '';

  if (shouldKeep && Array.isArray(bn?.basket)) {
    if (config.benAutoSellDuplicateKept !== false) {
      const existingKept = bn.basket.filter(
        (f: { kept?: boolean; fish?: string; name?: string; price?: number; id?: string }) =>
          Boolean(f.kept) &&
          f.id !== landed?.id &&
          (resolveFishId(f.fish, f.name) === fishId ||
            (fishId && f.fish === fishId) ||
            (h3Name && f.name === h3Name))
      );

      if (existingKept.length > 0) {
        existingKept.sort(
          (a: { price?: number }, b: { price?: number }) => (Number(b.price) || 0) - (Number(a.price) || 0)
        );
        const bestOld = existingKept[0];
        const bestOldPrice = Number(bestOld.price) || 0;

        if (fishPrice > bestOldPrice) {
          shouldKeepFinal = true;
          for (const oldFish of existingKept) {
            if (oldFish.id) oldKeptIdsToUnkeep.push(oldFish.id);
          }
          duplicateNote = ` (Đắt hơn con ${bestOldPrice.toLocaleString('vi-VN')}🐚 cũ, bỏ giữ con cũ để bán)`;
        } else {
          shouldKeepFinal = false;
          duplicateNote = ` (Trùng loại, rẻ hơn con đã giữ ${bestOldPrice.toLocaleString('vi-VN')}🐚 -> Bỏ vô giỏ để bán)`;
        }
      }
    }

    // Nếu cần giữ nhưng nút Giữ đang bị khoá do đầy ngăn (10/10), kiểm tra kế hoạch giữ cá toàn giỏ
    // để nhường chỗ (bỏ giữ cá ngoài danh sách lọc hoặc cá rẻ hơn trong ngăn)
    if (shouldKeepFinal && keepBtn?.disabled && oldKeptIdsToUnkeep.length === 0) {
      const plan = computeBasketKeepPlan(bn.basket, bn.wallet, config);
      if (landed?.id && !plan.desiredKeptIds.has(landed.id)) {
        shouldKeepFinal = false;
        duplicateNote = ' (Ngăn giữ đã đầy cá đắt hơn -> Bỏ vô giỏ để bán)';
      } else {
        for (const u of plan.toUnkeep) {
          if (u.fish.id && !oldKeptIdsToUnkeep.includes(u.fish.id)) {
            oldKeptIdsToUnkeep.push(u.fish.id);
          }
        }
      }
    }
  }

  for (const oldId of oldKeptIdsToUnkeep) {
    void execGameAction('BEN_KEEP_FISH', { id: oldId, on: false });
  }

  if (shouldKeepFinal) {
    const msg = `${formatBenCatchSummary(card, true)}${duplicateNote}`;
    setStatus(msg);
    if (keepBtn && !keepBtn.disabled) {
      triggerPointerDownAndClick(keepBtn);
    } else {
      if (landed?.id) {
        void execGameAction('BEN_KEEP_FISH', { id: landed.id, on: true });
      }
      if (bagBtn) {
        triggerPointerDownAndClick(bagBtn);
      } else {
        void execGameAction('BEN_DISMISS_CATCH', { config });
      }
    }
  } else if (bagBtn) {
    const msg = `${formatBenCatchSummary(card, false)}${duplicateNote}`;
    triggerPointerDownAndClick(bagBtn);
    setStatus(msg);
  } else {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', bubbles: true }));
    void execGameAction('BEN_DISMISS_CATCH', { config });
  }
  lastModalClickAt = now;
  onCatchIncrement();

  if (config.benHumanJitter !== false) {
    const microBreakMs = Math.random() < 0.04 ? Math.floor(Math.random() * 2000) + 2000 : 0;
    const nextCastDelayMs = Math.floor(Math.random() * 600) + 550;
    return { handled: true, microBreakMs, nextCastDelayMs };
  }

  return { handled: true, nextCastDelayMs: 150 };
}

export function handleBenLanternWheel(
  wheelEl: HTMLElement,
  snap: GameSnapshot,
  config: AppConfig,
  setStatus: (text: string) => void,
  delayMs: number
): boolean {
  const now = performance.now();
  if (now - lastWheelActionAt < Math.max(350, delayMs * 0.7)) {
    return true;
  }

  // A. Spin Result Modal (.ben-wheel-card.result)
  const resultCard = wheelEl.querySelector('.ben-wheel-card.result') as HTMLElement | null;
  if (resultCard) {
    const tierText = resultCard.querySelector('.ben-wheel-tier')?.textContent?.trim() || 'Vỏ sò an ủi';
    const wonItemName = resultCard.querySelector('b')?.textContent?.trim() || '';
    const shellsText = resultCard.querySelector('.ben-wheel-shells')?.textContent?.trim() || '';
    const confirmBtn = resultCard.querySelector('button.btn-green') as HTMLButtonElement | null;
    const confirmLabel = confirmBtn?.textContent?.trim() || 'Nhận';

    const resultLog = wonItemName
      ? `🏮 Vòng quay Cô Bảy: 🎉 TRÚNG "${wonItemName}" (${tierText})${shellsText ? ` · ${shellsText}` : ''} -> Đã nhấn "${confirmLabel}"!`
      : `🏮 Vòng quay Cô Bảy: Quay được ${shellsText || tierText} (${tierText}) -> Đã nhấn "${confirmLabel}"!`;

    setStatus(resultLog);
    if (confirmBtn && !confirmBtn.disabled) {
      triggerPointerDownAndClick(confirmBtn);
    }
    lastWheelActionAt = now;
    return true;
  }

  // B. Pick 3 Items Modal (.ben-wheel-card:not(.result))
  const pickCard = wheelEl.querySelector('.ben-wheel-card:not(.result)') as HTMLElement | null;
  if (pickCard) {
    const confirmPickBtn = pickCard.querySelector('.ben-wheel-row button.btn-green') as HTMLButtonElement | null;
    if (confirmPickBtn && !confirmPickBtn.disabled) {
      triggerPointerDownAndClick(confirmPickBtn);
      setStatus('🏮 Vòng quay Cô Bảy: Đã chọn đủ món muốn săn -> Nhấn "Lên vòng"!');
      lastWheelActionAt = now;
      return true;
    }

    const unpickedBtn = pickCard.querySelector('.ben-wheel-pick:not(.on)') as HTMLButtonElement | null;
    if (unpickedBtn) {
      const itemName = unpickedBtn.querySelector('span')?.textContent?.trim() || 'vật phẩm';
      triggerPointerDownAndClick(unpickedBtn);
      setStatus(`🏮 Vòng quay Cô Bảy: Đang chọn món "${itemName}" lên vòng quay...`);
      lastWheelActionAt = now;
      return true;
    }
  }

  // C. Main Wheel Panel Controls
  const btns = Array.from(wheelEl.querySelectorAll('.ben-wheel-btns button')) as HTMLButtonElement[];
  const spinOneBtn = btns.find((b) => (b.textContent || '').includes('Quay 1 ·'));
  const spinMultiBtn = btns.find((b) => {
    const text = b.textContent || '';
    return text.includes('Quay ') && !text.includes('Quay 1 ·');
  });
  const buyTicketBtn = btns.find((b) => (b.textContent || '').includes('Mua vé'));
  const closeBtn = wheelEl.querySelector('.ben-panel-head button.btn-brown') as HTMLButtonElement | null;

  if (!config.benAutoLantern) {
    if (closeBtn && !closeBtn.disabled) {
      triggerPointerDownAndClick(closeBtn);
      lastWheelActionAt = now;
    }
    return true;
  }

  if (!spinOneBtn || spinOneBtn.disabled) {
    setStatus('🏮 Vòng quay lồng đèn Cô Bảy đang quay... chờ kết quả!');
    return true;
  }

  const chipText = wheelEl.querySelector('.ben-wheel-top .ben-chip')?.textContent || '';
  const ticketMatch = chipText.match(/🎟️\s*(\d+)/);
  const liveTickets = ticketMatch ? Number(ticketMatch[1]) : (snap.benNet?.wallet?.tickets ?? 0);

  const boughtMatch = (buyTicketBtn?.textContent || '').match(/\((\d+)\/5\)/);
  const boughtCount = boughtMatch ? Number(boughtMatch[1]) : (snap.benNet?.wheel?.bought ?? 0);
  const shells = snap.benNet?.wallet?.shells ?? 0;

  if (config.benBuyLanternTicket && boughtCount < 5 && shells >= 600 && buyTicketBtn && !buyTicketBtn.disabled) {
    triggerPointerDownAndClick(buyTicketBtn);
    setStatus(`🎟️ Mua vé Vòng quay lồng đèn Cô Bảy (${boughtCount + 1}/5 · -600 vỏ sò 🐚)`);
    lastWheelActionAt = now;
    return true;
  }

  const wantMulti = config.benLanternSpinMode === 'x10';
  if (wantMulti) {
    if (liveTickets >= 10 && spinMultiBtn && !spinMultiBtn.disabled) {
      triggerPointerDownAndClick(spinMultiBtn);
      setStatus(`🏮 Vòng quay Cô Bảy: Nhấn quay x10 (còn ${liveTickets} vé 🎟️)...`);
      lastWheelActionAt = now;
      return true;
    }
    if (liveTickets < 10 && closeBtn && !closeBtn.disabled) {
      triggerPointerDownAndClick(closeBtn);
      setStatus(
        liveTickets > 0
          ? `🏮 Vòng quay Cô Bảy: Có ${liveTickets}/10 vé (chờ đủ 10 vé mới quay x10) ➔ Đóng bảng quay lại làm việc khác!`
          : '🏮 Đã quay hết vé lồng đèn Cô Bảy ➔ Đóng bảng quay lại câu cá!'
      );
      lastWheelActionAt = now;
      return true;
    }
  } else {
    if (liveTickets > 0 && spinOneBtn && !spinOneBtn.disabled) {
      triggerPointerDownAndClick(spinOneBtn);
      setStatus(`🏮 Vòng quay Cô Bảy: Nhấn quay 1 vé (còn ${liveTickets} vé 🎟️)...`);
      lastWheelActionAt = now;
      return true;
    }
    if (closeBtn && !closeBtn.disabled) {
      triggerPointerDownAndClick(closeBtn);
      setStatus('🏮 Đã quay hết vé lồng đèn Cô Bảy ➔ Đóng bảng quay lại câu cá!');
      lastWheelActionAt = now;
      return true;
    }
  }

  if (closeBtn && !closeBtn.disabled) {
    triggerPointerDownAndClick(closeBtn);
    setStatus('🏮 Đóng bảng vòng quay lồng đèn Cô Bảy');
    lastWheelActionAt = now;
  }
  return true;
}

export function handleBenAtmPanel(
  atmPanel: HTMLElement,
  _snap: GameSnapshot,
  _config: AppConfig,
  setStatus: (text: string) => void,
  delayMs: number
): boolean {
  const now = performance.now();
  if (now - lastAtmActionAt < Math.max(400, delayMs * 0.7)) {
    return true;
  }

  const isLoading = Boolean(atmPanel.querySelector('.ben-shop-hello')?.textContent?.includes('khởi động'));
  if (isLoading) {
    setStatus('🏧 Đang tải thông tin Cây ATM...');
    return true;
  }

  const allBtn = Array.from(atmPanel.querySelectorAll('.ben-atm-pick button.btn')).find((b) =>
    b.textContent?.includes('Hết')
  ) as HTMLButtonElement | null;
  const goBtn = atmPanel.querySelector('.btn-green.ben-atm-go') as HTMLButtonElement | null;
  const closeBtn = atmPanel.querySelector('.ben-panel-head button.btn-brown') as HTMLButtonElement | null;

  if (allBtn && !allBtn.disabled && !allBtn.classList.contains('on')) {
    lastAtmActionAt = now;
    triggerPointerDownAndClick(allBtn);
    return true;
  }

  if (goBtn && !goBtn.disabled && !goBtn.textContent?.includes('Giờ này nhận đủ rồi')) {
    lastAtmActionAt = now;
    triggerPointerDownAndClick(goBtn);
    setStatus('🏧 Đang bấm nút Rút tiền tại Cây ATM...');
    return true;
  }

  const isQuotaExhausted = Boolean(goBtn?.textContent?.includes('Giờ này nhận đủ rồi'));
  if (isQuotaExhausted || (goBtn && goBtn.disabled && allBtn?.classList.contains('on'))) {
    if (closeBtn && !closeBtn.disabled && now - lastAtmActionAt > 1500) {
      lastAtmActionAt = now;
      triggerPointerDownAndClick(closeBtn);
      return true;
    }
  }

  return true;
}

export function handleBenMilitiaModal(
  snap: GameSnapshot,
  config: AppConfig,
  setStatus: (text: string) => void,
  cachedPanel?: HTMLElement | null
): boolean {
  const militiaPanel =
    cachedPanel !== undefined
      ? cachedPanel
      : (document.querySelector('.panel.ben-panel.militia-check') as HTMLElement | null);
  const hasStoreCheck = Boolean(snap.benNet?.check);

  if (!militiaPanel && !hasStoreCheck) {
    militiaFirstSeenAt = 0;
    lastMilitiaClickAt = 0;
    militiaSolvingPromise = null;
    militiaSolvedResult = null;
    militiaSolvedTapResult = null;
    militiaSolvedDragResult = null;
    militiaOptions = [];
    militiaHasAlerted = false;
    return false;
  }

  const now = performance.now();

  // Play audio chime alert once on first appearance
  if (!militiaHasAlerted) {
    militiaHasAlerted = true;
    playMilitiaAlertBeep();
  }

  if (militiaFirstSeenAt === 0) {
    militiaFirstSeenAt = now;
  }

  const check = snap.benNet?.check;
  militiaCheckType = detectMilitiaCheckType(check?.type, militiaPanel?.textContent || '');

  // Calculate remaining time
  const totalMs = Number(check?.ms) || 120000;
  const expireAt = Number(check?.until) || Date.now() + totalMs;
  const remainingSec = Math.max(0, Math.ceil((expireAt - Date.now()) / 1000));
  const isCriticalTimeout = remainingSec <= 6;

  // -------------------------------------------------------------
  // BRANCH A: Tap-based captchas ('odd' | 'quiz' | 'tap')
  // -------------------------------------------------------------
  if (militiaCheckType === 'odd' || militiaCheckType === 'quiz' || militiaCheckType === 'tap') {
    // Check if already tapped/evaluating
    const hasMark = Boolean(militiaPanel?.querySelector('.militia-check-mark'));
    const leftText = militiaPanel?.querySelector('.militia-check-left')?.textContent || '';
    if (hasMark || leftText.includes('Đang chấm')) {
      setStatus('🪖 Dân quân kiểm tra: Đã chạm ô trả lời, đang chờ chấm kết quả...');
      return true;
    }

    // Trigger solver in background as soon as image element/base64 is present
    if (!militiaSolvedTapResult && !militiaSolvingPromise) {
      const imgEl = militiaPanel?.querySelector('img.militia-check-img') as HTMLImageElement | null;
      const imgSrc = imgEl?.src || (check?.img ? `data:image/png;base64,${check.img}` : '');
      if (imgSrc) {
        const solverPromise: Promise<MilitiaTapAnswerResolution> =
          militiaCheckType === 'odd'
            ? solveMilitiaOddImage(imgEl && imgEl.complete && imgEl.naturalWidth > 0 ? imgEl : imgSrc)
            : militiaCheckType === 'quiz'
              ? solveMilitiaQuizImage(
                  imgEl && imgEl.complete && imgEl.naturalWidth > 0 ? imgEl : imgSrc,
                  check?.ask || militiaPanel?.textContent || ''
                )
              : solveMilitiaTapImage(
                  imgEl && imgEl.complete && imgEl.naturalWidth > 0 ? imgEl : imgSrc,
                  parseMilitiaTarget(check?.ask, militiaPanel?.textContent || '')
                );

        militiaSolvingPromise = solverPromise
          .then((res) => {
            militiaSolvedTapResult = res;
            console.log(`[Militia] Solved ${militiaCheckType}:`, res);
            return res;
          })
          .catch((err) => {
            console.warn(`[Militia] ${militiaCheckType} solving failed:`, err);
            return null;
          });
      }
    }

    // If manual solving is configured, provide hint without auto-clicking
    if (config.benAutoMilitiaSolve === false) {
      const posStr =
        militiaSolvedTapResult?.row !== undefined
          ? ` [Hàng ${(militiaSolvedTapResult.row ?? 0) + 1}, Cột ${(militiaSolvedTapResult.col ?? 0) + 1}]`
          : '';
      setStatus(
        `🪖 Dân quân kiểm tra (${militiaCheckType}): Gợi ý:${posStr} (${militiaSolvedTapResult?.reason || '...'}). Chế độ thủ công: Bà con tự chạm nha! (còn ${remainingSec}s)`
      );
      return true;
    }

    // Natural deliberation delay
    const userDelaySec = Math.max(2, Math.min(60, Number(config.benMilitiaSolveDelaySec) || 10));
    const exactHumanDelay = userDelaySec * 1000;
    if (militiaSolvedTapResult && !isCriticalTimeout && now - militiaFirstSeenAt < exactHumanDelay) {
      const waitSec = Math.max(1, Math.ceil((militiaFirstSeenAt + exactHumanDelay - now) / 1000));
      const posStr =
        militiaSolvedTapResult.row !== undefined
          ? ` [Hàng ${(militiaSolvedTapResult.row ?? 0) + 1}, Cột ${(militiaSolvedTapResult.col ?? 0) + 1}]`
          : '';
      setStatus(
        `🪖 Dân quân kiểm tra (${militiaCheckType}): Phát hiện mục tiêu${posStr} (${militiaSolvedTapResult.reason}). Tự bấm sau ${waitSec}s... (còn ${remainingSec}s)`
      );
      return true;
    }

    // Still solving and not critical timeout yet
    if (!militiaSolvedTapResult && !isCriticalTimeout) {
      setStatus(`🪖 Dân quân kiểm tra (${militiaCheckType}): Đang phân tích ảnh... (còn ${remainingSec}s)`);
      return true;
    }

    // Perform tap click on img.militia-check-img
    const imgEl = militiaPanel?.querySelector('img.militia-check-img') as HTMLElement | null;
    if (imgEl && now - lastMilitiaClickAt > 1000) {
      const rect = imgEl.getBoundingClientRect();
      const normX = militiaSolvedTapResult?.normalizedX ?? 0.5;
      const normY = militiaSolvedTapResult?.normalizedY ?? 0.5;
      const clientX = rect.left + normX * rect.width;
      const clientY = rect.top + normY * rect.height;

      triggerPointerDownAt(imgEl, clientX, clientY);
      lastMilitiaClickAt = now;

      const desc =
        militiaSolvedTapResult?.row !== undefined
          ? `ô [Hàng ${(militiaSolvedTapResult.row ?? 0) + 1}, Cột ${(militiaSolvedTapResult.col ?? 0) + 1}] (${militiaSolvedTapResult.reason})`
          : 'vị trí mục tiêu';
      setStatus(`🪖 Dân quân kiểm tra: Đã chạm ${desc}!`);
      return true;
    }

    return true;
  }

  // -------------------------------------------------------------
  // BRANCH B: Slider Drag Puzzle ('drag')
  // -------------------------------------------------------------
  if (militiaCheckType === 'drag') {
    const hasMark = Boolean(militiaPanel?.querySelector('.militia-check-mark'));
    const leftText = militiaPanel?.querySelector('.militia-check-left')?.textContent || '';
    if (hasMark || leftText.includes('Đang chấm')) {
      setStatus('🪖 Dân quân kiểm tra: Đã kéo mảnh ghép, đang chờ chấm kết quả...');
      return true;
    }

    if (!militiaSolvedDragResult && !militiaSolvingPromise) {
      const imgEl = militiaPanel?.querySelector('img.militia-check-img') as HTMLImageElement | null;
      const imgSrc = imgEl?.src || (check?.img ? `data:image/png;base64,${check.img}` : '');
      if (imgSrc) {
        militiaSolvingPromise = solveMilitiaDragImage(
          imgEl && imgEl.complete && imgEl.naturalWidth > 0 ? imgEl : imgSrc,
          check?.pieceY
        )
          .then((res) => {
            militiaSolvedDragResult = res;
            console.log('[Militia] Solved drag slot:', res);
            return res;
          })
          .catch((err) => {
            console.warn('[Militia] Drag solving failed:', err);
            return null;
          });
      }
    }

    if (config.benAutoMilitiaSolve === false) {
      const normStr = militiaSolvedDragResult
        ? ` (x=${militiaSolvedDragResult.x}, y=${militiaSolvedDragResult.y})`
        : '';
      setStatus(
        `🪖 Dân quân kiểm tra (drag): Gợi ý: Kéo vào chỗ tối${normStr}. Chế độ thủ công: Bà con tự kéo nha! (còn ${remainingSec}s)`
      );
      return true;
    }

    const userDelaySec = Math.max(2, Math.min(60, Number(config.benMilitiaSolveDelaySec) || 10));
    const exactHumanDelay = userDelaySec * 1000;
    if (militiaSolvedDragResult && !isCriticalTimeout && now - militiaFirstSeenAt < exactHumanDelay) {
      const waitSec = Math.max(1, Math.ceil((militiaFirstSeenAt + exactHumanDelay - now) / 1000));
      setStatus(
        `🪖 Dân quân kiểm tra (drag): Đã định vị chỗ trống tối (x=${militiaSolvedDragResult.x}, y=${militiaSolvedDragResult.y}). Tự kéo sau ${waitSec}s... (còn ${remainingSec}s)`
      );
      return true;
    }

    if (!militiaSolvedDragResult && !isCriticalTimeout) {
      setStatus(`🪖 Dân quân kiểm tra (drag): Đang phân tích vị trí ô trống... (còn ${remainingSec}s)`);
      return true;
    }

    if (militiaSolvedDragResult && now - lastMilitiaClickAt > 1500) {
      lastMilitiaClickAt = now;
      const res = militiaSolvedDragResult;

      // 1. Try game store action if exposed
      const execGameAction = (window as unknown as { __EXEC_GAME_ACTION__?: (action: string, data?: unknown) => boolean }).__EXEC_GAME_ACTION__;
      if (typeof execGameAction === 'function') {
        const ok = execGameAction('BEN_CHECK_ANSWER', {
          x: res.x,
          y: res.y,
          path: res.path,
        });
        if (ok) {
          setStatus(`🪖 Dân quân kiểm tra (drag): Đã gửi tọa độ ghép (x=${res.x}, y=${res.y})!`);
          return true;
        }
      }

      // 2. Perform DOM drag sequence: find draggable piece element
      const pieceEl = (militiaPanel?.querySelector('.militia-check-piece') ||
        militiaPanel?.querySelector('.militia-piece') ||
        militiaPanel?.querySelector('.militia-check-left img') ||
        militiaPanel?.querySelector('img.militia-check-img')) as HTMLElement | null;

      const imgEl = militiaPanel?.querySelector('img.militia-check-img') as HTMLElement | null;
      if (pieceEl && imgEl) {
        const imgRect = imgEl.getBoundingClientRect();
        const startClientX = imgRect.left + 25;
        const startClientY = imgRect.top + res.normalizedY * imgRect.height;
        const targetClientX = imgRect.left + res.normalizedX * imgRect.width;
        const targetClientY = imgRect.top + res.normalizedY * imgRect.height;

        pieceEl.dispatchEvent(
          new PointerEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            clientX: startClientX,
            clientY: startClientY,
            pointerId: 1,
            isPrimary: true,
          })
        );

        for (const pt of res.path) {
          const stepT = pt[0];
          setTimeout(() => {
            const stepX = imgRect.left + (pt[1] / imgEl.offsetWidth) * imgRect.width;
            const stepY = imgRect.top + (pt[2] / imgEl.offsetHeight) * imgRect.height;
            window.dispatchEvent(
              new PointerEvent('pointermove', {
                bubbles: true,
                cancelable: true,
                clientX: stepX,
                clientY: stepY,
                pointerId: 1,
                isPrimary: true,
              })
            );
          }, stepT);
        }

        const lastStepMs = res.path[res.path.length - 1]?.[0] || 500;
        setTimeout(() => {
          window.dispatchEvent(
            new PointerEvent('pointerup', {
              bubbles: true,
              cancelable: true,
              clientX: targetClientX,
              clientY: targetClientY,
              pointerId: 1,
              isPrimary: true,
            })
          );
        }, lastStepMs + 30);

        setStatus(`🪖 Dân quân kiểm tra: Đã kéo thả mảnh ghép vào ô trống tối (x=${res.x}, y=${res.y})!`);
        return true;
      }
    }

    return true;
  }

  // -------------------------------------------------------------
  // BRANCH C: Classic Count Captcha ('count')
  // -------------------------------------------------------------
  militiaTargetKind = parseMilitiaTarget(check?.ask, militiaPanel?.textContent || '');
  const kindLabel = MILITIA_KIND_LABELS[militiaTargetKind] || 'con vật';

  // Read options from store or DOM
  if (Array.isArray(check?.options) && check.options.length > 0) {
    militiaOptions = check.options;
  } else if (militiaPanel) {
    const btns = Array.from(militiaPanel.querySelectorAll('.militia-check-options button'));
    if (btns.length > 0) {
      militiaOptions = btns.map((b) => Number((b.textContent || '').trim())).filter((n) => !Number.isNaN(n));
    }
  }

  // Trigger image recognition in background as soon as image or base64 is available
  if (!militiaSolvedResult && !militiaSolvingPromise) {
    const imgEl = militiaPanel?.querySelector('img.militia-check-img') as HTMLImageElement | null;
    const imgSrc = imgEl?.src || (check?.img ? `data:image/png;base64,${check.img}` : '');
    if (imgSrc) {
      militiaSolvingPromise = classifyMilitiaImage(
        imgEl && imgEl.complete && imgEl.naturalWidth > 0 ? imgEl : imgSrc
      )
        .then((res) => {
          militiaSolvedResult = res;
          (window as unknown as { __LAST_MILITIA_CAPTCHA__?: unknown }).__LAST_MILITIA_CAPTCHA__ = {
            ask: militiaTargetKind,
            options: militiaOptions,
            counts: res,
            img: imgSrc,
            timestamp: Date.now(),
          };
          console.log('[Militia] Recognition result:', res, 'Target:', militiaTargetKind, 'Options:', militiaOptions);
          return res;
        })
        .catch((err) => {
          console.warn('[Militia] Image classification failed:', err);
          return null;
        });
    }
  }

  // Check if option button is already selected or game is evaluating
  const optionBtns = militiaPanel
    ? (Array.from(militiaPanel.querySelectorAll('.militia-check-options button')) as HTMLButtonElement[])
    : [];
  const isAlreadySelected = optionBtns.some((btn) => btn.classList.contains('on') || btn.disabled);
  const leftText = militiaPanel?.querySelector('.militia-check-left')?.textContent || '';
  if (isAlreadySelected || leftText.includes('Đang chấm')) {
    setStatus('🪖 Dân quân kiểm tra: Đã chọn đáp án, đang chờ chấm kết quả...');
    return true;
  }

  // Resolve best answer candidates
  let resolvedCount: number | null = null;
  let targetIndex: number | null = null;
  let targetValue: number | null = null;
  let isExactMatch = false;
  let resolutionType = 'recognize';

  // 1. Check if server leaked answer in raw store check
  const leakedAns =
    typeof check?.ans === 'number'
      ? check.ans
      : typeof check?.count === 'number'
        ? check.count
        : typeof check?.solution === 'number'
          ? check.solution
          : typeof check?.correct === 'number'
            ? check.correct
            : typeof check?.pick === 'number'
              ? check.pick
              : null;

  if (leakedAns !== null) {
    if (militiaOptions.includes(leakedAns)) {
      targetValue = leakedAns;
      targetIndex = militiaOptions.indexOf(leakedAns);
      isExactMatch = true;
    } else if (leakedAns >= 0 && leakedAns < militiaOptions.length) {
      targetIndex = leakedAns;
      targetValue = militiaOptions[leakedAns];
      isExactMatch = true;
    }
    resolvedCount = targetValue ?? leakedAns;
    resolutionType = 'leaked';
  }

  // 2. Otherwise use image classification result
  if (targetIndex === null && militiaSolvedResult) {
    const resolution = resolveMilitiaAnswer(militiaTargetKind, militiaSolvedResult, militiaOptions);
    resolvedCount = resolution.count;
    targetIndex = resolution.optionIndex;
    targetValue = resolution.optionValue;
    isExactMatch = resolution.confidence === 'exact';
    resolutionType = resolution.confidence;
  }

  // 3. Fallback to DOM text spans if legacy format
  if (targetIndex === null) {
    const spans = militiaPanel ? Array.from(militiaPanel.querySelectorAll('.militia-check-row span')) : [];
    if (spans.length > 0) {
      const domCount = spans.filter((s) => (s.textContent || '').includes('🐟')).length;
      const fallbackIdx = militiaOptions.indexOf(domCount);
      if (fallbackIdx !== -1) {
        targetIndex = fallbackIdx;
        targetValue = domCount;
        resolvedCount = domCount;
        isExactMatch = true;
        resolutionType = 'legacy-span';
      }
    }
  }

  // If manual solving is configured, only alert & provide guess without auto-clicking
  if (config.benAutoMilitiaSolve === false) {
    const guessStr = targetValue !== null ? ` (Gợi ý: "${targetValue}")` : '';
    setStatus(
      `🪖 Dân quân kiểm tra: Phát hiện ${resolvedCount ?? '?'} ${kindLabel}${guessStr}. Chế độ thủ công: Bà con tự chọn đáp án nha! (còn ${remainingSec}s)`
    );
    return true;
  }

  // Natural deliberation delay (customizable, default 10s, max 60s) when exact match is found
  const userDelaySec = Math.max(2, Math.min(60, Number(config.benMilitiaSolveDelaySec) || 10));
  const exactHumanDelay = userDelaySec * 1000;
  if (isExactMatch && !isCriticalTimeout && now - militiaFirstSeenAt < exactHumanDelay) {
    const waitSec = Math.max(1, Math.ceil((militiaFirstSeenAt + exactHumanDelay - now) / 1000));
    setStatus(
      `🪖 Dân quân kiểm tra: Đếm được ${resolvedCount} ${kindLabel} (khớp đáp án "${targetValue}"). Tự bấm sau ${waitSec}s (Bà con có thể bấm trước)... (còn ${remainingSec}s)`
    );
    return true;
  }

  // If answer is NOT exact, DO NOT rush! Let the user click manually if present.
  // Only auto-click closest option when time is running out (remainingSec <= 6)
  if (!isExactMatch && !isCriticalTimeout) {
    const optsStr = militiaOptions.length > 0 ? militiaOptions.join(', ') : '...';
    setStatus(
      `🪖 Dân quân kiểm tra: Đang đếm ${kindLabel} (phát hiện ${resolvedCount ?? '?'} - các đáp án [${optsStr}]). Chờ bạn chọn hoặc auto bấm lúc còn 6s! (còn ${remainingSec}s)`
    );
    return true;
  }

  // Emergency fallback when timeout is critical (<= 6s) and still no target index
  if (targetIndex === null && isCriticalTimeout) {
    targetIndex = Math.min(1, optionBtns.length - 1);
    const domNum = Number(optionBtns[targetIndex]?.textContent?.trim());
    targetValue = militiaOptions[targetIndex] ?? (Number.isNaN(domNum) ? 0 : domNum);
    resolvedCount = targetValue;
    resolutionType = 'emergency-fallback';
  }

  // Perform click on the chosen option button
  if (now - lastMilitiaClickAt > 1000 && optionBtns.length > 0) {
    if (targetIndex !== null && targetIndex >= 0 && targetIndex < optionBtns.length) {
      const targetBtn = optionBtns[targetIndex];
      if (targetBtn && !targetBtn.disabled) {
        triggerPointerDownAndClick(targetBtn);
        lastMilitiaClickAt = now;
        setStatus(
          `🪖 Dân quân kiểm tra: Phát hiện ${resolvedCount ?? targetValue} ${kindLabel} ➔ Đã bấm chọn đáp án "${targetValue}"! (${resolutionType})`
        );
        return true;
      }
    }

    if (targetValue !== null) {
      const matchBtn = optionBtns.find((b) => (b.textContent || '').trim() === String(targetValue) && !b.disabled);
      if (matchBtn) {
        triggerPointerDownAndClick(matchBtn);
        lastMilitiaClickAt = now;
        setStatus(
          `🪖 Dân quân kiểm tra: Phát hiện ${resolvedCount ?? targetValue} ${kindLabel} ➔ Đã bấm chọn đáp án "${targetValue}"!`
        );
        return true;
      }
    }
  }

  return true;
}

export function handleBenOverlayModals(
  snap: GameSnapshot,
  config: AppConfig,
  setStatus: (text: string) => void,
  delayMs: number
): boolean {
  const now = performance.now();

  // 0. Militia Check Modal ("🪖 Dân quân kiểm tra!")
  if (handleBenMilitiaModal(snap, config, setStatus)) {
    return true;
  }

  // 1. Gift Modal
  const giftBtn = document.querySelector('.ben-gift-card button.btn-green') as HTMLButtonElement | null;
  if (giftBtn && isVisible(giftBtn) && now - lastModalClickAt > 500) {
    triggerPointerDownAndClick(giftBtn);
    lastModalClickAt = now;
    return true;
  }

  // 2. Lantern Wheel Modal (.ben-wheel)
  const wheelEl = document.querySelector('.ben-wheel') as HTMLElement | null;
  if (wheelEl && isVisible(wheelEl)) {
    handleBenLanternWheel(wheelEl, snap, config, setStatus, delayMs);
    return true;
  }

  // 3. ATM Modal (.panel.ben-panel.ben-atm)
  const atmPanel = document.querySelector('.panel.ben-panel.ben-shop.ben-atm') as HTMLElement | null;
  if (atmPanel && isVisible(atmPanel)) {
    handleBenAtmPanel(atmPanel, snap, config, setStatus, delayMs);
    return true;
  }

  // 4. Caught Cricket Modal (.panel.ben-cr-caught)
  const caughtCard = document.querySelector('.panel.ben-cr-caught') as HTMLElement | null;
  if (caughtCard && isVisible(caughtCard) && now - lastCricketCatchAt > 600) {
    const cName = caughtCard.querySelector('h3')?.textContent?.trim() || 'Dế';
    const cRarity = caughtCard.querySelector('.ben-cr-rarity')?.textContent?.trim() || '';
    const isNew = Boolean(caughtCard.querySelector('.ben-cr-new'));
    const tubeBtn = caughtCard.querySelector('.ben-bye-actions button.btn-green') as HTMLButtonElement | null;
    const releaseBtn = caughtCard.querySelector('.ben-bye-actions button.btn-brown') as HTMLButtonElement | null;

    if (tubeBtn && !tubeBtn.disabled) {
      triggerPointerDownAndClick(tubeBtn);
      setStatus(`🦗 Bắt được ${cName} (${cRarity})${isNew ? ' ✨ Loài mới trong sổ!' : ''} -> Đã bỏ vô ống tre!`);
    } else if (releaseBtn && !releaseBtn.disabled) {
      triggerPointerDownAndClick(releaseBtn);
      setStatus(`🦗 Bắt được ${cName} (${cRarity}) -> Đã thả về đồng lấy vỏ sò 🐚`);
    }
    lastCricketCatchAt = now;
    return true;
  }

  // 5. Cricket Arena Bout Modal (.panel.ben-bout)
  const boutPanel = document.querySelector('.panel.ben-bout') as HTMLElement | null;
  if (boutPanel && isVisible(boutPanel)) {
    const endLine = boutPanel.querySelector('.ben-bout-line.end');
    const closeBtn = boutPanel.querySelector('.ben-panel-head button.btn-brown') as HTMLButtonElement | null;

    if (endLine) {
      if (closeBtn && !closeBtn.disabled && now - lastBoutCloseAt > 1500) {
        const lineText = endLine.textContent?.trim() || 'Trận đấu kết thúc';
        triggerPointerDownAndClick(closeBtn);
        setStatus(`🥊 Sới Dế: ${lineText} -> Đóng bảng đấu`);
        lastBoutCloseAt = now;
      }
      return true;
    }

    const tickleBtn = boutPanel.querySelector('button.ben-bout-tickle') as HTMLButtonElement | null;
    if (tickleBtn) {
      const left = tickleBtn.textContent?.match(/còn\s*(\d+)/)?.[1] ?? '?';
      setStatus(`🥊 Sới Dế: Đang thi đấu${config.benAutoTickle ? ' · tự khều râu đúng nhịp' : ''} (còn ${left} lần khều)`);
      return true;
    }
  }

  return false;
}
