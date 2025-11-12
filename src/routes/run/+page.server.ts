import { base } from '$app/paths';
import { loadCanonicalData } from '$lib/server/pipeline';
import type { ItemRecord, Project, Quest, UpgradePack } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const data = await loadCanonicalData(fetch, {
    basePath: base,
    include: { items: true, quests: true, upgrades: true, projects: true }
  });

  return {
    items: data.items,
    quests: data.quests,
    workbenchUpgrades: data.upgrades,
    projects: data.projects
  } satisfies {
    items: ItemRecord[];
    quests: Quest[];
    workbenchUpgrades: UpgradePack[];
    projects: Project[];
  };
};
