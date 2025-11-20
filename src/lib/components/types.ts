import type { ItemRecycleEntry, RecommendationAction, RecommendationWishlistSource } from '$lib/types';

export type SearchBarInputDetail = {
  value: string;
};

export type RecommendationCardProps = {
  name: string;
  action: RecommendationAction;
  rarity?: string;
  reason?: string;
  usageLines?: string[];
  category?: string;
  slug?: string;
  imageUrl?: string | null;
  sellPrice?: number;
  salvageValue?: number;
  salvageBreakdown?: ItemRecycleEntry[];
  variant?: 'simple' | 'token';
  wishlistSources?: RecommendationWishlistSource[];
  showActionBadge?: boolean;
};

export type ChecklistItem = {
  id: string;
  label: string;
  completed?: boolean;
};

export type RunTimerProps = {
  label?: string;
  elapsed: number;
  isRunning?: boolean;
};
