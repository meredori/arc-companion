import type { PageServerLoad } from './$types';
import { loadCanonicalData } from '$lib/server/pipeline';
import type { ItemRecord } from '$lib/types';

export const load: PageServerLoad = async ({ fetch }) => {
  const { items = [] } = await loadCanonicalData(fetch, { items: true });
  const blueprints = items.filter((item) => item.category?.toLowerCase() === 'blueprint');

  return { blueprints } satisfies { blueprints: ItemRecord[] };
};
