import { base } from '$app/paths';
import { loadCanonicalData } from '$lib/server/pipeline';
import type { ItemRecord, UpgradePack } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const data = await loadCanonicalData(fetch, {
    basePath: base,
    include: { items: true, upgrades: true }
  });

  const blueprintItems = data.items.filter(
    (item) => item.category?.toLowerCase() === 'blueprint'
  );

  return {
    items: data.items,
    workbenchUpgrades: data.upgrades,
    blueprints: blueprintItems
  } satisfies {
    items: ItemRecord[];
    workbenchUpgrades: UpgradePack[];
    blueprints: ItemRecord[];
  };
};
