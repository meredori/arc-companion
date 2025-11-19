import { describe, expect, it } from 'vitest';

import {
  BENCH_LABELS,
  DEFAULT_BENCH_ORDER,
  QUICK_USE_BENCH_BY_SLUG,
  QUICK_USE_BENCH_PRIORITY
} from './bench';

describe('bench utils', () => {
  it('maps quick-use slugs to known benches', () => {
    const allowed = new Set(QUICK_USE_BENCH_PRIORITY);
    for (const bench of QUICK_USE_BENCH_BY_SLUG.values()) {
      expect(allowed.has(bench)).toBe(true);
    }
  });

  it('provides labels for all known benches', () => {
    const benches = new Set<string>(['all', ...DEFAULT_BENCH_ORDER, ...QUICK_USE_BENCH_PRIORITY]);
    benches.forEach((bench) => {
      expect(BENCH_LABELS[bench]).toBeDefined();
      expect(BENCH_LABELS[bench]?.length ?? 0).toBeGreaterThan(0);
    });
  });
});
