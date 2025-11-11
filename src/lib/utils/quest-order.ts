export type QuestChainInfo = { chainId: string; chainName: string; index: number };

const UNKNOWN_CHAIN_INDEX = Number.MAX_SAFE_INTEGER;

const getChainOrderIndex = (chainOrder: Map<string, number>, chainId: string) =>
  chainOrder.get(chainId) ?? UNKNOWN_CHAIN_INDEX;

const getQuestLabel = (
  questById: Map<string, { name?: string }>,
  questId: string
) => questById.get(questId)?.name ?? questId;

export const createQuestOrderComparator = (
  chainOrder: Map<string, number>,
  questChainLookup: Map<string, QuestChainInfo>,
  questById: Map<string, { name?: string }>
) => {
  return (aId: string, bId: string) => {
    const infoA = questChainLookup.get(aId);
    const infoB = questChainLookup.get(bId);
    if (infoA && infoB) {
      const orderA = getChainOrderIndex(chainOrder, infoA.chainId);
      const orderB = getChainOrderIndex(chainOrder, infoB.chainId);
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      if (infoA.chainId === infoB.chainId) {
        return infoA.index - infoB.index;
      }
      const chainNameA = infoA.chainName ?? infoA.chainId;
      const chainNameB = infoB.chainName ?? infoB.chainId;
      if (chainNameA !== chainNameB) {
        return chainNameA.localeCompare(chainNameB);
      }
    }
    if (infoA) return -1;
    if (infoB) return 1;
    return getQuestLabel(questById, aId).localeCompare(getQuestLabel(questById, bId));
  };
};

export const sortQuestIds = (
  questIds: string[],
  chainOrder: Map<string, number>,
  questChainLookup: Map<string, QuestChainInfo>,
  questById: Map<string, { name?: string }>
) => questIds.slice().sort(createQuestOrderComparator(chainOrder, questChainLookup, questById));
