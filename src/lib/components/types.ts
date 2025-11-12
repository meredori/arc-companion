import type {
  ItemRecycleEntry,
  ProjectNeedDetail,
  QuestNeedDetail,
  RecommendationAction,
  UpgradeNeedDetail
} from '$lib/types';

export type SearchBarInputDetail = {
  value: string;
};

export type RecommendationCardProps = {
  name: string;
  action: RecommendationAction;
  rarity?: string;
  reason?: string;
  category?: string;
  slug?: string;
  imageUrl?: string | null;
  sellPrice?: number;
  salvageValue?: number;
  salvageBreakdown?: ItemRecycleEntry[];
  questNeeds?: QuestNeedDetail[];
  upgradeNeeds?: UpgradeNeedDetail[];
  projectNeeds?: ProjectNeedDetail[];
  needs?: {
    quests?: number;
    workshop?: number;
    projects?: number;
  };
  alwaysKeepCategory?: boolean;
  variant?: 'simple' | 'token';
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
