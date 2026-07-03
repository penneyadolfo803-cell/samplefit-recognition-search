import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createBulkTestSamples } from "../src/lib/bulk-fixtures";
import { createDesignTestSamples } from "../src/lib/design-fixtures";
import type { BorrowRecord, BorrowRequest, Sample, SampleDraft } from "../src/lib/types";

export interface Database {
  samples: Sample[];
  borrowRequests: BorrowRequest[];
}

const dbPath = path.join(process.cwd(), "data", "db.json");

export async function readDb(): Promise<Database> {
  await mkdir(path.dirname(dbPath), { recursive: true });

  try {
    const content = await readFile(dbPath, "utf8");
    const db = JSON.parse(content) as Partial<Database>;
    return {
      samples: Array.isArray(db.samples) ? normalizeSamples(db.samples) : seedSamples(),
      borrowRequests: Array.isArray(db.borrowRequests) ? db.borrowRequests : []
    };
  } catch {
    const db = { samples: seedSamples(), borrowRequests: [] };
    await writeDb(db);
    return db;
  }
}

export async function writeDb(db: Database) {
  await mkdir(path.dirname(dbPath), { recursive: true });
  await writeFile(dbPath, JSON.stringify(db, null, 2), "utf8");
}

function normalizeSamples(samples: Sample[]) {
  const now = new Date().toISOString();
  const designFixtures = createDesignTestSamples(now);
  const bulkFixtures = createBulkTestSamples(now);
  const fixtureSamples = [...designFixtures, ...bulkFixtures];
  const fixtureById = new Map(fixtureSamples.map((sample) => [sample.id, sample]));
  const existing = samples.map((sample) => {
    const normalized = {
      ...sample,
      source: sample.source || "design",
      ownerTeam: sample.ownerTeam || "设计部"
    };
    const latestFixture = fixtureById.get(normalized.id);
    if (!latestFixture) {
      return normalized;
    }
    return {
      ...latestFixture,
      favorite: Boolean(normalized.favorite),
      selected: Boolean(normalized.selected),
      status: normalized.status || latestFixture.status,
      borrowHistory: Array.isArray(normalized.borrowHistory) ? normalized.borrowHistory : [],
      createdAt: normalized.createdAt || latestFixture.createdAt,
      updatedAt: now
    };
  });
  const existingIds = new Set(existing.map((sample) => sample.id));
  const missingFixtures = fixtureSamples.filter((sample) => !existingIds.has(sample.id));
  return [...existing, ...missingFixtures];
}

export function toSample(draft: SampleDraft): Sample {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    sku: draft.sku || nextSku(),
    styleNo: draft.styleNo || "",
    name: draft.name || "未命名样衣",
    englishName: draft.englishName || "",
    category: draft.category || "",
    season: draft.season || "",
    gender: draft.gender || "",
    color: draft.color || "",
    size: draft.size || "",
    fabric: draft.fabric || "",
    composition: draft.composition || "",
    craft: draft.craft || "",
    styleTags: normalizeTags(draft.styleTags),
    sampleKind: draft.sampleKind || "physical",
    source: draft.source || "design",
    ownerTeam: draft.ownerTeam || "设计部",
    status: draft.status || "in_stock",
    location: draft.location || "",
    rack: draft.rack || "",
    supplier: draft.supplier || "",
    retailPrice: draft.retailPrice || "",
    imageUrl: draft.imageUrl || "",
    enhancedImageUrl: draft.enhancedImageUrl || "",
    threeDUrl: draft.threeDUrl || "",
    bomItems: normalizeBom(draft.bomItems),
    designFiles: normalizeFiles(draft.designFiles),
    linkedStyles: normalizeTags(draft.linkedStyles),
    linkedFabrics: normalizeTags(draft.linkedFabrics),
    linkedPatterns: normalizeTags(draft.linkedPatterns),
    visibilityScope: draft.visibilityScope || "设计中心,业务人员",
    favorite: Boolean(draft.favorite),
    selected: Boolean(draft.selected),
    notes: draft.notes || "",
    borrowHistory: [],
    createdAt: now,
    updatedAt: now
  };
}

export function mergeSample(sample: Sample, patch: Partial<SampleDraft>): Sample {
  return {
    ...sample,
    ...patch,
    styleTags: normalizeTags(patch.styleTags ?? sample.styleTags),
    bomItems: normalizeBom(patch.bomItems ?? sample.bomItems),
    designFiles: normalizeFiles(patch.designFiles ?? sample.designFiles),
    linkedStyles: normalizeTags(patch.linkedStyles ?? sample.linkedStyles),
    linkedFabrics: normalizeTags(patch.linkedFabrics ?? sample.linkedFabrics),
    linkedPatterns: normalizeTags(patch.linkedPatterns ?? sample.linkedPatterns),
    updatedAt: new Date().toISOString()
  };
}

