import type { BorrowRequest, Sample } from "./types";

export type BillingPeriod = "year" | "month" | "week";
export type BillingSource = "all" | "request" | "borrow";

export interface BorrowBillingRow {
  id: string;
  source: Exclude<BillingSource, "all">;
  date: string;
  borrower: string;
  team: string;
  purpose: string;
  status: string;
  sampleId: string;
  sampleSku: string;
  sampleName: string;
  category: string;
  styleTags: string[];
  location: string;
  rack: string;
  fee: number;
}

export interface BillingBucket {
  key: string;
  label: string;
  count: number;
  totalFee: number;
  averageFee: number;
  rows: BorrowBillingRow[];
}

export interface BillingTeamBucket {
  team: string;
  count: number;
  totalFee: number;
  averageFee: number;
  latestDate: string;
}

export interface RankedMetric {
  label: string;
  count: number;
  fee: number;
}

export interface BorrowAnalytics {
  totalCount: number;
  totalFee: number;
  topBorrowers: RankedMetric[];
  topTeams: RankedMetric[];
  topCategories: RankedMetric[];
  topStyles: RankedMetric[];
  monthlyTrend: RankedMetric[];
  weeklyTrend: RankedMetric[];
  insights: string[];
}

export function createBorrowBillingRows(
  samples: Sample[],
  requests: BorrowRequest[],
  calculateFee: (sample: Sample) => number
): BorrowBillingRow[] {
  const sampleById = new Map(samples.map((sample) => [sample.id, sample]));
  const rows: BorrowBillingRow[] = [];

  for (const request of requests) {
    if (request.status === "rejected") {
      continue;
    }
    const sample = sampleById.get(request.sampleId);
    rows.push(toBillingRow({
      id: `request-${request.id}`,
      source: "request",
      date: request.createdAt,
      borrower: request.requester,
      team: request.team,
      purpose: request.purpose,
      status: request.status,
      sample,
      sampleId: request.sampleId,
      sampleSku: request.sampleSku,
      sampleName: request.sampleName,
      fee: sample ? calculateFee(sample) : 0
    }));
  }

  for (const sample of samples) {
    for (const record of sample.borrowHistory) {
      rows.push(toBillingRow({
        id: `borrow-${sample.id}-${record.id}`,
        source: "borrow",
        date: record.borrowedAt,
        borrower: record.borrower,
        team: record.team,
        purpose: record.purpose,
        status: record.returnedAt ? "returned" : "borrowed",
        sample,
        sampleId: sample.id,
        sampleSku: sample.sku,
        sampleName: sample.name,
        fee: calculateFee(sample)
      }));
    }
  }

  return rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function filterBillingRows(rows: BorrowBillingRow[], source: BillingSource) {
  return source === "all" ? rows : rows.filter((row) => row.source === source);
}

export function summarizeBillingRows(rows: BorrowBillingRow[], period: BillingPeriod): BillingBucket[] {
  const buckets = new Map<string, BorrowBillingRow[]>();
  for (const row of rows) {
    const key = periodKey(row.date, period);
    buckets.set(key, [...(buckets.get(key) || []), row]);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, bucketRows]) => {
      const totalFee = sum(bucketRows.map((row) => row.fee));
      return {
        key,
        label: periodLabel(key, period),
        count: bucketRows.length,
        totalFee,
        averageFee: bucketRows.length ? totalFee / bucketRows.length : 0,
        rows: bucketRows
      };
    });
}

export function summarizeBillingRowsByTeam(rows: BorrowBillingRow[]): BillingTeamBucket[] {
  const buckets = new Map<string, BorrowBillingRow[]>();
  for (const row of rows) {
    const team = row.team || "未填写业务组";
    buckets.set(team, [...(buckets.get(team) || []), row]);
  }

  return [...buckets.entries()]
    .map(([team, bucketRows]) => {
      const totalFee = sum(bucketRows.map((row) => row.fee));
      const sortedDates = bucketRows.map((row) => row.date).sort();
      return {
        team,
        count: bucketRows.length,
        totalFee,
        averageFee: bucketRows.length ? totalFee / bucketRows.length : 0,
        latestDate: sortedDates[sortedDates.length - 1] || ""
      };
    })
    .sort((a, b) => b.totalFee - a.totalFee);
}

