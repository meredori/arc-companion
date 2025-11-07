export interface ItemRecommendation {
  id: string;
  name: string;
  action: 'save' | 'keep' | 'salvage' | 'sell';
  rationale: string;
  sources: string[];
}

export interface RunLogEntry {
  id: string;
  startedAt: string;
  endedAt?: string;
  totalXp?: number;
  totalValue?: number;
  extractedValue?: number;
  deaths?: number;
  notes?: string;
}

export interface QuestProgress {
  id: string;
  name: string;
  completed: boolean;
  requiredItems: string[];
}

export interface BlueprintState {
  id: string;
  name: string;
  owned: boolean;
}
