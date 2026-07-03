import type { QuoteRequest, QuoteResult, Sample } from "../src/lib/types";

export function generateQuoteForSample(sample: Sample, request: Partial<QuoteRequest>): QuoteResult {
  const quantity = clampNumber(request.quantity, 1, 999999, 300);
  const retailPrice = parseMoney(sample.retailPrice) || categoryRetailFallback(sample.category);
  const categoryFactor = getCategoryFactor(sample.category);
  const craftFactor = getCraftFactor(sample.craft);
  const quantityFactor = quantity >= 1000 ? 0.88 : quantity >= 500 ? 0.93 : quantity >= 200 ? 1 : 1.08;

  const materialPlan = request.materialName?.trim() || sample.fabric || "常规面料";
  const materialCost =
    clampNumber(request.materialUnitCost, 0, 99999, 0) ||
    roundMoney(Math.max(18, retailPrice * 0.24 * categoryFactor) * quantityFactor);
  const accessoryCost = roundMoney(Math.max(5, retailPrice * 0.045) * craftFactor);
  const processFee = roundMoney((16 + craftFactor * 12) * categoryFactor);
  const laborFee = roundMoney((22 + categoryFactor * 10) * quantityFactor);
  const subtotal = materialCost + accessoryCost + processFee + laborFee;
  const overhead = roundMoney(subtotal * 0.12);
  const marginRate = quantity >= 1000 ? 0.16 : quantity >= 500 ? 0.19 : quantity >= 200 ? 0.23 : 0.28;
  const margin = roundMoney((subtotal + overhead) * marginRate);
  const unitPrice = roundMoney(subtotal + overhead + margin);

  return {
    sampleId: sample.id,
    sampleName: sample.name,
    quantity,
    currency: "CNY",
    materialPlan,
    materialCost,
    accessoryCost,
    processFee,
    laborFee,
    overhead,
    margin,
    unitPrice,
    totalPrice: roundMoney(unitPrice * quantity),
    assumptions: [
      "报价按样衣资料、品类、面料和工艺复杂度估算",
      "面辅料替换后仅重算材料和加工相关费用",
      "最终价格需结合采购价、损耗率、税费和交期复核"
    ],
    generatedAt: new Date().toISOString()
  };
}

function parseMoney(value: string) {
  const match = String(value || "").match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function categoryRetailFallback(category: string) {
  if (/外套|大衣|羽绒|夹克/.test(category)) {
    return 799;
  }
  if (/裙|裤/.test(category)) {
    return 459;
  }
  if (/针织|毛衫/.test(category)) {
    return 599;
  }
  if (/衬衫|T恤|卫衣/.test(category)) {
    return 299;
  }
  return 399;
}

function getCategoryFactor(category: string) {
  if (/外套|大衣|羽绒|夹克/.test(category)) {
    return 1.35;
  }
  if (/针织|毛衫/.test(category)) {
    return 1.16;
  }
  if (/裙|裤/.test(category)) {
    return 1.02;
  }
  if (/T恤|衬衫/.test(category)) {
    return 0.82;
  }
  return 1;
}

function getCraftFactor(craft: string) {
  const text = craft || "";
  let factor = 1;
  if (/压褶|绗线|刺绣|提花|水洗|印花/.test(text)) {
    factor += 0.32;
  }
  if (/拉链|纽扣|贝壳扣|金属/.test(text)) {
    factor += 0.16;
  }
  if (/手工|钉珠|复杂/.test(text)) {
    factor += 0.48;
  }
  return factor;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}
