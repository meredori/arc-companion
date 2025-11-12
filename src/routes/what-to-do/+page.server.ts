import { base } from '$app/paths';
import type { PageServerLoad } from './$types';
import { loadCanonicalData } from '$lib/server/pipeline';
import type { ItemRecord, Project, Quest, UpgradePack, Vendor } from '$lib/types';

export const load: PageServerLoad = async ({ fetch }) => {
  const { items = [], quests = [], workbenchUpgrades = [], vendors = [], projects = [] } = await loadCanonicalData(
    fetch,
    { items: true, quests: true, upgrades: true, vendors: true, projects: true },
    base
  );

  return {
    items,
    quests,
    workbenchUpgrades,
    vendors,
    projects
  } satisfies {
    items: ItemRecord[];
    quests: Quest[];
    workbenchUpgrades: UpgradePack[];
    vendors: Vendor[];
    projects: Project[];
  };
};
