import { AppConfig } from '../../shared/types/config';
import { GameSnapshot } from '../../shared/types/game-state';
import { execGameAction } from '../bridge/content-bridge';
import { isVisible, triggerPointerDownAndClick, triggerPointerDownOnly, sleep } from './dom-helpers';
import { handleFightMinigame } from './minigame';

let lastModalClickAt = 0;
let lastHookAt = 0;
let lastCastAt = 0;
let lastWheelActionAt = 0;
let lastAtmActionAt = 0;
let lastCricketCatchAt = 0;
let lastBoutCloseAt = 0;
let lastCricketEventSeq = -1;
let lastGotAwaySeq = -1;

function handleBenLanternWheel(
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

  // A. Spin Result Modal (.ben-wheel-card.result) -> Log what was won & click confirm ("Nhận" / "Chọn món mới")
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

  // B. Pick 3 Items Modal (.ben-wheel-card:not(.result)) -> Auto pick items & click "Lên vòng"
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

  // If spinOneBtn is disabled, the wheel is currently spinning (3.1s animation) or loading wheel data
  if (!spinOneBtn || spinOneBtn.disabled) {
    setStatus('🏮 Vòng quay lồng đèn Cô Bảy đang quay... chờ kết quả!');
    return true;
  }

  // Read live ticket & shell counts from the wheel header chip ("🎟️ X · 🐚 Y") or snapshot fallback
  const chipText = wheelEl.querySelector('.ben-wheel-top .ben-chip')?.textContent || '';
  const ticketMatch = chipText.match(/🎟️\s*(\d+)/);
  const liveTickets = ticketMatch ? Number(ticketMatch[1]) : (snap.benNet?.wallet?.tickets ?? 0);

  const boughtMatch = (buyTicketBtn?.textContent || '').match(/\((\d+)\/5\)/);
  const boughtCount = boughtMatch ? Number(boughtMatch[1]) : (snap.benNet?.wheel?.bought ?? 0);
  const shells = snap.benNet?.wallet?.shells ?? 0;

  // 1. Ưu tiên mua hết 5 vé hàng ngày trước
  if (config.benBuyLanternTicket && boughtCount < 5 && shells >= 600 && buyTicketBtn && !buyTicketBtn.disabled) {
    triggerPointerDownAndClick(buyTicketBtn);
    setStatus(`🎟️ Mua vé Vòng quay lồng đèn Cô Bảy (${boughtCount + 1}/5 · -600 vỏ sò 🐚)`);
    lastWheelActionAt = now;
    return true;
  }

  // 2. Sau khi đã mua hết vé hàng ngày (hoặc không đủ điều kiện mua tiếp), tiến hành quay
  const wantMulti = config.benLanternSpinMode === 'x10';
  if (wantMulti) {
    if (liveTickets >= 10 && spinMultiBtn && !spinMultiBtn.disabled) {
      triggerPointerDownAndClick(spinMultiBtn);
      setStatus(`🏮 Vòng quay Cô Bảy: Nhấn quay x10 (còn ${liveTickets} vé 🎟️)...`);
      lastWheelActionAt = now;
      return true;
    }
    // Chưa đủ 10 vé để quay x10 -> Đóng bảng quay lại làm việc khác, tích lũy vé
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
    // Chế độ quay x1: quay từng vé một cho đến khi hết
    if (liveTickets > 0 && spinOneBtn && !spinOneBtn.disabled) {
      triggerPointerDownAndClick(spinOneBtn);
      setStatus(`🏮 Vòng quay Cô Bảy: Nhấn quay 1 vé (còn ${liveTickets} vé 🎟️)...`);
      lastWheelActionAt = now;
      return true;
    }
    // Đã hết vé -> Đóng bảng quay
    if (closeBtn && !closeBtn.disabled) {
      triggerPointerDownAndClick(closeBtn);
      setStatus('🏮 Đã quay hết vé lồng đèn Cô Bảy ➔ Đóng bảng quay lại câu cá!');
      lastWheelActionAt = now;
      return true;
    }
  }

  // All tickets have been spun or modal should close
  if (closeBtn && !closeBtn.disabled) {
    triggerPointerDownAndClick(closeBtn);
    setStatus('🏮 Đóng bảng vòng quay lồng đèn Cô Bảy');
    lastWheelActionAt = now;
  }
  return true;
}

function handleBenAtmPanel(
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

  const goBtn = atmPanel.querySelector('.btn-green.ben-atm-go') as HTMLButtonElement | null;
  const closeBtn = atmPanel.querySelector('.ben-panel-head button.btn-brown') as HTMLButtonElement | null;

  if (goBtn && !goBtn.disabled) {
    lastAtmActionAt = now;
    triggerPointerDownAndClick(goBtn);
    setStatus('🏧 Đang bấm nút Rút tiền tại Cây ATM...');
    return true;
  }

  if (closeBtn && !closeBtn.disabled) {
    lastAtmActionAt = now;
    triggerPointerDownAndClick(closeBtn);
    return true;
  }

  return true;
}

