// Action Cooldown & Debounce map to prevent race-condition double purchases / double actions
const actionCooldowns = new Map<string, number>();

export function canAct(key: string, cooldownMs = 3500): boolean {
  const last = actionCooldowns.get(key) || 0;
  return Date.now() - last >= cooldownMs;
}

export function markActed(key: string): void {
  actionCooldowns.set(key, Date.now());
}
