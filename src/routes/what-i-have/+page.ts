import type { ItemRecord, Project, Quest, QuestChain, UpgradePack } from '$lib/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const [questsRes, upgradesRes, itemsRes, projectsRes, chainsRes] = await Promise.all([
    fetch('/data/quests.json'),
    fetch('/data/upgrades.json'),
    fetch('/data/items.json'),
    fetch('/data/projects.json'),
    fetch('/data/chains.json')
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
