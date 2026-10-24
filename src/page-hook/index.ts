import { stores, discoverStores } from './core/engine-access';
import { getSnapshot } from './core/store-watcher';
import { dismissInterruptsIfNeeded } from './core/interrupts';
import { execFarmSubAreaStep } from './modules/farm';
import { execSeaStep } from './modules/sea';
import { execBenStep } from './modules/wharf';

(() => {
  if ((window as any).__ntg_page_hook_v100) return;
  (window as any).__ntg_page_hook_v100 = true;

  function execAction(action: string, payload: any = {}): any {
    if (!stores.main) discoverStores();
    const m = stores.main?.getState();
    if (!m) return { ok: false, error: 'NO_MAIN_STORE' };

    try {
      switch (action) {
        case 'NAVIGATE': {
          const target = payload.target;
          dismissInterruptsIfNeeded({ autoDismissInterrupts: true });
          const cur = stores.main.getState();

          if (target === 'playing') {
            if (cur.screen !== 'playing') {
              cur.showWorldMap?.();
              stores.main.getState().enterFarm?.();
              stores.main.setState({ screen: 'playing', panel: null, shop: null, vendor: null });
            }
            if (payload.indoors === false && stores.main.getState().indoors) {
              stores.main.getState().leaveHouse?.();
            }
          } else if (target === 'sea') {
            if (cur.screen !== 'sea') {
              if (cur.indoors) cur.leaveHouse?.();
              if (!cur.fishing?.seaOpen && cur.day >= 2) {
                cur.openSea?.();
              }
              const res = stores.main.getState().goToSea?.();
              if (res !== 'ok') {
                return { ok: false, reason: res || 'CANNOT_GO_SEA' };
              }
            }
          } else if (target === 'benDo' || target === 'ben') {
            if (cur.screen !== 'benDo') {
              if (cur.indoors) cur.leaveHouse?.();
              stores.main.setState({ screen: 'benDo', panel: null, shop: null, vendor: null, indoors: false });
            }
          }
          return { ok: true, screen: stores.main.getState().screen };
        }

        case 'FARM_SUBAREA_STEP': {
          const res = execFarmSubAreaStep(payload.subAreaId, payload.config || {});
          return { ok: true, ...res };
        }

        case 'SEA_STEP': {
          const res = execSeaStep(payload.config || {});
          return { ok: true, ...res };
        }

        case 'BEN_STEP': {
          const res = execBenStep(payload.config || {});
          return { ok: true, ...res };
        }

        case 'SLEEP_NOW': {
          // 1. Sell any remaining fish in Sea basket before going home to sleep
          if ((stores.main.getState().fishing?.basket?.length || 0) > 0) {
            stores.main.getState().sellBasket?.();
          }

          // 2. Dismiss any blocking modals/calls
          dismissInterruptsIfNeeded({ autoDismissInterrupts: true });

          // 3. Navigate back to Farm ('playing') & enter house
          if (stores.main.getState().screen !== 'playing') {
            stores.main.getState().showWorldMap?.();
            stores.main.getState().enterFarm?.();
          }
          stores.main.setState({
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

          const st = stores.main.getState();
          if (!st.indoors) {
            st.enterHouse?.();
          }

          const prevDay = stores.main.getState().day;
          if (stores.main.getState().minutes >= 1140) {
            stores.main.getState().goToSleep?.();
            stores.main.getState().sleepThrough?.();
          }
          if (stores.main.getState().day === prevDay) {
            stores.main.getState().nextMorning?.();
          }
          stores.main.getState().stopSleeping?.();

          const afterDay = stores.main.getState().day;
          return { ok: afterDay > prevDay, day: afterDay };
        }

        default:
          return { ok: false, error: 'UNKNOWN_ACTION' };
      }
    } catch (err: any) {
      return { ok: false, error: String(err?.message || err) };
    }
  }

  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || e.data.source !== 'ntg-content') return;
    const { id, type, action, payload } = e.data;

    if (type === 'GET_GAME_STATE') {
      const snap = getSnapshot();
      window.postMessage({ source: 'ntg-page', id, type: 'GAME_STATE_RESULT', data: snap }, '*');
    } else if (type === 'EXEC_GAME_ACTION') {
      const res = execAction(action, payload);
      window.postMessage({ source: 'ntg-page', id, type: 'GAME_ACTION_RESULT', data: res }, '*');
    }
  });
})();
