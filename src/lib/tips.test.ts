import { describe, expect, it } from 'vitest';
import { createRunTipContext, generateRunTips, tipsForWorkshop } from './tips';
import type { AppSettings, RunLogEntry } from './types';

const settings: AppSettings = {
  freeLoadoutDefault: true,
  showExperimental: false,
  approvalsEnabled: false,
  alwaysKeepCategories: []
};

describe('run tips', () => {
  it('encourages starting a run when idle', () => {
    const context = createRunTipContext({ activeRun: null, runs: [], settings, outstandingNeeds: 3 });
    const tips = generateRunTips(context);
    expect(tips[0].id).toBe('start-run');
    expect(tips.some((tip) => tip.id === 'outstanding-needs')).toBe(true);
  });

  it('reminds to capture extract when run is active', () => {
    const active: RunLogEntry = {
      id: 'run-1',
      startedAt: new Date().toISOString(),
      freeLoadout: false
    };
    const context = createRunTipContext({
      activeRun: active,
      runs: [active],
      settings,
      outstandingNeeds: 0
    });
    const tips = generateRunTips(context);
    expect(tips.some((tip) => tip.id === 'capture-extract')).toBe(true);
  });

  it('highlights average extract when data is available', () => {
    const completed: RunLogEntry = {
      id: 'run-2',
      startedAt: new Date(Date.now() - 600000).toISOString(),
      endedAt: new Date().toISOString(),
      extractedValue: 1200
    };
    const context = createRunTipContext({
      activeRun: null,
      runs: [completed],
      settings,
      outstandingNeeds: 0
    });
    const tips = generateRunTips(context);
    expect(tips.some((tip) => tip.id === 'average-extract')).toBe(true);
  });
});

describe('workshop tips', () => {
  it('handles missing data gracefully', () => {
    const tips = tipsForWorkshop(0, 0, 0);
    expect(tips[0]).toContain('missing');
  });

  it('highlights next target level', () => {
    const tips = tipsForWorkshop(2, 5, 2);
    expect(tips.some((tip) => tip.includes('Level 3'))).toBe(true);
  });
});
