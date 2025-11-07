export type SearchBarInputDetail = {
  value: string;
};

export type RecommendationAction = 'save' | 'keep' | 'salvage' | 'sell';

export type RecommendationCardProps = {
  name: string;
  action: RecommendationAction;
  rarity?: string;
  reason?: string;
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
