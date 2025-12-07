import { describe, expect, it } from 'vitest';
import RecommendationCard from './RecommendationCard.svelte';

describe('RecommendationCard action labels', () => {
  const baseProps = {
    name: 'Test Item',
    action: 'keep' as const,
    stackSellValue: 750
  };

  const getBadgeText = (target: HTMLElement) =>
    target.querySelector('header span')?.textContent?.trim();

  it('shows the keep label when action is keep', () => {
    const target = document.createElement('div');
    new RecommendationCard({
      target,
      props: { ...baseProps }
    });

    expect(getBadgeText(target)).toBe('Keep');
  });

  it('shows the recycle label when action is recycle', () => {
    const target = document.createElement('div');
    new RecommendationCard({
      target,
      props: { ...baseProps, action: 'recycle' as const }
    });

    expect(getBadgeText(target)).toBe('Recycle');
  });
});
