import type { ItemRecord, Project, Quest, QuestChain, UpgradePack, Vendor } from '$lib/types';

import chainsJson from './chains.json';
import itemsJson from './items.json';
import projectsJson from './projects.json';
import questsJson from './quests.json';
import upgradesJson from './workbench-upgrades.json';
import vendorsJson from './vendors.json';

export const fallbackItems = itemsJson as ItemRecord[];
export const fallbackQuests = questsJson as Quest[];
export const fallbackChains = chainsJson as QuestChain[];
export const fallbackUpgradePacks = upgradesJson as UpgradePack[];
export const fallbackProjects = projectsJson as Project[];
export const fallbackVendors = vendorsJson as Vendor[];
