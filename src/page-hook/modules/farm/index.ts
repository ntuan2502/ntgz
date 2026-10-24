import { stores } from '../../core/engine-access';
import { dismissInterruptsIfNeeded } from '../../core/interrupts';
import { handleHouseSubArea } from './house';
import { handleCropsSubArea } from './crops';
import { handlePetSubArea, handleBarnSubArea, handleCoopSubArea, handlePondSubArea } from './animals';
import { handleMarketSubArea } from './market';
import { handleDiBaySubArea } from './tasks';

import { AppConfig, FarmSubAreaId } from '../../../shared/types/config';

export function execFarmSubAreaStep(subAreaId: FarmSubAreaId, cfg: AppConfig): { acted: boolean; msg?: string } {
  const m = stores.main?.getState();
  if (!m) return { acted: false };

  // Always dismiss blocking interrupts first
  const interrupted = dismissInterruptsIfNeeded(cfg);
  if (interrupted) return interrupted;

  switch (subAreaId) {
    case 'house':
      return handleHouseSubArea(cfg);
    case 'crops':
      return handleCropsSubArea(cfg);
    case 'pet':
      return handlePetSubArea(cfg);
    case 'barn':
      return handleBarnSubArea(cfg);
    case 'coop':
      return handleCoopSubArea(cfg);
    case 'pond':
      return handlePondSubArea(cfg);
    case 'market':
      return handleMarketSubArea(cfg);
    case 'dibay':
      return handleDiBaySubArea(cfg);
    default:
      return { acted: false };
  }
}