export function createBorrowRecord(
  payload: Omit<BorrowRecord, "id" | "borrowedAt">
): BorrowRecord {
  return {
    id: crypto.randomUUID(),
    borrower: payload.borrower,
    team: payload.team,
    purpose: payload.purpose,
    dueAt: payload.dueAt,
    note: payload.note,
    borrowedAt: new Date().toISOString()
  };
}

export function createBorrowRequest(
  sample: Sample,
  payload: Pick<BorrowRequest, "requester" | "team" | "phone" | "purpose" | "dueAt" | "note">
): BorrowRequest {
  return {
    id: crypto.randomUUID(),
    sampleId: sample.id,
    sampleSku: sample.sku,
    sampleName: sample.name,
    requester: payload.requester,
    team: payload.team,
    phone: payload.phone,
    purpose: payload.purpose,
    dueAt: payload.dueAt,
    status: "pending",
    note: payload.note,
    createdAt: new Date().toISOString()
  };
}

export function searchableText(sample: Sample) {
  return [
    sample.sku,
    sample.styleNo,
    sample.name,
    sample.englishName,
    sample.category,
    sample.season,
    sample.gender,
    sample.color,
    sample.size,
    sample.fabric,
    sample.composition,
    sample.craft,
    sample.supplier,
    sample.source,
    sample.ownerTeam,
    sample.location,
    sample.rack,
    sample.notes,
    sample.styleTags.join(" "),
    sample.bomItems.map((item) => `${item.materialName} ${item.usage} ${item.color}`).join(" "),
    sample.designFiles.map((file) => `${file.name} ${file.type}`).join(" "),
    sample.linkedStyles.join(" "),
    sample.linkedFabrics.join(" "),
    sample.linkedPatterns.join(" ")
  ]
    .filter(Boolean)
    .join(" ");
}

export function lexicalScore(query: string, sample: Sample) {
  const terms = query
    .toLowerCase()
    .split(/[\s,，、]+/)
    .filter(Boolean);
  if (!terms.length) {
    return 0;
  }
  const haystack = searchableText(sample).toLowerCase();
  const hits = terms.filter((term) => haystack.includes(term)).length;
  return hits / terms.length;
}

function normalizeTags(tags: unknown) {
  if (Array.isArray(tags)) {
    return tags.map(String).map((tag) => tag.trim()).filter(Boolean).slice(0, 8);
  }
  return String(tags || "")
    .split(/[,，、\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeBom(items: unknown) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item) => ({
      id: String((item as any).id || crypto.randomUUID()),
      materialName: String((item as any).materialName || ""),
      usage: String((item as any).usage || ""),
      color: String((item as any).color || ""),
      supplier: String((item as any).supplier || "")
    }))
    .filter((item) => item.materialName || item.usage || item.color || item.supplier)
    .slice(0, 12);
}

function normalizeFiles(items: unknown) {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item) => ({
      id: String((item as any).id || crypto.randomUUID()),
      name: String((item as any).name || ""),
      type: String((item as any).type || ""),
      url: String((item as any).url || "")
    }))
    .filter((item) => item.name || item.url)
    .slice(0, 12);
}

