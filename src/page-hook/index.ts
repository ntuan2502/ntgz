import { stores, discoverStores, sendBenWs } from './core/engine-access';
import { getSnapshot } from './core/store-watcher';
import { dismissInterruptsIfNeeded } from './core/interrupts';
import { execFarmSubAreaStep } from './modules/farm';
import { execSeaStep } from './modules/sea';
import { execBenStep, refreshCricketWatchers } from './modules/wharf';
import { execFarmstayStep } from './modules/farmstay';
import { AppConfig, FarmSubAreaId } from '../shared/types/config';

interface GameActionPayload {
  target?: string;
  indoors?: boolean;
  subAreaId?: FarmSubAreaId;
  config?: AppConfig;
  [key: string]: unknown;
}

(() => {
  const win = window as unknown as Record<string, unknown>;
  if (win.__ntg_page_hook_v100) return;
  win.__ntg_page_hook_v100 = true;

  function execAction(action: string, payload: GameActionPayload = {}): Record<string, unknown> {
    if (!stores.main) discoverStores();
    const mainStore = stores.main;
    if (!mainStore) return { ok: false, error: 'NO_MAIN_STORE' };
    const m = mainStore.getState();
    if (!m) return { ok: false, error: 'NO_MAIN_STORE' };

    try {
      switch (action) {
        case 'NAVIGATE': {
          const target = payload.target;
          dismissInterruptsIfNeeded({ autoDismissInterrupts: true });
          const cur = mainStore.getState();

          if (cur.screen === 'playing' && target !== 'playing') {
            console.warn(
              '[NTG Tool] Đổi scene từ Nông trại. Game có thể rollback 0-10s dữ liệu ' +
              'nếu bạn đóng tab ngay lập tức. Chờ 10s trước khi đóng tab để an toàn.'
            );
          }

          if (target === 'playing') {
            if (cur.screen === 'farmstay') {
              if (typeof cur.leaveFarmstay === 'function') {
                cur.leaveFarmstay();
              } else {
                mainStore.setState({ screen: 'playing', panel: null, shop: null, vendor: null });
              }
            } else if (cur.screen !== 'playing') {
              cur.showWorldMap?.();
              mainStore.getState().enterFarm?.();
              mainStore.setState({ screen: 'playing', panel: null, shop: null, vendor: null });
            }
            if (payload.indoors === false && mainStore.getState().indoors) {
              mainStore.getState().leaveHouse?.();
            }
          } else if (target === 'sea') {
            if (cur.screen !== 'sea') {
              if (cur.indoors) cur.leaveHouse?.();
              if (!cur.fishing?.seaOpen && (cur.day || 0) >= 2) {
                cur.openSea?.();
              }
              const res = mainStore.getState().goToSea?.();
              if (res !== 'ok') {
                return { ok: false, reason: res || 'CANNOT_GO_SEA' };
              }
            }
          } else if (target === 'benDo' || target === 'ben') {
            if (cur.screen !== 'benDo') {
              if (cur.indoors) cur.leaveHouse?.();
              mainStore.setState({ screen: 'benDo', panel: null, shop: null, vendor: null, indoors: false });
            }
          } else if (target === 'farmstay') {
            if (cur.screen !== 'farmstay') {
              if (cur.indoors) cur.leaveHouse?.();
              if (typeof cur.goToFarmstay === 'function') {
                cur.goToFarmstay();
              } else {
                mainStore.setState({ screen: 'farmstay', panel: null, shop: null, vendor: null, indoors: false });
              }
            }
          }
          return { ok: true, screen: mainStore.getState().screen };
        }

        case 'FARM_SUBAREA_STEP': {
          if (!payload.subAreaId || !payload.config) return { ok: false, error: 'INVALID_PAYLOAD' };
          const res = execFarmSubAreaStep(payload.subAreaId, payload.config);
          return { ok: true, ...res };
        }

        case 'SEA_STEP': {
          if (!payload.config) return { ok: false, error: 'NO_CONFIG' };
          const res = execSeaStep(payload.config);
          return { ok: true, ...res };
        }

        case 'BEN_STEP': {
          if (!payload.config) return { ok: false, error: 'NO_CONFIG' };
          const res = execBenStep(payload.config);
          return { ok: true, ...res };
        }

        case 'FARMSTAY_STEP': {
          if (!payload.config) return { ok: false, error: 'NO_CONFIG' };
          const res = execFarmstayStep(payload.config);
          return { ok: true, ...res };
        }

        case 'BEN_WATCH': {
          if (!payload.config) return { ok: false, error: 'NO_CONFIG' };
          refreshCricketWatchers(payload.config);
          return { ok: true };
        }

        case 'BEN_SET_PANEL': {
          if (!stores.benUI) discoverStores();
          if (stores.benUI) {
            stores.benUI.setState({
              panel: (payload.panel as string | null) ?? null,
              closetSlot: (payload.closetSlot as string | null) ?? null,
              bagTab: (payload.bagTab as string | null) ?? null,
            });
            return { ok: true, panel: payload.panel };
          }
          return { ok: false, error: 'NO_BEN_UI_STORE' };
        }

        case 'BEN_REFRESH': {
          const kind = payload.kind as string;
          if (kind === 'board') {
            sendBenWs({ t: 'board' });
          } else if (kind === 'rods') {
            sendBenWs({ t: 'rods' });
          } else if (kind === 'rooms') {
            sendBenWs({ t: 'rooms' });
          } else if (kind === 'wheel') {
            sendBenWs({ t: 'wheel' });
          }
          return { ok: true };
        }

        case 'BEN_USE_ROD': {
          const rod = payload.rod as string;
          if (rod) {
            sendBenWs({ t: 'rodUse', rod });
            return { ok: true };
          }
          return { ok: false, error: 'NO_ROD_SPECIFIED' };
        }

        case 'BEN_SET_LOOK': {
          const slot = payload.slot as string;
          const id = (payload.id as string | null) ?? null;
          if (slot) {
            if (!stores.benNet) discoverStores();
            if (stores.benNet) {
              stores.benNet.setState((prev) => {
                const look = { ...((prev.look as Record<string, string>) || {}) };
                if (id) {
                  look[slot] = id;
                } else {
                  delete look[slot];
                }
                return { look };
              });
            }
            sendBenWs({ t: 'wear', slot, item: id });
            return { ok: true };
          }
          return { ok: false, error: 'NO_SLOT_SPECIFIED' };
        }

        case 'BEN_KEEP_FISH': {
          const id = payload.id as string;
          const on = Boolean(payload.on);
          if (id) {
            sendBenWs({ t: 'keep', id, on });
            return { ok: true };
          }
          return { ok: false, error: 'NO_FISH_ID' };
        }

        case 'BEN_SWITCH_ROOM': {
          const id = Number(payload.id);
          if (!isNaN(id)) {
            sendBenWs({ t: 'room', id });
            return { ok: true };
          }
          return { ok: false, error: 'NO_ROOM_ID' };
        }

        case 'SET_PANEL': {
          if (!stores.main) discoverStores();
          if (stores.main) {
            stores.main.setState({ panel: (payload.panel as string | null) ?? null });
            return { ok: true, panel: payload.panel };
          }
          return { ok: false, error: 'NO_MAIN_STORE' };
        }

        case 'SLEEP_NOW': {
          const mainState = mainStore.getState();
          if ((mainState.fishing?.basket?.length || 0) > 0) {
            mainState.sellBasket?.();
          }

          dismissInterruptsIfNeeded({ autoDismissInterrupts: true });

          if (mainStore.getState().screen === 'farmstay') {
            mainStore.getState().leaveFarmstay?.();
          } else if (mainStore.getState().screen !== 'playing') {
            mainStore.getState().showWorldMap?.();
            mainStore.getState().enterFarm?.();
          }
          mainStore.setState({
            screen: 'playing',
            panel: null,
            shop: null,
            vendor: null,
            plotOffer: null,
            zoneOffer: null,
            phone: null,
            announcement: null,
            tip: null,
            call: null,
          });

          const st = mainStore.getState();
          if (!st.indoors) {
            st.enterHouse?.();
          }

          const prevDay = mainStore.getState().day || 0;
          if ((mainStore.getState().minutes || 0) >= 1140) {
            mainStore.getState().goToSleep?.();
            mainStore.getState().sleepThrough?.();
          }
          if (mainStore.getState().day === prevDay) {
            mainStore.getState().nextMorning?.();
          }
          mainStore.getState().stopSleeping?.();

          const afterDay = mainStore.getState().day || 0;
          return { ok: afterDay > prevDay, day: afterDay };
        }

        default:
          return { ok: false, error: 'UNKNOWN_ACTION' };
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`[NTG Hook Error] execAction failed for "${action}":`, err);
      return { ok: false, error: errorMsg };
    }
  }

  window.addEventListener('message', (e: MessageEvent) => {
    if (e.source !== window || !e.data || e.data.source !== 'ntg-content') return;
    const { id, type, action, payload } = e.data as {
      id: number;
      type: string;
      action?: string;
      payload?: GameActionPayload;
    };

    if (type === 'GET_GAME_STATE') {
      const snap = getSnapshot();
      window.postMessage({ source: 'ntg-page', id, type: 'GAME_STATE_RESULT', data: snap }, '*');
    } else if (type === 'EXEC_GAME_ACTION' && action) {
      const res = execAction(action, payload);
      window.postMessage({ source: 'ntg-page', id, type: 'GAME_ACTION_RESULT', data: res }, '*');
    }
  });
})();
