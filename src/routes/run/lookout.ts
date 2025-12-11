import type { ItemRecord, ItemRecommendation } from '$lib/types';

type LookOutFilterOptions = {
  itemLookup: Map<string, ItemRecord>;
};

const rarityRank = (rarity?: string | null) => {
  const priority = ['legendary', 'epic', 'rare', 'uncommon', 'common'];
  const normalized = rarity?.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!normalized) return priority.length;
  const token = normalized.split(/[^a-z]+/i)[0] ?? '';
  const index = priority.findIndex((label) => label === token);
  if (index !== -1) return index;
  const fuzzy = priority.findIndex((label) => normalized.startsWith(label));
  return fuzzy === -1 ? priority.length : fuzzy;
};

export const filterLookOutRecommendations = (
  recommendations: ItemRecommendation[],
  { itemLookup }: LookOutFilterOptions
) => {
  const seen = new Set<string>();

  return recommendations
    .filter((rec) => {
      const totalNeeds = rec.needs.quests + rec.needs.workshop + rec.needs.projects;
      const hasWishlist = (rec.wishlistSources?.length ?? 0) > 0;
      const supportsRecycling = rec.action === 'recycle';
      const category = rec.category?.toLowerCase().trim();
      const type = rec.type?.toLowerCase().trim();
      const isBasicMaterial = category === 'basic material' || type === 'basic material';
      if (isBasicMaterial) return false;

      if (!(totalNeeds > 0 || hasWishlist || supportsRecycling)) {
        return false;
      }

      if (supportsRecycling && totalNeeds === 0) {
        const targets = rec.salvageBreakdown ?? [];
        const onlyFeedsBasicMaterials =
          targets.length > 0 &&
          targets.every((entry) => {
            const targetCategory = itemLookup.get(entry.itemId)?.category;
            const targetType = entry.type ?? itemLookup.get(entry.itemId)?.type;
            const normalizedCategory = targetCategory?.toLowerCase().trim();
            const normalizedType = targetType?.toLowerCase().trim();
            return normalizedCategory === 'basic material' || normalizedType === 'basic material';
          });
        if (onlyFeedsBasicMaterials) return false;
      }

      return true;
    })
    .filter((rec) => {
      if (seen.has(rec.itemId)) return false;
      seen.add(rec.itemId);
      return true;
    })
    .sort((a, b) => {
      const totalNeedsA = a.needs.quests + a.needs.workshop + a.needs.projects;
      const totalNeedsB = b.needs.quests + b.needs.workshop + b.needs.projects;
      const hasWishlistA = (a.wishlistSources?.length ?? 0) > 0;
      const hasWishlistB = (b.wishlistSources?.length ?? 0) > 0;
      const isDirectA = totalNeedsA > 0 || hasWishlistA;
      const isDirectB = totalNeedsB > 0 || hasWishlistB;

      if (isDirectA !== isDirectB) return isDirectA ? -1 : 1;

      const rarityDiff = rarityRank(a.rarity) - rarityRank(b.rarity);
      if (rarityDiff !== 0) return rarityDiff;

      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
};
