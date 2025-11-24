import type { PageServerLoad } from './$types';
import { loadCanonicalData } from '$lib/server/pipeline';
import type { ItemRecord, Project, Quest, UpgradePack } from '$lib/types';

export const load: PageServerLoad = async () => {
  const { items = [], workbenchUpgrades = [], quests = [], projects = [] } = await loadCanonicalData({
    items: true,
    upgrades: true,
    quests: true,
    projects: true
  });

  const blueprints = items.filter((item) => item.category?.toLowerCase() === 'blueprint');

  return {
    items,
    blueprints,
    workbenchUpgrades,
    quests,
    projects
  } satisfies {
    items: ItemRecord[];
    blueprints: ItemRecord[];
    workbenchUpgrades: UpgradePack[];
    quests: Quest[];
    projects: Project[];
  };
};
