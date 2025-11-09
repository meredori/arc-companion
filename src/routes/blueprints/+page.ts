import { base } from '$app/paths';
import type { ItemRecord } from '$lib/types';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const itemsRes = await fetch(`${base}/data/items.json`);
  const items = (await itemsRes.json()) as ItemRecord[];
  const blueprints = items.filter((item) => item.category?.toLowerCase() === 'blueprint');

  return { blueprints } satisfies { blueprints: ItemRecord[] };
};
