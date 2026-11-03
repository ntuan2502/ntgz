import { AppConfig } from '../../shared/types/config';
import { GameSnapshot } from '../../shared/types/game-state';
import { execGameAction } from '../bridge/content-bridge';
import { isVisible, triggerPointerDownAndClick } from './dom-helpers';
import {
  classifyMilitiaImage,
  MILITIA_KIND_LABELS,
  MilitiaAskKind,
  MilitiaClassificationResult,
  parseMilitiaTarget,
  playMilitiaAlertBeep,
  resolveMilitiaAnswer,
} from './militia-solver';

let lastModalClickAt = 0;
let lastWheelActionAt = 0;
let lastAtmActionAt = 0;
let lastCricketCatchAt = 0;
let lastBoutCloseAt = 0;
let militiaFirstSeenAt = 0;
let lastMilitiaClickAt = 0;
let militiaSolvingPromise: Promise<MilitiaClassificationResult | null> | null = null;
let militiaSolvedResult: MilitiaClassificationResult | null = null;
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
  if (now - lastModalClickAt <= Math.max(350, delayMs * 0.7)) {
    return { handled: true };
  }

  const card = document.querySelector('.catch-card.ben-catch') as HTMLElement | null;
  if (!card) {
    if (bn?.fishing === 'landing' || bn?.landed) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', bubbles: true }));
      void execGameAction('BEN_DISMISS_CATCH', { config });
    }
    return { handled: true };
  }

  const landed = bn?.landed as {
    id?: string;
    fish?: string;
    rarity?: string;
    price?: number;
    size?: number;
    odd?: boolean;
    rainbow?: boolean;
    [key: string]: unknown;
  } | null | undefined;

  let rawRarity = (landed?.rarity || '').toLowerCase();
  if (!rawRarity) {
    if (card.classList.contains('mythic')) {
      rawRarity = 'mythic';
    } else {
      const h3Next = card.querySelector('h3')?.nextElementSibling?.textContent?.trim()?.toLowerCase() || '';
      if (h3Next.includes('thần thoại')) rawRarity = 'mythic';
      else if (h3Next.includes('huyền thoại')) rawRarity = 'legendary';
      else if (h3Next.includes('rất hiếm') || h3Next.includes('quý')) rawRarity = 'epic';
      else if (h3Next.includes('hiếm')) rawRarity = 'rare';
      else if (h3Next.includes('hơi hiếm')) rawRarity = 'uncommon';
      else if (h3Next.includes('thường')) rawRarity = 'common';
    }
  }
  if (rawRarity === 'myth') rawRarity = 'mythic';
  if (rawRarity === 'legend') rawRarity = 'legendary';

  const isRainbow = Boolean(landed?.rainbow || card.querySelector('.catch-tag.rainbow'));
  const isOdd = Boolean(landed?.odd || card.querySelector('.catch-tag.odd'));

  const allowedRarities = Array.isArray(config.benKeepRarities)
    ? config.benKeepRarities
    : ['mythic', 'legendary', 'rainbow', 'odd'];

  const shouldKeep =
    Boolean(config.benAutoKeepRare) &&
    ((isRainbow && allowedRarities.includes('rainbow')) ||
      (isOdd && allowedRarities.includes('odd')) ||
      allowedRarities.includes(rawRarity));

  const keepBtn = card.querySelector('.ben-catch-btns button.btn-yellow') as HTMLButtonElement | null;
  const bagBtn = card.querySelector('.ben-catch-btns button.btn-green') as HTMLButtonElement | null;

  let shouldKeepFinal = shouldKeep;
  let oldKeptIdToUnkeep: string | null = null;
  let duplicateNote = '';

  if (shouldKeep && config.benAutoSellDuplicateKept !== false && Array.isArray(bn?.basket)) {
    const fishSpecies = landed?.fish || card.querySelector('h3')?.textContent?.trim() || '';
    const fishPrice =
      Number(landed?.price) ||
      (() => {
        const priceText = card.querySelector('.ben-catch-price')?.textContent || '';
        const m = priceText.match(/([\d.,]+)\s*vỏ sò/i);
        return m ? Number(m[1].replace(/[.,]/g, '')) : 0;
      })();

    const existingKept = bn.basket.filter(
      (f: { kept?: boolean; fish?: string; name?: string; price?: number; id?: string }) =>
        Boolean(f.kept) && (f.fish === fishSpecies || f.name === fishSpecies)
    );

    if (existingKept.length > 0) {
      existingKept.sort(
        (a: { price?: number }, b: { price?: number }) => (Number(b.price) || 0) - (Number(a.price) || 0)
      );
      const bestOld = existingKept[0];
      const bestOldPrice = Number(bestOld.price) || 0;

      if (fishPrice > bestOldPrice) {
        shouldKeepFinal = true;
        oldKeptIdToUnkeep = bestOld.id || null;
        duplicateNote = ` (Đắt hơn con ${bestOldPrice.toLocaleString('vi-VN')}🐚 cũ, bỏ giữ con cũ để bán)`;
      } else {
        shouldKeepFinal = false;
        duplicateNote = ` (Trùng loại, rẻ hơn con đã giữ ${bestOldPrice.toLocaleString('vi-VN')}🐚 -> Bỏ vô giỏ để bán)`;
      }
    }
  }

  if (shouldKeepFinal && keepBtn && !keepBtn.disabled) {
    const msg = `${formatBenCatchSummary(card, true)}${duplicateNote}`;
    triggerPointerDownAndClick(keepBtn);
    setStatus(msg);
    if (oldKeptIdToUnkeep) {
      void execGameAction('BEN_KEEP_FISH', { id: oldKeptIdToUnkeep, on: false });
    }
    void execGameAction('BEN_DISMISS_CATCH', { config });
  } else if (bagBtn) {
    const msg = `${formatBenCatchSummary(card, false)}${duplicateNote}`;
    triggerPointerDownAndClick(bagBtn);
    setStatus(msg);
    void execGameAction('BEN_DISMISS_CATCH', { config });
  } else {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', code: 'KeyZ', bubbles: true }));
    void execGameAction('BEN_DISMISS_CATCH', { config });
  }
  lastModalClickAt = now;
  onCatchIncrement();

  if (config.benHumanJitter !== false) {
    const microBreakMs = Math.random() < 0.06 ? Math.floor(Math.random() * 2500) + 3000 : 0;
    const nextCastDelayMs = delayMs + Math.floor(Math.random() * 700) + 150;
    return { handled: true, microBreakMs, nextCastDelayMs };
  }

  return { handled: true, nextCastDelayMs: delayMs };
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
  setStatus: (text: string) => void
): boolean {
  const militiaPanel = document.querySelector('.panel.ben-panel.militia-check') as HTMLElement | null;
  const hasStoreCheck = Boolean(snap.benNet?.check);

  if (!militiaPanel && !hasStoreCheck) {
    militiaFirstSeenAt = 0;
    lastMilitiaClickAt = 0;
    militiaSolvingPromise = null;
    militiaSolvedResult = null;
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

  // Parse target creature and options
  const check = snap.benNet?.check;
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

  // Calculate remaining time
  const totalMs = Number(check?.ms) || 120000;
  const expireAt = Number(check?.until) || Date.now() + totalMs;
  const remainingSec = Math.max(0, Math.ceil((expireAt - Date.now()) / 1000));
  const isCriticalTimeout = remainingSec <= 6;

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

  // Natural deliberation delay (customizable, default 5s) when exact match is found
  const userDelaySec = Math.max(2, Math.min(30, Number(config.benMilitiaSolveDelaySec) || 5));
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
