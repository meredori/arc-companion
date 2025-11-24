import type { ItemCraftRequirement, ItemRecord, WeaponVariantOption } from './types';

const WEAPON_CATEGORY_LABELS = new Set(
  [
    'weapon',
    'assault rifle',
    'battle rifle',
    'hand cannon',
    'lmg',
    'pistol',
    'shotgun',
    'sniper rifle',
    'special'
  ].map((label) => label.toLowerCase())
);

const ROMAN_MAP: Record<string, number> = {
  i: 1,
  v: 5,
  x: 10,
  l: 50,
  c: 100,
  d: 500,
  m: 1000
};

const parseRomanNumeral = (value: string): number | null => {
  const normalized = value.toLowerCase();
  let total = 0;
  let prev = 0;

  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    const digit = ROMAN_MAP[normalized[index]];
    if (!digit) return null;
    if (digit < prev) {
      total -= digit;
    } else {
      total += digit;
      prev = digit;
    }
  }

  return total > 0 ? total : null;
};

const isWeaponCategory = (value?: string | null) => {
  if (!value) return false;
  return WEAPON_CATEGORY_LABELS.has(value.toLowerCase());
};

interface WeaponVariantCandidate {
  baseSlug: string;
  baseName: string;
  tier: number;
}

const detectWeaponVariant = (item: ItemRecord): WeaponVariantCandidate | null => {
  if (!isWeaponCategory(item.category)) return null;

  const slugMatch = item.slug.match(/^(.*?)-(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i);
  if (slugMatch) {
    const tier = parseRomanNumeral(slugMatch[2]);
    if (tier) {
      return {
        baseSlug: slugMatch[1],
        baseName: item.name.replace(/\s+(I|II|III|IV|V|VI|VII|VIII|IX|X)$/i, ''),
        tier
      } satisfies WeaponVariantCandidate;
    }
  }

  const nameMatch = item.name.match(/^(.*)\s+(I|II|III|IV|V|VI|VII|VIII|IX|X)$/i);
  if (nameMatch) {
    const tier = parseRomanNumeral(nameMatch[2]);
    if (tier) {
      return {
        baseSlug: item.slug.replace(/-(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i, ''),
        baseName: nameMatch[1],
        tier
      } satisfies WeaponVariantCandidate;
    }
  }

  return null;
};

const mergeRequirements = (requirements: ItemCraftRequirement[]): ItemCraftRequirement[] => {
  const merged = new Map<string, ItemCraftRequirement>();

  for (const req of requirements) {
    const existing = merged.get(req.itemId);
    if (existing) {
      existing.qty += req.qty;
    } else {
      merged.set(req.itemId, { ...req });
    }
  }

  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
};

export const applyWeaponVariantAggregation = (items: ItemRecord[]): ItemRecord[] => {
  const groups = new Map<string, { baseName: string; entries: Array<{ item: ItemRecord; tier: number }> }>();

  for (const item of items) {
    const variant = detectWeaponVariant(item);
    if (!variant) continue;

    const bucket = groups.get(variant.baseSlug) ?? { baseName: variant.baseName, entries: [] };
    bucket.entries.push({ item, tier: variant.tier });
    groups.set(variant.baseSlug, bucket);
  }

  const variantBaseById = new Map<string, string>();
  const variantTierById = new Map<string, number>();
  const cumulativeCraftsById = new Map<string, ItemCraftRequirement[]>();
  const variantsByBase = new Map<string, WeaponVariantOption[]>();

  for (const { entries, baseName } of groups.values()) {
    if (entries.length < 2) continue;

    const sorted = entries.sort((a, b) => a.tier - b.tier);
    const baseEntry = sorted[0];
    const baseId = baseEntry.item.id;

    const runningTotals = new Map<string, ItemCraftRequirement>();
    const options: WeaponVariantOption[] = [];

    for (const { item, tier } of sorted) {
      variantBaseById.set(item.id, baseId);
      variantTierById.set(item.id, tier);

      for (const req of item.craftsFrom ?? []) {
        const existing = runningTotals.get(req.itemId);
        if (existing) {
          existing.qty += req.qty;
        } else {
          runningTotals.set(req.itemId, { ...req });
        }
      }

      const cumulative = mergeRequirements(Array.from(runningTotals.values()));
      cumulativeCraftsById.set(item.id, cumulative);
      options.push({
        itemId: item.id,
        name: item.name,
        slug: item.slug,
        rarity: item.rarity,
        imageUrl: item.imageUrl,
        craftsFrom: cumulative,
        tier
      });
    }

    variantsByBase.set(baseId, options);
  }

  return items.map((item) => {
    const variantBaseId = variantBaseById.get(item.id);
    const variantTier = variantTierById.get(item.id);
    const variants = variantsByBase.get(item.id);

    return {
      ...item,
      craftsFrom: cumulativeCraftsById.get(item.id) ?? item.craftsFrom,
      variantBaseId: variantBaseId ?? undefined,
      variantTier: variantTier ?? undefined,
      variants
    } satisfies ItemRecord;
  });
};

export const dedupeWeaponVariants = (items: ItemRecord[]): ItemRecord[] => {
  const seenBaseIds = new Set<string>();

  return items.filter((item) => {
    if (!item.variantBaseId) return true;
    if (item.variantBaseId !== item.id) return false;
    if (seenBaseIds.has(item.variantBaseId)) return false;
    seenBaseIds.add(item.variantBaseId);
    return true;
  });
};
