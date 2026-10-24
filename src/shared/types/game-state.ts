export interface GameSnapshot {
  ok: boolean;
  hasPhaser?: boolean;
  hasBenWs?: boolean;
  screen?: string;
  day?: number;
  minutes?: number;
  gold?: number;
  fullness?: number;
  hydration?: number;
  energy?: number;
  battery?: number;
  vehicle?: any;
  onFoot?: boolean;
  indoors?: boolean;
  sleeping?: boolean;
  panel?: any;
  cropsCount?: number;
  inventory?: any[];
  warehouse?: Record<string, number>;
  plots?: any[];
  animals?: any[];
  sea?: any;
  benUI?: any;
  benNet?: any;
  benWallet?: any;
  benNonKeptCount?: number;
  [key: string]: any;
}
