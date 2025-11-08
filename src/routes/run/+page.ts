import type { ItemRecord, Project, Quest, UpgradePack } from '$lib/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const [itemsRes, questsRes, upgradesRes, projectsRes] = await Promise.all([
    fetch('/data/items.json'),
    fetch('/data/quests.json'),
    fetch('/data/upgrades.json'),
    fetch('/data/projects.json')
  ]);

  const [items, quests, upgrades, projects] = await Promise.all([
    itemsRes.json() as Promise<ItemRecord[]>,
    questsRes.json() as Promise<Quest[]>,
    upgradesRes.json() as Promise<UpgradePack[]>,
    projectsRes.json() as Promise<Project[]>
  ]);

  return { items, quests, upgrades, projects } satisfies {
    items: ItemRecord[];
    quests: Quest[];
    upgrades: UpgradePack[];
    projects: Project[];
  };
};
