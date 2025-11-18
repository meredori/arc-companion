import type { PageServerLoad } from './$types';
import { loadCanonicalData } from '$lib/server/pipeline';
import type { ItemRecord, Project, Quest, QuestChain, UpgradePack } from '$lib/types';

export const load: PageServerLoad = async () => {
  const { items = [], quests = [], workbenchUpgrades = [], projects = [], chains = [] } = await loadCanonicalData({
    items: true,
    quests: true,
    upgrades: true,
    projects: true,
    chains: true
  });

  return {
    quests,
    workbenchUpgrades,
    items,
    projects,
    chains
  } satisfies {
    quests: Quest[];
    workbenchUpgrades: UpgradePack[];
    items: ItemRecord[];
    projects: Project[];
    chains: QuestChain[];
  };
};
