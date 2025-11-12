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
  imageUrl?: string | null;
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

export type ItemOverride = Partial<Pick<ItemRecord, 'category' | 'rarity' | 'notes' | 'imageUrl'>>;
export type ItemOverrideMap = Record<string, ItemOverride>;

export interface WantListEntry {
  itemId: string;
  qty: number;
  reason?: string;
  createdAt: string;
}

export interface WantListRequirement {
  itemId: string;
  name: string;
  qty: number;
  depth: number;
}

export interface WantListProductLink {
  itemId: string;
  name: string;
  qty: number;
}

export type WantListMaterialLinkKind = 'yield' | 'satisfies';

export interface WantListMaterialLink {
  materialId: string;
  materialName: string;
  requiredQty: number;
  producedQty: number;
  sourcesNeeded: number;
  sourceItemId: string;
  sourceName: string;
  kind: WantListMaterialLinkKind;
}

export interface WantListResolvedEntry {
  entry: WantListEntry;
  item?: ItemRecord;
  requirements: WantListRequirement[];
  products: WantListProductLink[];
  materials: WantListMaterialLink[];
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
  chainStage?: number | null;
  giver?: string;
  items: QuestRequirement[];
  rewards?: QuestReward[];
  mapHints?: string[];
  previousQuestIds?: string[];
  nextQuestIds?: string[];
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

export interface ProjectRequirement {
  itemId: string;
  qty: number;
}

export interface ProjectPhase {
  id: string;
  order: number;
  name: string;
  description?: string | null;
  requirements: ProjectRequirement[];
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  phases: ProjectPhase[];
}

export interface ProjectProgressState {
  [projectId: string]: {
    [phaseId: string]: {
      [itemId: string]: number;
    };
  };
}

export interface QuestNeedDetail {
  questId: string;
  name: string;
  qty: number;
}

export interface UpgradeNeedDetail {
  upgradeId: string;
  name: string;
  qty: number;
  bench: string;
  level: number;
}

export interface ProjectNeedDetail {
  projectId: string;
  phaseId: string;
  projectName: string;
  phaseName: string;
  qty: number;
}

export interface ItemRecommendation {
  itemId: string;
  name: string;
  slug: string;
  category?: string;
  rarity?: string;
  imageUrl?: string | null;
  action: RecommendationAction;
  rationale: string;
  sellPrice: number;
  salvageValue: number;
  salvageBreakdown: ItemRecycleEntry[];
  questNeeds: QuestNeedDetail[];
  upgradeNeeds: UpgradeNeedDetail[];
  projectNeeds: ProjectNeedDetail[];
  alwaysKeepCategory?: boolean;
  needs: {
    quests: number;
    workshop: number;
    projects: number;
  };
  wishlistSources?: RecommendationWishlistSource[];
}

export interface RecommendationWishlistSource {
  targetItemId: string;
  targetName: string;
  note?: string;
  kind: 'target' | 'requirement';
}

export interface QuestProgress {
  id: string;
  completed: boolean;
  pinned?: boolean;
  notes?: string;
}

export interface BlueprintState {
  id: string;
  owned: boolean;
  name?: string;
  slug?: string;
  rarity?: string | null;
  category?: string | null;
  imageUrl?: string | null;
}

export interface WorkbenchUpgradeState {
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
  alwaysKeepCategories: string[];
  ignoredWantCategories: string[];
}

export interface RecommendationContext {
  items: ItemRecord[];
  quests: Quest[];
  questProgress: QuestProgress[];
  upgrades: UpgradePack[];
  blueprints: BlueprintState[];
  workbenchUpgrades: WorkbenchUpgradeState[];
  projects: Project[];
  projectProgress: ProjectProgressState;
  alwaysKeepCategories: string[];
  wantList: WantListEntry[];
  wantListDependencies: WantListResolvedEntry[];
  wishlistSourcesByItem: Record<string, RecommendationWishlistSource[]>;
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