function formatBenCatchSummary(card: HTMLElement, kept: boolean): string {
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

export async function stepBenDoFishing(
  snap: GameSnapshot,
  config: AppConfig,
  setStatus: (text: string) => void,
  onCatchIncrement: () => void
): Promise<{ finishedArea: boolean; exhausted?: boolean }> {
  const delayMs = Math.max(150, Number(config.taskDelayMs) || 650);

  if (snap.screen !== 'benDo') {
    setStatus('🛶 Đang đi ra Bến Đò...');
    await execGameAction('NAVIGATE', { target: 'benDo' });
    await sleep(delayMs + 400);
    return { finishedArea: false };
  }

  const bn = snap.benNet;
  const bu = snap.benUI;
  if (!bn || bn.status !== 'in') {
    setStatus('⏳ Đang kết nối máy chủ Bến Đò...');
    return { finishedArea: false };
  }

  // Keep the page-hook cricket watchers (trap / tickle / bet timing) alive
  void execGameAction('BEN_WATCH', { config });

  // 0. Live status updates from page-hook cricket watchers (trapping / misses / tickles)
  const crEvents = snap.benNet?.cricketEvents;
  if (Array.isArray(crEvents) && crEvents.length > 0) {
    const latest = crEvents[crEvents.length - 1];
    if (latest && latest.seq > lastCricketEventSeq) {
      lastCricketEventSeq = latest.seq;
      setStatus(latest.text);
    }
  }

  // Handle hunt gotAway notice (empty bush / escaped)
  const gotAway = snap.benNet?.gotAway;
  if (gotAway && typeof gotAway.seq === 'number' && gotAway.seq !== lastGotAwaySeq) {
    lastGotAwaySeq = gotAway.seq;
    if (gotAway.why === 'none') {
      setStatus('🔦 Khu vực này im re không nghe dế gáy -> Di chuyển sang vị trí khác trong khu vực rọi tiếp...');
    } else if (gotAway.why === 'escaped') {
      setStatus('🦗 Dế đã nhảy mất vào bóng đêm!');
    }
  }

  // 1. Handle Fight Minigame
  if (bn.fishing === 'fight' || document.querySelector('.ben-fight')) {
    handleFightMinigame(snap, setStatus);
    return { finishedArea: false };
  }

  const now = performance.now();

  // 2. Handle Catch Result Modal
  if (bn.fishing === 'landing' || document.querySelector('.catch-card.ben-catch')) {
    if (now - lastModalClickAt > Math.max(350, delayMs * 0.7)) {
      const card = document.querySelector('.catch-card.ben-catch') as HTMLElement | null;
      if (card) {
        const landed = bn.landed as {
          id?: string;
          fish?: string;
          rarity?: string;
          price?: number;
          size?: number;
          odd?: boolean;
          rainbow?: boolean;
          [key: string]: unknown;
        } | null | undefined;

        // 1. Determine rarity and special flags
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

        // 2. Duplicate kept fish resolution: prioritize keeping higher-priced fish
        let shouldKeepFinal = shouldKeep;
        let oldKeptIdToUnkeep: string | null = null;
        let duplicateNote = '';

        if (shouldKeep && config.benAutoSellDuplicateKept !== false && Array.isArray(bn.basket)) {
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
            execGameAction('BEN_KEEP_FISH', { id: oldKeptIdToUnkeep, on: false });
          }
        } else if (bagBtn) {
          const msg = `${formatBenCatchSummary(card, false)}${duplicateNote}`;
          triggerPointerDownAndClick(bagBtn);
          setStatus(msg);
        }
        lastModalClickAt = now;
        onCatchIncrement();
      }
    }
    return { finishedArea: false };
  }

  // 3. Handle Gift Modal
  const giftBtn = document.querySelector('.ben-gift-card button.btn-green') as HTMLButtonElement | null;
  if (giftBtn && isVisible(giftBtn) && now - lastModalClickAt > 500) {
    triggerPointerDownAndClick(giftBtn);
    lastModalClickAt = now;
    return { finishedArea: false };
  }

  // 3b. Handle Lantern Wheel Modal (.ben-wheel) interactively: spin -> log result -> click confirm -> spin next
  const wheelEl = document.querySelector('.ben-wheel') as HTMLElement | null;
  if (wheelEl && isVisible(wheelEl)) {
    handleBenLanternWheel(wheelEl, snap, config, setStatus, delayMs);
    return { finishedArea: false };
  }

  // 3b-2. Handle ATM Modal (.panel.ben-panel.ben-atm)
  const atmPanel = document.querySelector('.panel.ben-panel.ben-shop.ben-atm') as HTMLElement | null;
  if (atmPanel && isVisible(atmPanel)) {
    handleBenAtmPanel(atmPanel, snap, config, setStatus, delayMs);
    return { finishedArea: false };
  }

  // 3c. Handle Caught Cricket Modal (.panel.ben-cr-caught)
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
    return { finishedArea: false };
  }

  // 3d. Handle Cricket Arena Bout Modal (.panel.ben-bout). Tickles are timed by the page-hook watcher.
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
      return { finishedArea: false };
    }

    const tickleBtn = boutPanel.querySelector('button.ben-bout-tickle') as HTMLButtonElement | null;
    if (tickleBtn) {
      const left = tickleBtn.textContent?.match(/còn\s*(\d+)/)?.[1] ?? '?';
      setStatus(`🥊 Sới Dế: Đang thi đấu${config.benAutoTickle ? ' · tự khều râu đúng nhịp' : ''} (còn ${left} lần khều)`);
      return { finishedArea: false };
    }
  }

  // 3e. Cricket hunt in progress: the page-hook watcher traps at the right moment
  if (bn.hunt) {
    const hop = bn.hunt.phase === 'hop' ? bn.hunt.hop : undefined;
    setStatus(
      hop
        ? `🦗 Dế đang nhảy (còn ${hop.left} lần) -> Canh bụi cỏ ${hop.spot + 1} để úp...`
        : bn.hunt.rarity
          ? '🦗 Nghe tiếng dế gáy, đang chờ nó nhảy ra...'
          : '🔦 Đang rọi đèn nghe ngóng tiếng dế gáy...'
    );
    return { finishedArea: false };
  }

  // 4. Handle Bite ("GIẬT!")
  const benBobberBite = document.querySelector('span.ben-bobber.bite');
  if (bn.fishing === 'bite' || (benBobberBite && isVisible(benBobberBite))) {
    if (now - lastHookAt > 260) {
      const pullBtn = document.querySelector('button.ben-cast.btn-brown') as HTMLButtonElement | null;
      if (pullBtn && isVisible(pullBtn)) {
        triggerPointerDownOnly(pullBtn);
      } else {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
      }
      lastHookAt = now;
      setStatus('🎣 Bến Đò: Cá cắn câu -> GIẬT!');
    }
    return { finishedArea: false };
  }

  // 5. Waiting for fish
  if (bn.fishing === 'wait' || bn.fishing === 'nibble' || bn.fishing === 'casting') {
    setStatus(
      bn.fishing === 'nibble'
        ? '🐟 Cá đang rỉa mồi... đợi phao chìm hẳn!'
        : '🌊 Đang canh phao ở Bến Đò...'
    );
    return { finishedArea: false };
  }

  // 6. Walking
  if (bu?.walking) {
    setStatus('🚶 Đang đi bộ ở Bến Đò...');
    return { finishedArea: false };
  }

  // 7. Idle phase
  if (bn.fishing === 'idle') {
    const prep = await execGameAction('BEN_STEP', { config });
    if (prep && prep.ok && prep.acted) {
      setStatus(prep.msg || '🛶 Đang chuẩn bị tại Bến Đò...');
      await sleep(delayMs);
      return { finishedArea: false };
    }

    if (prep && prep.exhausted) {
      const reasonMsg = typeof prep.reason === 'string' ? prep.reason : '🛶 Bến Đò: Đã hết Sức câu / mồi -> Chuyển sang khu vực tiếp theo!';
      setStatus(reasonMsg);
      return { finishedArea: true, exhausted: true };
    }

    const liveStam = bn.wallet?.liveStamina ?? 100;
    const castBtn = document.querySelector(
      'button.ben-cast.btn-green:not(.ben-light), button.ben-cast.btn-yellow'
    ) as HTMLButtonElement | null;
    const btnText = (castBtn?.textContent || '').trim();

    if (!config.benAutoRecoverStamina && (liveStam < 4 || btnText.includes('Đuối sức'))) {
      setStatus('😮‍💨 Bến Đò: Hết thể lực không câu được nữa -> Chuyển khu vực tiếp theo!');
      return { finishedArea: true, exhausted: true };
    }

    if (!config.benAutoBuyBait && ((bn.wallet?.bait || 0) <= 0 || btnText.includes('Hết mồi'))) {
      setStatus('🪱 Bến Đò: Đã hết mồi câu -> Chuyển khu vực tiếp theo!');
      return { finishedArea: true, exhausted: true };
    }

    const greenCastBtn = document.querySelector('button.ben-cast.btn-green:not(.ben-light)') as HTMLButtonElement | null;
    const allowCast = Boolean(prep?.ok && prep.allowCast);
    if (
      allowCast &&
      greenCastBtn &&
      isVisible(greenCastBtn) &&
      !greenCastBtn.disabled &&
      now - lastCastAt > Math.max(600, delayMs)
    ) {
      triggerPointerDownAndClick(greenCastBtn);
      lastCastAt = now;
      setStatus(`🎣 Bến Đò: Quăng câu (🪱 ${bn.wallet?.bait ?? 0} · ⚡ ${bn.wallet?.liveStamina ?? 0})`);
    } else if (allowCast && !bu?.spot) {
      setStatus('📍 Hãy đứng sát mép nước (hoặc bật Tự ra vị trí câu)');
    } else if (!allowCast) {
      setStatus('✅ Bến Đò: Đã xong các việc được bật (đang canh tự động...)');
    }
  }

  return { finishedArea: false };
}
