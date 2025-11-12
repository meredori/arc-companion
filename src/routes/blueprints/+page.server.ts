import { base } from '$app/paths';
import { loadCanonicalData } from '$lib/server/pipeline';
import type { ItemRecord } from '$lib/types';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const data = await loadCanonicalData(fetch, {
    basePath: base,
    include: { items: true }
  });

  const blueprintItems = data.items.filter(
    (item) => item.category?.toLowerCase() === 'blueprint'
  );

  return {
    items: data.items,
    blueprints: blueprintItems
  } satisfies {
    items: ItemRecord[];
    blueprints: ItemRecord[];
  };
};
