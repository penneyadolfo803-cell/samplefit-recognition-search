import assert from "node:assert/strict";
import { createDesignerDashboard } from "../src/lib/designer-dashboard";
import type { BorrowRequest, Sample } from "../src/lib/types";

const baseSample: Sample = {
  id: "s-1",
  sku: "SJ-001",
  styleNo: "D-001",
  name: "测试风衣",
  englishName: "Test Coat",
  category: "风衣",
  season: "2026 秋冬",
  gender: "女装",
  color: "卡其",
  size: "M",
  fabric: "棉混纺",
  composition: "棉 60%, 聚酯 40%",
  craft: "测试",
  styleTags: ["轻户外", "通勤"],
  sampleKind: "physical",
  source: "design",
  ownerTeam: "陈设计",
  status: "in_stock",
  location: "设计部样衣间",
  rack: "SJ-01",
  supplier: "测试供应商",
  retailPrice: "500",
  imageUrl: "",
  enhancedImageUrl: "",
  threeDUrl: "",
  bomItems: [],
  designFiles: [],
  linkedStyles: [],
  linkedFabrics: [],
  linkedPatterns: [],
  visibilityScope: "陈设计,设计中心",
  favorite: false,
  selected: true,
  notes: "",
  borrowHistory: [
    {
      id: "b-1",
      borrower: "业务员A",
      team: "业务一组",
      purpose: "客户看样",
      borrowedAt: "2026-07-01T10:00:00.000Z",
      dueAt: "2026-07-10T10:00:00.000Z"
    }
  ],
  damageHistory: [],
  createdAt: "2026-07-01T08:00:00.000Z",
  updatedAt: "2026-07-01T08:00:00.000Z"
};

const samples: Sample[] = [
  baseSample,
  {
    ...baseSample,
    id: "s-2",
    sku: "SJ-002",
    name: "测试衬衫",
    category: "衬衫",
    ownerTeam: "陈设计",
    selected: false,
    borrowHistory: []
  },
  {
    ...baseSample,
    id: "s-3",
    sku: "SJ-003",
    ownerTeam: "罗设计",
    selected: true,
    borrowHistory: []
  }
];

const requests: BorrowRequest[] = [
  {
    id: "r-1",
    sampleId: "s-2",
    sampleSku: "SJ-002",
    sampleName: "测试衬衫",
    requester: "业务员B",
    team: "跨境电商组",
    phone: "13800000000",
    purpose: "客户看样",
    dueAt: "2026-07-12T10:00:00.000Z",
    status: "fulfilled",
    createdAt: "2026-07-04T10:00:00.000Z"
  }
];

const dashboard = createDesignerDashboard(samples, requests, "陈设计", ["陈设计", "罗设计"]);

assert.equal(dashboard.ownedSamples.length, 2);
assert.equal(dashboard.selectedCount, 1);
assert.equal(dashboard.borrowOrOrderCount, 2);
assert.equal(dashboard.selectionRate, 0.5);
assert.equal(dashboard.orderRate, 1);
assert.equal(dashboard.topClientRegions[0].label, "欧洲品牌客户");
assert.equal(dashboard.topClientRegions[0].count, 1);
assert.equal(dashboard.topClientRegions[1].label, "跨境电商品牌客户");
assert.equal(dashboard.topCategories[0].label, "风衣");

console.log("designer dashboard ok");
