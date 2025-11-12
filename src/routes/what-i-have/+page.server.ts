import { base } from '$app/paths';
import { loadCanonicalData } from '$lib/server/pipeline';
import type { ItemRecord, Project, Quest, QuestChain, UpgradePack } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const data = await loadCanonicalData(fetch, {
    basePath: base,
    include: { items: true, quests: true, upgrades: true, projects: true, chains: true }
  });

  const blueprintItems = data.items.filter(
    (item) => item.category?.toLowerCase() === 'blueprint'
  );

  return {
    quests: data.quests,
    workbenchUpgrades: data.upgrades,
    items: data.items,
    projects: data.projects,
    chains: data.chains,
    blueprints: blueprintItems
  } satisfies {
    quests: Quest[];
    workbenchUpgrades: UpgradePack[];
    items: ItemRecord[];
    projects: Project[];
    chains: QuestChain[];
    blueprints: ItemRecord[];
  };
};
