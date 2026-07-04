import assert from "node:assert/strict";
import { summarizeBillingRowsByTeam, type BorrowBillingRow } from "../src/lib/billing-analytics";

const rows: BorrowBillingRow[] = [
  {
    id: "borrow-1",
    source: "borrow",
    date: "2026-07-03T10:00:00.000Z",
    borrower: "张三",
    team: "欧洲一组",
    purpose: "客户看样",
    status: "borrowed",
    sampleId: "s-1",
    sampleSku: "SJ-001",
    sampleName: "藏青西装套装",
    category: "套装",
    styleTags: ["通勤"],
    location: "设计部样衣间",
    rack: "SJ-01",
    fee: 39
  },
  {
    id: "request-1",
    source: "request",
    date: "2026-07-04T11:30:00.000Z",
    borrower: "李四",
    team: "欧洲一组",
    purpose: "客户看样",
    status: "approved",
    sampleId: "s-2",
    sampleSku: "SJ-002",
    sampleName: "鼠尾草绿连帽风衣",
    category: "风衣",
    styleTags: ["轻户外"],
    location: "设计部样衣间",
    rack: "SJ-02",
    fee: 34
  },
  {
    id: "borrow-2",
    source: "borrow",
    date: "2026-07-02T09:00:00.000Z",
    borrower: "王五",
    team: "美洲二组",
    purpose: "报价参考",
    status: "returned",
    sampleId: "s-3",
    sampleSku: "DH-001",
    sampleName: "炭灰阔腿西裤",
    category: "西裤",
    styleTags: ["通勤"],
    location: "大货样品间",
    rack: "DH-01",
    fee: 21
  }
];

const summary = summarizeBillingRowsByTeam(rows);

assert.equal(summary.length, 2);
assert.deepEqual(summary[0], {
  team: "欧洲一组",
  count: 2,
  totalFee: 73,
  averageFee: 36.5,
  latestDate: "2026-07-04T11:30:00.000Z"
});
assert.deepEqual(summary[1], {
  team: "美洲二组",
  count: 1,
  totalFee: 21,
  averageFee: 21,
  latestDate: "2026-07-02T09:00:00.000Z"
});

console.log("billing team summary ok");
