import { GameSnapshot } from './game-state';

export type RequestType = 'GET_GAME_STATE' | 'EXEC_GAME_ACTION';

export interface ContentToPageMessage {
  source: 'ntg-content';
  id: number;
  type: RequestType;
  action?: string | null;
  payload?: Record<string, any>;
}

export interface PageToContentMessage {
  source: 'ntg-page';
  id: number;
  type: 'GAME_STATE_RESULT' | 'GAME_ACTION_RESULT';
  data: GameActionResult | GameSnapshot;
}

export interface GameActionResult {
  ok: boolean;
  error?: string;
  data?: any;
  [key: string]: any;
}
