import { base } from '$app/paths';
import type { PageServerLoad } from './$types';
import { loadCanonicalData } from '$lib/server/pipeline';
import type { ItemRecord, Project, Quest, QuestChain, UpgradePack } from '$lib/types';

export const load: PageServerLoad = async ({ fetch }) => {
  const { items = [], quests = [], workbenchUpgrades = [], projects = [], chains = [] } = await loadCanonicalData(
    fetch,
    { items: true, quests: true, upgrades: true, projects: true, chains: true },
    base
  );

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
