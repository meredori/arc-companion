import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { createQuestOrderComparator, sortQuestIds } from './quest-order';

const readJson = <T>(relativePath: string): T => {
  const absolutePath = path.resolve(relativePath);
  return JSON.parse(readFileSync(absolutePath, 'utf-8')) as T;
};

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

    expect(sorted).toEqual(['quest-a-1', 'quest-a-2', 'quest-b-1']);
  });

  it('follows the configured chain order when sorting real quest data', () => {
    type ChainRecord = { id: string; name: string; stages: string[] };
    type QuestRecord = {
      id: string;
      name: string;
      chainId?: string | null;
      chainStage?: number | null;
    };

    const chains = readJson<ChainRecord[]>('static/data/chains.json');
    const quests = readJson<QuestRecord[]>('static/data/quests.json');

    const chainOrder = new Map(chains.map((chain, index) => [chain.id, index]));
    const questById = new Map(quests.map((quest) => [quest.id, { name: quest.name }]));

    const questChainLookup = new Map<string, { chainId: string; chainName: string; index: number | null }>();
    for (const quest of quests) {
      if (!quest.chainId) continue;
      const chain = chains.find((entry) => entry.id === quest.chainId);
      const index = typeof quest.chainStage === 'number' ? quest.chainStage : null;
      questChainLookup.set(quest.id, {
        chainId: quest.chainId,
        chainName: chain?.name ?? quest.chainId,
        index
      });
    }

    const firstChain = chains[0];
    expect(firstChain?.stages.length ?? 0).toBeGreaterThanOrEqual(2);
    const secondChainIndex = chains.findIndex((chain, idx) => idx !== 0 && chain.stages.length >= 3);
    expect(secondChainIndex).toBeGreaterThan(-1);
    const secondChain = chains[secondChainIndex];

    const sample = [
      secondChain.stages[2],
      firstChain.stages[1],
      secondChain.stages[0],
      firstChain.stages[0],
      secondChain.stages[1]
    ];

    const comparator = createQuestOrderComparator(chainOrder, questChainLookup, questById);
    const sorted = sample.slice().sort(comparator);

    expect(sorted).toEqual([
      firstChain.stages[0],
      firstChain.stages[1],
      secondChain.stages[0],
      secondChain.stages[1],
      secondChain.stages[2]
    ]);
  });
});
