import type { PageServerLoad } from './$types';
import { loadCanonicalData } from '$lib/server/pipeline';
import type { ItemRecord, Project, Quest, UpgradePack } from '$lib/types';

export const load: PageServerLoad = async () => {
  const { items = [], quests = [], workbenchUpgrades = [], projects = [] } = await loadCanonicalData({
    items: true,
    quests: true,
    upgrades: true,
    projects: true
  });

  return {
    items,
    quests,
    workbenchUpgrades,
    projects
  } satisfies {
    items: ItemRecord[];
    quests: Quest[];
    workbenchUpgrades: UpgradePack[];
    projects: Project[];
  };
};