function nextSku() {
  const date = new Date();
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate()
  ).padStart(2, "0")}`;
  return `SY-${stamp}-${String(Math.floor(Math.random() * 900) + 100)}`;
}

function seedSamples(): Sample[] {
  const now = new Date().toISOString();
  return [
    {
      id: "seed-ceshi001",
      sku: "ceshi001",
      styleNo: "FXY24AW049",
      name: "橄榄绿灯芯绒拼领衬衫夹克",
      englishName: "Olive Corduroy-Trim Shirt Jacket",
      category: "衬衫夹克",
      season: "2024 秋冬",
      gender: "女装",
      color: "橄榄绿/浅卡其绿",
      size: "84",
      fabric: "仿麂皮桃皮绒复合面料",
      composition: "棉 55%, 聚酯 40%, 氨纶 5%",
      craft: "灯芯绒拼领, 暗门襟, 前中纽扣, 贴袋, 绗线袋面, 袖口翻边",
      styleTags: ["衬衫夹克", "灯芯绒拼接", "贴袋", "宽松", "户外休闲", "2024AW"],
      sampleKind: "physical",
      source: "design",
      ownerTeam: "设计部",
      status: "borrowed",
      location: "汉商巴恩风样衣间",
      rack: "HS-09-AW",
      supplier: "信兴样衣组",
      retailPrice: "699",
      imageUrl: "./sample-images/ceshi001-front-dark.jpg",
      enhancedImageUrl: "./sample-images/ceshi001-search.jpg",
      threeDUrl: "",
      bomItems: [
        {
          id: "bom-cs-1",
          materialName: "仿麂皮桃皮绒",
          usage: "大身",
          color: "浅卡其绿",
          supplier: "信兴面料仓"
        },
        {
          id: "bom-cs-2",
          materialName: "灯芯绒",
          usage: "领子/袖口/袋口",
          color: "橄榄棕",
          supplier: "信兴面料仓"
        },
        {
          id: "bom-cs-3",
          materialName: "树脂纽扣",
          usage: "前中门襟",
          color: "深咖",
          supplier: "辅料仓"
        }
      ],
      designFiles: [
        {
          id: "file-cs-1",
          name: "正面样衣图",
          type: "JPG",
          url: "./sample-images/ceshi001-front-dark.jpg"
        },
        {
          id: "file-cs-2",
          name: "背面样衣图",
          type: "JPG",
          url: "./sample-images/ceshi001-back-dark.jpg"
        },
        {
          id: "file-cs-3",
          name: "检索测试图",
          type: "JPG",
          url: "./sample-images/ceshi001-search.jpg"
        }
      ],
      linkedStyles: ["款式库: FXY24AW049"],
      linkedFabrics: ["面料库: 仿麂皮桃皮绒", "面料库: 灯芯绒拼接"],
      linkedPatterns: ["版型库: 女装宽松短外套-84"],
      visibilityScope: "业务一组,设计中心,样衣管理员",
      favorite: true,
      selected: true,
      notes: "AI 字段补全测试款。图 3 用于以图搜图，应命中该款并生成一件报价。",
      borrowHistory: [
        {
          id: "borrow-cs-1",
          borrower: "业务一组",
          team: "业务组",
          purpose: "客户看样与一件报价",
          borrowedAt: now,
          dueAt: new Date(Date.now() + 86400000 * 3).toISOString(),
          note: "测试借出"
        }
      ],
      createdAt: now,
      updatedAt: now
    },
    {
      id: "seed-1",
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
      source: "design",
      ownerTeam: "设计部",
      status: "in_stock",
      location: "上海样衣间",
      rack: "A-03",
      supplier: "禾森制衣",
      retailPrice: "899",
      imageUrl:
        "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=82",
      enhancedImageUrl: "",
      threeDUrl: "https://style3d.com/viewer/demo-jacket",
      bomItems: [
        {
          id: "bom-1",
          materialName: "斜纹棉混纺",
          usage: "大身",
          color: "鼠尾草绿",
          supplier: "禾森制衣"
        },
        {
          id: "bom-2",
          materialName: "YKK 金属拉链",
          usage: "门襟",
          color: "哑银",
          supplier: "辅料仓"
        }
      ],
      designFiles: [
        {
          id: "file-1",
          name: "短款夹克款式图",
          type: "AI",
          url: "designs/ST-AW26-JK018.ai"
        }
      ],
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
      id: "seed-2",
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
      source: "design",
      ownerTeam: "设计部",
      status: "borrowed",
      location: "上海样衣间",
      rack: "B-11",
      supplier: "越辰服饰",
      retailPrice: "529",
      imageUrl:
        "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=82",
      enhancedImageUrl: "",
      threeDUrl: "",
      bomItems: [
        {
          id: "bom-3",
          materialName: "仿毛哔叽",
          usage: "大身",
          color: "炭黑",
          supplier: "越辰服饰"
        }
      ],
      designFiles: [
        {
          id: "file-2",
          name: "裙装工艺单",
          type: "PDF",
          url: "tech/ST-PF26-SK026.pdf"
        }
      ],
      linkedStyles: ["款式库: SK-压褶-026"],
      linkedFabrics: ["面料库: FB-TR-204"],
      linkedPatterns: ["版型库: PT-SK-019"],
      visibilityScope: "设计中心,拍摄组,业务人员",
      favorite: false,
      selected: true,
      notes: "腰头样版已调整，第二版待回。",
      borrowHistory: [
        {
          id: "borrow-seed-1",
          borrower: "林可",
          team: "拍摄组",
          purpose: "早秋 Lookbook 拍摄",
          borrowedAt: now,
          dueAt: new Date(Date.now() + 86400000 * 4).toISOString()
        }
      ],
      createdAt: now,
      updatedAt: now
    },
    {
      id: "seed-3",
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
      source: "design",
      ownerTeam: "设计部",
      status: "maintenance",
      location: "杭州版房",
      rack: "K-02",
      supplier: "澜织工坊",
      retailPrice: "699",
      imageUrl:
        "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=82",
      enhancedImageUrl: "",
      threeDUrl: "https://style3d.com/viewer/demo-knit",
      bomItems: [
        {
          id: "bom-4",
          materialName: "棉麻混纺纱",
          usage: "大身",
          color: "雾白",
          supplier: "澜织工坊"
        }
      ],
      designFiles: [
        {
          id: "file-3",
          name: "针织开衫 3D 文件",
          type: "Style3D",
          url: "style3d/ST-SS26-KN041.zprj"
        }
      ],
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
    },
    ...createDesignTestSamples(now),
    ...createBulkTestSamples(now)
  ];
}
