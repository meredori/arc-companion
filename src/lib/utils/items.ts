import type { AppSettings, ItemRecord } from '$lib/types';

export function filterVisibleItems(items: ItemRecord[], settings?: Partial<AppSettings>) {
  const hideZeroSellItems = settings?.hideZeroSellItems ?? false;
  if (!hideZeroSellItems) return items;
  return items.filter((item) => item.sell > 0);
}
