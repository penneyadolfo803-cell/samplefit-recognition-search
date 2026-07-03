import type { FieldCompletionResult, QuoteResult, Sample, SampleDraft, SimilarResult } from "./types";

const now = new Date().toISOString();

export const demoSamples: Sample[] = [
  {
    id: "demo-1",
    sku: "SY-2607-018",
    styleNo: "ST-AW26-JK018",
    name: "廓形短款夹克",
    englishName: "Cropped Utility Jacket",
    category: "外套",
    season: "2026 秋冬",
    gender: "女装",
    color: "鼠尾草绿",
    size: "M",
    fabric: "斜纹棉混纺",
    composition: "棉 62%, 聚酯 38%",
    craft: "压明线, 金属拉链",
    styleTags: ["短款", "廓形", "通勤", "轻户外"],
    sampleKind: "physical",
    status: "in_stock",
    location: "上海样衣间",
    rack: "A-03",
    supplier: "禾森制衣",
    retailPrice: "899",
    imageUrl: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=82",
    enhancedImageUrl: "",
    threeDUrl: "https://style3d.com/viewer/demo-jacket",
    bomItems: [{ id: "bom-1", materialName: "斜纹棉混纺", usage: "大身", color: "鼠尾草绿", supplier: "禾森制衣" }],
    designFiles: [{ id: "file-1", name: "短款夹克款式图", type: "AI", url: "designs/ST-AW26-JK018.ai" }],
    linkedStyles: ["款式库: JK-短外套-018"],
    linkedFabrics: ["面料库: FB-TWILL-620"],
    linkedPatterns: ["版型库: PT-JK-041"],
    visibilityScope: "设计中心,华东业务一部",
    favorite: true,
    selected: false,
    notes: "袖口可调节，需复核辅料色号。",
    borrowHistory: [],
    createdAt: now,
    updatedAt: now
  },
  {
    id: "demo-2",
    sku: "SY-2607-026",
    styleNo: "ST-PF26-SK026",
    name: "压褶半身裙",
    englishName: "Pleated Midi Skirt",
    category: "裙装",
    season: "2026 早秋",
    gender: "女装",
    color: "炭黑",
    size: "S",
    fabric: "仿毛哔叽",
    composition: "聚酯 74%, 粘纤 20%, 氨纶 6%",
    craft: "定型压褶, 隐形侧拉链",
    styleTags: ["中长款", "压褶", "学院", "通勤"],
    sampleKind: "physical",
    status: "borrowed",
    location: "上海样衣间",
    rack: "B-11",
    supplier: "越辰服饰",
    retailPrice: "529",
    imageUrl: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=82",
    enhancedImageUrl: "",
    threeDUrl: "",
    bomItems: [{ id: "bom-2", materialName: "仿毛哔叽", usage: "大身", color: "炭黑", supplier: "越辰服饰" }],
    designFiles: [{ id: "file-2", name: "裙装工艺单", type: "PDF", url: "tech/ST-PF26-SK026.pdf" }],
    linkedStyles: ["款式库: SK-压褶-026"],
    linkedFabrics: ["面料库: FB-TR-204"],
    linkedPatterns: ["版型库: PT-SK-019"],
    visibilityScope: "设计中心,拍摄组,业务人员",
    favorite: false,
    selected: true,
    notes: "腰头样版已调整，第二版待回。",
    borrowHistory: [],
    createdAt: now,
    updatedAt: now
  },
  {
    id: "demo-3",
    sku: "SY-2607-041",
    styleNo: "ST-SS26-KN041",
    name: "肌理针织开衫",
    englishName: "Textured Knit Cardigan",
    category: "针织",
    season: "2026 春夏",
    gender: "女装",
    color: "雾白",
    size: "F",
    fabric: "棉麻混纺纱",
    composition: "棉 55%, 亚麻 30%, 尼龙 15%",
    craft: "粗针肌理, 贝壳扣",
    styleTags: ["开衫", "肌理", "度假", "轻薄"],
    sampleKind: "digital3d",
    status: "maintenance",
    location: "杭州版房",
    rack: "K-02",
    supplier: "澜织工坊",
    retailPrice: "699",
    imageUrl: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=82",
    enhancedImageUrl: "",
    threeDUrl: "https://style3d.com/viewer/demo-knit",
    bomItems: [{ id: "bom-3", materialName: "棉麻混纺纱", usage: "大身", color: "雾白", supplier: "澜织工坊" }],
    designFiles: [{ id: "file-3", name: "针织开衫 3D 文件", type: "Style3D", url: "style3d/ST-SS26-KN041.zprj" }],
    linkedStyles: ["款式库: KN-肌理-041"],
    linkedFabrics: ["面料库: YARN-LINEN-055"],
    linkedPatterns: ["版型库: PT-KN-010"],
    visibilityScope: "设计中心,跨境电商组",
    favorite: false,
    selected: false,
    notes: "门襟略松，返修后再入拍摄池。",
    borrowHistory: [],
    createdAt: now,
    updatedAt: now
  }
];

