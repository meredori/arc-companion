import { describe, expect, it } from 'vitest';
import RecommendationCard from './RecommendationCard.svelte';

describe('RecommendationCard expedition labels', () => {
  const baseProps = {
    name: 'Test Item',
    action: 'keep' as const,
    stackSellValue: 200,
    expeditionPlanningEnabled: true,
    expeditionMinStackValue: 500,
    expeditionCandidate: true
  };

  const getBadgeText = (target: HTMLElement) =>
    target.querySelector('header span')?.textContent?.trim();

  it('shows expedition when the item stack meets the threshold', () => {
    const target = document.createElement('div');
    new RecommendationCard({
      target,
      props: { ...baseProps, stackSellValue: 750 }
    });

    expect(getBadgeText(target)).toBe('Expedition');
  });

  it('shows keep when the item is a component for an expedition craft', () => {
    const target = document.createElement('div');
    new RecommendationCard({
      target,
      props: { ...baseProps }
    });

    expect(getBadgeText(target)).toBe('Keep');
  });

  it('shows recycle when recycling feeds an expedition craft', () => {
    const target = document.createElement('div');
    new RecommendationCard({
      target,
      props: { ...baseProps, action: 'recycle' as const }
    });

    expect(getBadgeText(target)).toBe('Recycle');
  });
});
