import type { RunLogEntry } from '$lib/types';

export interface TipContext {
  activeRun?: RunLogEntry;
  freeLoadout?: boolean;
}

export interface RunTip {
  id: string;
  message: string;
}

export function getPlaceholderTips(context: TipContext): RunTip[] {
  const tips: RunTip[] = [];

  if (context.freeLoadout) {
    tips.push({
      id: 'free-loadout',
      message: 'Free Loadout active — prioritize gathering salvage to restock your core kit.'
    });
  }

  if (!context.activeRun) {
    tips.push({ id: 'start-run', message: 'Start a run to begin tracking XP, value, and extracts.' });
  } else if (!context.activeRun.endedAt) {
    tips.push({
      id: 'in-progress',
      message: 'Remember to record extract value and mark notable drops before ending the run.'
    });
  }

  return tips;
}
