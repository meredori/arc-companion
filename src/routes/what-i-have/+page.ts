import { base } from '$app/paths';
import type { ItemRecord, Project, Quest, QuestChain, UpgradePack } from '$lib/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const [questsRes, upgradesRes, itemsRes, projectsRes, chainsRes] = await Promise.all([
    fetch(`${base}/data/quests.json`),
    fetch(`${base}/data/upgrades.json`),
    fetch(`${base}/data/items.json`),
    fetch(`${base}/data/projects.json`),
    fetch(`${base}/data/chains.json`)
  ]);

  const [quests, upgrades, items, projects, chains] = await Promise.all([
    questsRes.json() as Promise<Quest[]>,
    upgradesRes.json() as Promise<UpgradePack[]>,
    itemsRes.json() as Promise<ItemRecord[]>,
    projectsRes.json() as Promise<Project[]>,
    chainsRes.json() as Promise<QuestChain[]>
  ]);

  return { quests, upgrades, items, projects, chains } satisfies {
    quests: Quest[];
    upgrades: UpgradePack[];
    items: ItemRecord[];
    projects: Project[];
    chains: QuestChain[];
  };
};
