import type { RecommendationAction } from '$lib/types';

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
  variant?: 'simple' | 'token';
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