export function draftToDemoSample(draft: SampleDraft): Sample {
  const date = new Date().toISOString();
  return {
    ...demoSamples[0],
    ...draft,
    id: draft.id || crypto.randomUUID(),
    sku: draft.sku || `SY-${Date.now().toString().slice(-6)}`,
    name: draft.name || "未命名样衣",
    status: draft.status || "in_stock",
    styleTags: normalizeList(draft.styleTags),
    linkedStyles: normalizeList(draft.linkedStyles),
    linkedFabrics: normalizeList(draft.linkedFabrics),
    linkedPatterns: normalizeList(draft.linkedPatterns),
    bomItems: draft.bomItems || [],
    designFiles: draft.designFiles || [],
    borrowHistory: [],
    createdAt: date,
    updatedAt: date
  };
}

export function inferDemoFields(partial: Partial<SampleDraft>): FieldCompletionResult {
  const text = `${partial.name || ""} ${partial.englishName || ""} ${partial.notes || ""}`.toLowerCase();
  const fields: Partial<SampleDraft> = {};
  if (/white|白/.test(text)) fields.color = "白色";
  if (/black|黑/.test(text)) fields.color = "黑色";
  if (/t-?shirt|tee|t恤/.test(text)) fields.category = "T恤";
  if (/jacket|blazer|coat|外套|西装/.test(text)) fields.category = "外套";
  if (/skirt|裙/.test(text)) fields.category = "裙装";
  if (/cotton|棉/.test(text)) fields.fabric = partial.fabric || "棉";
  if (/wool|羊毛/.test(text)) fields.fabric = partial.fabric || "羊毛混纺";
  fields.styleTags = normalizeList([fields.category, fields.color, fields.fabric].filter(Boolean));
  return { fields, confidence: 0.58, notes: ["静态演示模式下使用本地规则补全"] };
}

export function searchDemoSamples(
  samples: Sample[],
  payload: {
    text?: string;
    imageDataUrl?: string;
    threshold?: number;
    quantity?: number;
    materialName?: string;
    materialUnitCost?: number;
  }
): SimilarResult[] {
  const terms = tokenize(payload.text || "");
  return samples
    .map((sample) => {
      const haystack = searchable(sample).toLowerCase();
      const hitScore = terms.length ? terms.filter((term) => haystack.includes(term)).length / terms.length : 0.35;
      const imageBoost = payload.imageDataUrl ? 0.18 : 0;
      const score = Math.min(0.98, hitScore * 0.78 + imageBoost);
      return {
        sample,
        score,
        reason: payload.imageDataUrl ? "演示图片特征与字段匹配" : "演示字段匹配",
        quote: buildDemoQuote(sample, payload)
      };
    })
    .filter((result) => result.score >= (payload.threshold || 0))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

export function buildDemoQuote(
  sample: Sample,
  payload: { quantity?: number; materialName?: string; materialUnitCost?: number }
): QuoteResult {
  const quantity = Math.max(1, Number(payload.quantity || 300));
  const retail = Number(String(sample.retailPrice).match(/\d+/)?.[0] || 399);
  const materialCost = payload.materialUnitCost || Math.max(18, retail * 0.24);
  const processFee = /压褶|刺绣|拉链|金属|贝壳扣/.test(sample.craft) ? 38 : 26;
  const laborFee = /外套|针织/.test(sample.category) ? 34 : 24;
  const accessoryCost = Math.max(6, retail * 0.045);
  const subtotal = materialCost + processFee + laborFee + accessoryCost;
  const overhead = subtotal * 0.12;
  const margin = (subtotal + overhead) * (quantity >= 500 ? 0.19 : 0.24);
  const unitPrice = round(subtotal + overhead + margin);
  return {
    sampleId: sample.id,
    sampleName: sample.name,
    quantity,
    currency: "CNY",
    materialPlan: payload.materialName || sample.fabric || "常规面料",
    materialCost: round(materialCost),
    accessoryCost: round(accessoryCost),
    processFee: round(processFee),
    laborFee: round(laborFee),
    overhead: round(overhead),
    margin: round(margin),
    unitPrice,
    totalPrice: round(unitPrice * quantity),
    assumptions: ["静态演示报价", "最终报价需接入真实成本规则复核"],
    generatedAt: new Date().toISOString()
  };
}

function searchable(sample: Sample) {
  return [
    sample.sku,
    sample.styleNo,
    sample.name,
    sample.englishName,
    sample.category,
    sample.color,
    sample.fabric,
    sample.craft,
    sample.styleTags.join(" ")
  ].join(" ");
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[\s,，、]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeList(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }
  return String(value || "")
    .split(/[,，、\s]+/)
    .filter(Boolean);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
