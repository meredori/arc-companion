import type { ItemRecord, Project, Quest, UpgradePack, Vendor } from '$lib/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const [itemsRes, questsRes, upgradesRes, vendorsRes, projectsRes] = await Promise.all([
    fetch('/data/items.json'),
    fetch('/data/quests.json'),
    fetch('/data/upgrades.json'),
    fetch('/data/vendors.json'),
    fetch('/data/projects.json')
  ]);

  const [items, quests, upgrades, vendors, projects] = await Promise.all([
    itemsRes.json() as Promise<ItemRecord[]>,
    questsRes.json() as Promise<Quest[]>,
    upgradesRes.json() as Promise<UpgradePack[]>,
    vendorsRes.json() as Promise<Vendor[]>,
    projectsRes.json() as Promise<Project[]>
  ]);

  return {
    items,
    quests,
    upgrades,
    vendors,
    projects
  } satisfies {
    items: ItemRecord[];
    quests: Quest[];
    upgrades: UpgradePack[];
    vendors: Vendor[];
    projects: Project[];
  };
};