export function createBorrowAnalytics(rows: BorrowBillingRow[]): BorrowAnalytics {
  const totalFee = sum(rows.map((row) => row.fee));
  const topBorrowers = rankBy(rows, (row) => row.borrower || "未填写业务员");
  const topTeams = rankBy(rows, (row) => row.team || "未填写业务组");
  const topCategories = rankBy(rows, (row) => row.category || "未维护品类");
  const topStyles = rankBy(
    rows.flatMap((row) => row.styleTags.map((tag) => ({ ...row, tag }))),
    (row) => row.tag || "未维护风格"
  );
  const monthlyTrend = rankBy(rows, (row) => periodLabel(periodKey(row.date, "month"), "month"), 12, false);
  const weeklyTrend = rankBy(rows, (row) => periodLabel(periodKey(row.date, "week"), "week"), 8, false);

  return {
    totalCount: rows.length,
    totalFee,
    topBorrowers,
    topTeams,
    topCategories,
    topStyles,
    monthlyTrend,
    weeklyTrend,
    insights: buildInsights(topBorrowers, topTeams, topCategories, topStyles)
  };
}

function toBillingRow(input: {
  id: string;
  source: "request" | "borrow";
  date: string;
  borrower: string;
  team: string;
  purpose: string;
  status: string;
  sample?: Sample;
  sampleId: string;
  sampleSku: string;
  sampleName: string;
  fee: number;
}): BorrowBillingRow {
  return {
    id: input.id,
    source: input.source,
    date: input.date,
    borrower: input.borrower,
    team: input.team,
    purpose: input.purpose,
    status: input.status,
    sampleId: input.sampleId,
    sampleSku: input.sample?.sku || input.sampleSku,
    sampleName: input.sample?.name || input.sampleName,
    category: input.sample?.category || "",
    styleTags: input.sample?.styleTags || [],
    location: input.sample?.location || "",
    rack: input.sample?.rack || "",
    fee: input.fee
  };
}

function rankBy<T extends { fee: number }>(
  rows: T[],
  getLabel: (row: T) => string,
  limit = 6,
  sortByFee = true
): RankedMetric[] {
  const map = new Map<string, RankedMetric>();
  for (const row of rows) {
    const label = getLabel(row).trim() || "未分类";
    const current = map.get(label) || { label, count: 0, fee: 0 };
    current.count += 1;
    current.fee += row.fee;
    map.set(label, current);
  }
  return [...map.values()]
    .sort((a, b) => (sortByFee ? b.fee - a.fee : b.label.localeCompare(a.label)))
    .slice(0, limit);
}

function buildInsights(
  topBorrowers: RankedMetric[],
  topTeams: RankedMetric[],
  topCategories: RankedMetric[],
  topStyles: RankedMetric[]
) {
  const insights = [];
  if (topBorrowers[0]) {
    insights.push(`${topBorrowers[0].label} 借样最活跃，可提前准备其常借品类。`);
  }
  if (topTeams[0]) {
    insights.push(`${topTeams[0].label} 产生的借样费用最高，建议单独做月度对账。`);
  }
  if (topCategories[0]) {
    insights.push(`${topCategories[0].label} 借用最多，下一季可提前补充同品类新样。`);
  }
  if (topStyles[0]) {
    insights.push(`${topStyles[0].label} 风格需求最高，设计部可围绕该风格做系列化备样。`);
  }
  return insights.length ? insights : ["暂无足够借样数据，先完成前台借样申请或后台借出登记。"];
}

function periodKey(value: string, period: BillingPeriod) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  if (period === "year") {
    return String(year);
  }
  if (period === "month") {
    return `${year}-${month}`;
  }
  return `${year}-W${String(weekOfYear(date)).padStart(2, "0")}`;
}

function periodLabel(key: string, period: BillingPeriod) {
  if (key === "unknown") {
    return "未识别时间";
  }
  if (period === "year") {
    return `${key} 年`;
  }
  if (period === "month") {
    return `${key.replace("-", " 年 ")} 月`;
  }
  return key.replace("-W", " 年第 ") + " 周";
}

function weekOfYear(date: Date) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  return Math.ceil(((copy.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
