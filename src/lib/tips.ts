import type { AppSettings, RunLogEntry, RunTip, RunTipContext } from '$lib/types';
import { summarizeRunNeeds } from './recommend';

export function createRunTipContext(params: {
  activeRun?: RunLogEntry | null;
  runs: RunLogEntry[];
  settings: AppSettings;
  outstandingNeeds: number;
}): RunTipContext {
  return {
    activeRun: params.activeRun ?? null,
    recentRuns: params.runs.slice(0, 5),
    settings: params.settings,
    outstandingNeeds: params.outstandingNeeds
  };
}

function averageExtractValue(runs: RunLogEntry[]): number {
  const values = runs.map((run) => run.extractedValue ?? 0).filter((value) => value > 0);
  if (values.length === 0) {
    return 0;
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round(total / values.length);
}

export function generateRunTips(context: RunTipContext): RunTip[] {
  const tips: RunTip[] = [];

  if (!context.activeRun) {
    tips.push({
      id: 'start-run',
      message: 'Start a new run to capture XP, extracted value, and free-loadout toggles.',
      level: 'info'
    });
  } else if (!context.activeRun.endedAt) {
    tips.push({
      id: 'capture-extract',
      message: 'Record extracted value and quest progress before ending the active run.',
      level: 'warning'
    });
  } else {
    tips.push({
      id: 'review-finished-run',
      message: 'Review the recently completed run and log notes while details are fresh.',
      level: 'success'
    });
  }

  if (context.settings.freeLoadoutDefault) {
    tips.push({
      id: 'free-loadout',
      message: 'Free Loadout enabled — prioritise salvage to restock essentials post-mission.',
      level: 'info'
    });
  }

  if (context.outstandingNeeds > 0) {
    tips.push({
      id: 'outstanding-needs',
      message: `You still need ${context.outstandingNeeds} quest or upgrade item${
        context.outstandingNeeds > 1 ? 's' : ''
      }. Focus on targeted loot drops.`,
      level: 'warning'
    });
  }

  const productiveRuns = summarizeRunNeeds(context.recentRuns);
  if (productiveRuns === 0 && context.recentRuns.length > 0) {
    tips.push({
      id: 'no-extracts',
      message: 'Recent runs are missing extracted values — log them to unlock dashboard analytics.',
      level: 'warning'
    });
  } else if (productiveRuns > 0) {
    const avg = averageExtractValue(context.recentRuns);
    tips.push({
      id: 'average-extract',
      message: `Average extract across recent runs: ${avg.toLocaleString()} coins. Aim to beat it!`,
      level: 'info'
    });
  }

  return tips;
}

export function tipsForWhatToDo(outstandingNeeds: number): string[] {
  const tips: string[] = [];
  if (outstandingNeeds > 0) {
    tips.push(
      `Focus on quest items first — ${outstandingNeeds} outstanding objective${
        outstandingNeeds > 1 ? 's' : ''
      } remain.`
    );
  }
  tips.push('Use the search filters to match vendors, zones, or crafting outputs.');
  tips.push('Toggle blueprint ownership to watch recommendations adjust automatically.');
  return tips;
}

export function tipsForBlueprints(totalOwned: number, totalAvailable: number): string[] {
  const progress = totalAvailable > 0 ? Math.round((totalOwned / totalAvailable) * 100) : 0;
  return [
    `Blueprint collection is ${progress}% complete. Owned schematics feed the workshop planner.`,
    'Unowned blueprints stay hidden from upgrade calculations until you toggle them on.',
    'Use the admin import tools to refresh blueprint metadata after each pipeline run.'
  ];
}

export function tipsForWorkshop(
  ownedLevels: number,
  totalLevels: number,
  highestOwnedLevel: number
): string[] {
  if (totalLevels === 0) {
    return ['Workshop upgrade metadata is missing. Sync the data pipeline to populate levels.'];
  }
  const progress = Math.round((ownedLevels / totalLevels) * 100);
  const tips: string[] = [];
  tips.push(`Workshop progress: ${ownedLevels}/${totalLevels} levels (${progress}%).`);
  if (highestOwnedLevel === 0) {
    tips.push('Mark Level 1 once it finishes upgrading to unlock automated tracking.');
  } else if (highestOwnedLevel >= totalLevels) {
    tips.push('All levels marked as owned — consider resetting if you prestige or wipe.');
  } else {
    tips.push(`Next target: Level ${highestOwnedLevel + 1}. Toggle it once the bench upgrade completes.`);
  }
  tips.push('Updating ownership instantly removes those material queues from the What To Do tab.');
  return tips;
}
