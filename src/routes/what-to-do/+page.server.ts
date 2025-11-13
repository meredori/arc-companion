import { base } from '$app/paths';
import type { PageServerLoad } from './$types';
import { loadCanonicalData } from '$lib/server/pipeline';
import type { ItemRecord, Project, Quest, UpgradePack } from '$lib/types';

export const load: PageServerLoad = async ({ fetch }) => {
  const { items = [], quests = [], workbenchUpgrades = [], projects = [] } = await loadCanonicalData(
    fetch,
    { items: true, quests: true, upgrades: true, projects: true },
    base
  );

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
