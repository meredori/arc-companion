import { describe, expect, it } from 'vitest';

import { createQuestOrderComparator, sortQuestIds } from './quest-order';

describe('quest ordering helpers', () => {
  it('prioritises chain order before stage index', () => {
    const chainOrder = new Map([
      ['chain-b', 0],
      ['chain-a', 1]
    ]);
    const questChainLookup = new Map([
      ['quest-a-1', { chainId: 'chain-a', chainName: 'Alpha', index: 0 }],
      ['quest-a-2', { chainId: 'chain-a', chainName: 'Alpha', index: 1 }],
      ['quest-b-1', { chainId: 'chain-b', chainName: 'Beta', index: 0 }]
    ]);
    const questById = new Map([
      ['quest-a-1', { name: 'Alpha 1' }],
      ['quest-a-2', { name: 'Alpha 2' }],
      ['quest-b-1', { name: 'Beta 1' }]
    ]);
    const quests = ['quest-a-1', 'quest-b-1', 'quest-a-2'];
    const comparator = createQuestOrderComparator(chainOrder, questChainLookup, questById);

    const sorted = quests.slice().sort(comparator);

    expect(sorted).toEqual(['quest-b-1', 'quest-a-1', 'quest-a-2']);
  });

  it('keeps ordering deterministic when a chain is not in the configured sequence', () => {
    const chainOrder = new Map([['chain-a', 0]]);
    const questChainLookup = new Map([
      ['quest-a-1', { chainId: 'chain-a', chainName: 'Alpha', index: 0 }],
      ['quest-x-1', { chainId: 'chain-x', chainName: 'Xeno', index: 0 }],
      ['quest-x-2', { chainId: 'chain-x', chainName: 'Xeno', index: 1 }]
    ]);
    const questById = new Map([
      ['quest-a-1', { name: 'Alpha 1' }],
      ['quest-x-1', { name: 'Xeno 1' }],
      ['quest-x-2', { name: 'Xeno 2' }]
    ]);
    const sorted = sortQuestIds(
      ['quest-x-2', 'quest-a-1', 'quest-x-1'],
      chainOrder,
      questChainLookup,
      questById
    );

    expect(sorted).toEqual(['quest-a-1', 'quest-x-1', 'quest-x-2']);
  });
  it('keeps quest name ordering stable when stage information is missing', () => {
    const chainOrder = new Map([
      ['chain-a', 0],
      ['chain-b', 1]
    ]);
    const questChainLookup = new Map([
      ['quest-a-1', { chainId: 'chain-a', chainName: 'Alpha', index: null }],
      ['quest-a-2', { chainId: 'chain-a', chainName: 'Alpha', index: null }],
      ['quest-b-1', { chainId: 'chain-b', chainName: 'Beta', index: 0 }]
    ]);
    const questById = new Map([
      ['quest-a-1', { name: 'Alpha 1' }],
      ['quest-a-2', { name: 'Alpha 2' }],
      ['quest-b-1', { name: 'Beta 1' }]
    ]);

    const sorted = sortQuestIds(
      ['quest-a-2', 'quest-b-1', 'quest-a-1'],
      chainOrder,
      questChainLookup,
      questById
    );

    expect(sorted).toEqual(['quest-b-1', 'quest-a-1', 'quest-a-2']);
  });
});
