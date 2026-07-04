import type { BorrowRequest, Sample } from "./types";

export interface DesignerDashboardMetric {
  label: string;
  count: number;
}

export interface DesignerDashboard {
  designerName: string;
  ownedSamples: Sample[];
  selectedCount: number;
  borrowOrOrderCount: number;
  selectionRate: number;
  orderRate: number;
  topClientRegions: DesignerDashboardMetric[];
  topCategories: DesignerDashboardMetric[];
}

const teamRegionMap: Record<string, string> = {
  业务一组: "欧洲品牌客户",
  业务二组: "北美品牌客户",
  业务三组: "日韩品牌客户",
  跨境电商组: "跨境电商品牌客户",
  直播业务组: "直播渠道客户"
};

export function createDesignerDashboard(
  samples: Sample[],
  requests: BorrowRequest[],
  designerName: string,
  designerNames: string[]
): DesignerDashboard {
  const ownedSamples = samples.filter((sample) => resolveSampleDesigner(sample, designerNames) === designerName);
  const ownedIds = new Set(ownedSamples.map((sample) => sample.id));
  const relatedRequests = requests.filter((request) => ownedIds.has(request.sampleId) && request.status !== "rejected");
  const borrowRecords = ownedSamples.flatMap((sample) => sample.borrowHistory);
  const selectedCount = ownedSamples.filter((sample) => sample.selected).length;
  const borrowOrOrderCount = relatedRequests.length + borrowRecords.length;

  return {
    designerName,
    ownedSamples,
    selectedCount,
    borrowOrOrderCount,
    selectionRate: ownedSamples.length ? roundRate(selectedCount / ownedSamples.length) : 0,
    orderRate: ownedSamples.length ? roundRate(borrowOrOrderCount / ownedSamples.length) : 0,
    topClientRegions: rankBy(
      [
        ...borrowRecords.map((record) => record.team),
        ...relatedRequests.map((request) => request.team)
      ].map((team) => teamRegionMap[team] || `${team || "未填写"}客户`)
    ),
    topCategories: rankBy(ownedSamples.map((sample) => sample.category || "未维护品类"))
  };
}

export function resolveSampleDesigner(sample: Sample, designerNames: string[]) {
  if (designerNames.includes(sample.ownerTeam)) {
    return sample.ownerTeam;
  }
  const matchedName = designerNames.find((name) => sample.visibilityScope.includes(name));
  if (matchedName) {
    return matchedName;
  }
  if (!designerNames.length) {
    return sample.ownerTeam || "未分配设计师";
  }
  return designerNames[stableIndex(sample.sku || sample.id, designerNames.length)];
}

function rankBy(values: string[]): DesignerDashboardMetric[] {
  const counts = new Map<string, number>();
  const firstSeen = new Map<string, number>();
  values.filter(Boolean).forEach((value, index) => {
    if (!firstSeen.has(value)) {
      firstSeen.set(value, index);
    }
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || (firstSeen.get(a.label) || 0) - (firstSeen.get(b.label) || 0));
}

function roundRate(value: number) {
  return Math.round(value * 100) / 100;
}

function stableIndex(value: string, size: number) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash % size;
}
