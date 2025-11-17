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

  const blueprints = items.filter((item) => item.category?.toLowerCase() === 'blueprint');

  return {
    quests,
    workbenchUpgrades,
    items,
    projects,
    chains,
    blueprints
  } satisfies {
    quests: Quest[];
    workbenchUpgrades: UpgradePack[];
    items: ItemRecord[];
    projects: Project[];
    chains: QuestChain[];
    blueprints: ItemRecord[];
  };
};
