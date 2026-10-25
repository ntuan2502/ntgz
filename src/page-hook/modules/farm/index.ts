import { stores } from '../../core/engine-access';
import { dismissInterruptsIfNeeded } from '../../core/interrupts';
import { handleHouseSubArea, handleSalonSubArea } from './house';
import { handleCropsSubArea } from './crops';
import {
  handlePetSubArea,
  handleBarnSubArea,
  handleDairySubArea,
  handleCoopSubArea,
  handlePondSubArea,
} from './animals';
import { handleMarketSubArea } from './market';
import { handleDiBaySubArea } from './tasks';
import { handleGoldShopSubArea } from './gold-shop';
import { StepResult, NOT_ACTED } from './types';

import { AppConfig, FarmSubAreaId } from '../../../shared/types/config';

const SUBAREA_HANDLERS: Record<FarmSubAreaId, (cfg: AppConfig) => StepResult> = {
  house: handleHouseSubArea,
  crops: handleCropsSubArea,
  pet: handlePetSubArea,
  barn: handleBarnSubArea,
  dairy: handleDairySubArea,
  coop: handleCoopSubArea,
  pond: handlePondSubArea,
  salon: handleSalonSubArea,
  market: handleMarketSubArea,
  dibay: handleDiBaySubArea,
  goldShop: handleGoldShopSubArea,
};

export function execFarmSubAreaStep(subAreaId: FarmSubAreaId, cfg: AppConfig): StepResult {
  if (!stores.main?.getState()) return NOT_ACTED;

  // Always dismiss blocking interrupts first
  const interrupted = dismissInterruptsIfNeeded(cfg);
  if (interrupted) return interrupted;

  const handler = SUBAREA_HANDLERS[subAreaId];
  return handler ? handler(cfg) : NOT_ACTED;
}
