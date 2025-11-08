export type RecommendationAction = 'save' | 'keep' | 'salvage' | 'sell';

export interface DataProvenance {
  wiki: boolean;
  api: boolean;
  manual?: boolean;
}

export interface ItemRecycleEntry {
  itemId: string;
  name: string;
  qty: number;
}

export type ItemSourceType = 'enemy' | 'scavenge' | 'vendor' | 'craft' | 'quest' | 'area';

export interface ItemSource {
  type: ItemSourceType;
  ref?: string;
  note?: string;
}

export interface ItemVendorStock {
  vendorId: string;
  name: string;
  price?: number;
}

export interface ItemCraftRequirement {
  itemId: string;
  name: string;
  qty: number;
}

export interface ItemCraftProduct {
  productId: string;
  productName: string;
  qty?: number;
}

export interface ItemRecord {
  id: string;
  name: string;
  slug: string;
  rarity?: string;
  category?: string;
  sell: number;
  recycle: ItemRecycleEntry[];
  sources?: ItemSource[];
  vendors?: ItemVendorStock[];
  craftsFrom?: ItemCraftRequirement[];
  craftsInto?: ItemCraftProduct[];
  needsTotals: {
    quests: number;
    workshop: number;
  };
  wikiUrl?: string;
  notes?: string;
  metaforgeId?: string | null;
  zones?: string[];
  provenance: DataProvenance;
}

export interface QuestRequirement {
  itemId: string;
  qty: number;
}

export interface QuestReward {
  itemId?: string;
  name?: string;
  qty?: number;
  coins?: number;
}

export interface Quest {
  id: string;
  name: string;
  chainId?: string;
  giver?: string;
  items: QuestRequirement[];
  rewards?: QuestReward[];
  mapHints?: string[];
}

export interface QuestChain {
  id: string;
  name: string;
  stages: string[];
}

export interface UpgradePack {
  id: string;
  name: string;
  bench: string;
  level: number;
  items: QuestRequirement[];
}

export interface VendorStockItem {
  itemId: string;
  name: string;
  price: number;
}

export interface Vendor {
  id: string;
  name: string;
  location?: string;
  stock?: VendorStockItem[];
}

export interface ItemRecommendation {
  itemId: string;
  name: string;
  rarity?: string;
  action: RecommendationAction;
  rationale: string;
  salvageValue: number;
  contexts: string[];
  needs: {
    quests: number;
    workshop: number;
  };
}

export interface QuestProgress {
  id: string;
  completed: boolean;
  pinned?: boolean;
  notes?: string;
}

export interface BlueprintState {
  id: string;
  name: string;
  bench: string;
  level: number;
  owned: boolean;
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
  freeLoadout?: boolean;
  crew?: string;
}

export interface RunHistoryState {
  entries: RunLogEntry[];
  lastRemoved?: (RunLogEntry & { removedAt: string }) | null;
}

export interface AppSettings {
  freeLoadoutDefault: boolean;
  showExperimental: boolean;
  approvalsEnabled: boolean;
  approvalToken?: string;
}

export interface RecommendationContext {
  items: ItemRecord[];
  quests: Quest[];
  questProgress: QuestProgress[];
  upgrades: UpgradePack[];
  blueprints: BlueprintState[];
}

export interface RunTip {
  id: string;
  message: string;
  level?: 'info' | 'warning' | 'success';
}

export interface RunTipContext {
  activeRun?: RunLogEntry | null;
  recentRuns: RunLogEntry[];
  settings: AppSettings;
  outstandingNeeds: number;
}

export interface ImportPassStatus {
  label: string;
  batches: number;
  records: number;
  lastRunAt: string | null;
  approved: boolean;
  notes: string | null;
}

export interface PipelineFinalSummary {
  items: number;
  quests: number;
  upgrades: number;
  vendors: number;
  chains: number;
  updatedAt: string | null;
}

export interface PipelineMeta {
  version: number;
  generatedAt: string | null;
  passes: Record<string, ImportPassStatus>;
  final: PipelineFinalSummary;
}
