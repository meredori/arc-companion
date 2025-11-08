import type { Quest, UpgradePack } from '$lib/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const [questsRes, upgradesRes] = await Promise.all([
    fetch('/data/quests.json'),
    fetch('/data/upgrades.json')
  ]);

  const [quests, upgrades] = await Promise.all([
    questsRes.json() as Promise<Quest[]>,
    upgradesRes.json() as Promise<UpgradePack[]>
  ]);

  return { quests, upgrades } satisfies { quests: Quest[]; upgrades: UpgradePack[] };
};
