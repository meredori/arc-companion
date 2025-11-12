import { base } from '$app/paths';
import type { ItemRecord, Project, Quest, UpgradePack, Vendor } from '$lib/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const [itemsRes, questsRes, upgradesRes, vendorsRes, projectsRes] = await Promise.all([
    fetch(`${base}/data/items.json`),
    fetch(`${base}/data/quests.json`),
    fetch(`${base}/data/workbench-upgrades.json`),
    fetch(`${base}/data/vendors.json`),
    fetch(`${base}/data/projects.json`)
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
    workbenchUpgrades: upgrades,
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
