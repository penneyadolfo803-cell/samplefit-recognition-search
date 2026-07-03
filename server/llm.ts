import type { SampleDraft } from "../src/lib/types";

const config = {
  key: process.env.LLM_API_KEY || "",
  textBaseUrl: process.env.LLM_TEXT_BASE_URL || "https://llm.guohe-sh.com/api/doubao/v3",
  textModel: process.env.LLM_TEXT_MODEL || "doubao-seed-2-0-lite-260215",
  visionModel: process.env.LLM_VISION_MODEL || "doubao-seed-1-6-vision-250815",
  embeddingModel: process.env.LLM_EMBEDDING_MODEL || "doubao-embedding-vision-251215",
  imageEditBaseUrl: process.env.LLM_IMAGE_EDIT_BASE_URL || "https://llm.guohe-sh.com/api/openai/v2",
  imageModel: process.env.LLM_IMAGE_MODEL || "gpt-image-2"
};

export function isAiConfigured() {
  return Boolean(config.key);
}

export function getModelConfig() {
  return {
    text: config.textModel,
    vision: config.visionModel,
    embedding: config.embeddingModel,
    image: config.imageModel
  };
}

export async function completeSampleFields(input: {
  partial: Partial<SampleDraft>;
  imageDataUrl?: string;
}) {
  ensureKey();

  const hasImage = Boolean(input.imageDataUrl);
  const userContent: unknown[] = [
    {
      type: "text",
      text: [
        "请补全服装样衣档案。只返回 JSON, 不要 Markdown。",
        "JSON 格式: {\"fields\":{...},\"confidence\":0.82,\"notes\":[\"...\"]}",
        "fields 可包含 sku,styleNo,name,englishName,category,season,gender,color,size,fabric,composition,craft,styleTags,sampleKind,source,ownerTeam,supplier,retailPrice,location,rack,threeDUrl,linkedStyles,linkedFabrics,linkedPatterns,visibilityScope,notes。",
        "已知字段必须保留，不要用空字符串覆盖已提供的有效信息。",
        "字段值不确定时留空或写在 notes 中，不要编造品牌授权信息。",
        `当前已知字段: ${JSON.stringify(input.partial)}`
      ].join("\n")
    }
  ];

  if (input.imageDataUrl) {
    userContent.push({
      type: "image_url",
      image_url: { url: input.imageDataUrl }
    });
  }

  const payload = {
    model: hasImage ? config.visionModel : config.textModel,
    stream: false,
    messages: [
      {
        role: "system",
        content:
          "你是资深服装样衣资料员，擅长从款式图、商品描述和面料信息中提取结构化样衣字段。输出必须是严格 JSON。"
      },
      { role: "user", content: userContent }
    ]
  };

  const json = await postJson(`${config.textBaseUrl}/chat/completions`, payload, {
    Authorization: `Bearer ${config.key}`
  });
  const content = extractMessage(json);
  const parsed = parseJsonObject(content);

  return {
    fields: sanitizeFields(parsed.fields || parsed),
    confidence: clampNumber(parsed.confidence, 0, 1, 0.62),
    notes: Array.isArray(parsed.notes) ? parsed.notes.map(String).slice(0, 4) : []
  };
}

export async function enhanceSampleImage(imageDataUrl: string, prompt?: string) {
  ensureKey();

  const imagePart = dataUrlToBlob(imageDataUrl);
  const form = new FormData();
  form.append("prompt", prompt || defaultEnhancePrompt);
  form.append("n", "1");
  form.append("size", "1024x1024");
  form.append("quality", "low");
  form.append("model", config.imageModel);
  form.append("image", imagePart.blob, imagePart.filename);

  const response = await fetch(`${config.imageEditBaseUrl}/images/edits`, {
    method: "POST",
    headers: { "api-key": config.key },
    body: form
  });

  if (!response.ok) {
    throw new Error(await safeError(response, "图片美化失败"));
  }

  const json = await response.json();
  const imageUrl = extractImageUrl(json);

  if (!imageUrl) {
    throw new Error("图片美化完成但未返回图片地址");
  }

  return { imageUrl, providerPayload: json };
}

export async function createMultimodalEmbedding(input: {
  imageDataUrl?: string;
  imageUrl?: string;
  text?: string;
}) {
  ensureKey();

  const items: unknown[] = [];
  const imageUrl = input.imageDataUrl || input.imageUrl;

  if (imageUrl) {
    items.push({ type: "image_url", image_url: { url: imageUrl } });
  }

  if (input.text?.trim()) {
    items.push({ type: "text", text: input.text.trim() });
  }

  if (!items.length) {
    throw new Error("缺少图片或文本，无法生成检索向量");
  }

  const json = await postJson(
    `${config.textBaseUrl}/embeddings/multimodal`,
    {
      model: config.embeddingModel,
      encoding_format: "float",
      input: items
    },
    { Authorization: `Bearer ${config.key}` }
  );

  return extractEmbedding(json);
}

export function cosineSimilarity(a: number[], b: number[]) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const length = Math.min(a.length, b.length);

  for (let index = 0; index < length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }

  if (!normA || !normB) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function ensureKey() {
  if (!config.key) {
    throw new Error("LLM_API_KEY 未配置");
  }
}

async function postJson(url: string, body: unknown, headers: Record<string, string>) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(await safeError(response, "AI 请求失败"));
  }

  return response.json();
}

async function safeError(response: Response, fallback: string) {
  const text = await response.text().catch(() => "");
  return `${fallback}: ${response.status} ${text.slice(0, 500)}`;
}

function extractMessage(payload: any) {
  return (
    payload?.choices?.[0]?.message?.content ||
    payload?.output_text ||
    payload?.data?.content ||
    ""
  );
}

function parseJsonObject(text: string) {
  const clean = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const start = clean.indexOf("{");
    const end = clean.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(clean.slice(start, end + 1));
    }
  }
  throw new Error("AI 返回不是可解析的 JSON");
}

function sanitizeFields(fields: Record<string, unknown>) {
  const allowed = new Set([
    "sku",
    "styleNo",
    "name",
    "englishName",
    "category",
    "season",
    "gender",
    "color",
    "size",
    "fabric",
    "composition",
    "craft",
    "styleTags",
    "supplier",
    "retailPrice",
    "location",
    "rack",
    "sampleKind",
    "source",
    "ownerTeam",
    "threeDUrl",
    "linkedStyles",
    "linkedFabrics",
    "linkedPatterns",
    "visibilityScope",
    "notes"
  ]);
  const result: Record<string, unknown> = {};

  Object.entries(fields || {}).forEach(([key, value]) => {
    if (!allowed.has(key) || value === undefined || value === null) {
      return;
    }
    if (Array.isArray(value)) {
      const tags = normalizeTags(value);
      if (tags.length) {
        result[key] = tags;
      }
      return;
    }
    const text = String(value).trim();
    if (text) {
      result[key] = text;
    }
  });

  return result;
}

function normalizeTags(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).map((tag) => tag.trim()).filter(Boolean).slice(0, 8);
  }
  return String(value)
    .split(/[,，、\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}

function dataUrlToBlob(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error("图片格式必须是 data URL");
  }

  const mime = match[1];
  const bytes = Buffer.from(match[2], "base64");
  const blob = new Blob([new Uint8Array(bytes)], { type: mime });
  const extension = mime.includes("png") ? "png" : "jpg";

  return { blob, filename: `sample.${extension}` };
}

function extractImageUrl(payload: any) {
  const first = payload?.data?.[0] || payload?.data || payload;
  if (first?.url) {
    return first.url;
  }
  if (first?.b64_json) {
    const value = String(first.b64_json);
    if (value.startsWith("http") || value.startsWith("data:")) {
      return value;
    }
    return `data:image/png;base64,${value}`;
  }
  if (first?.image_url) {
    return first.image_url;
  }
  return "";
}

function extractEmbedding(payload: any): number[] {
  const candidates = [
    payload?.data?.embedding,
    payload?.data?.[0]?.embedding,
    payload?.embedding,
    payload?.result?.embedding
  ];
  const embedding = candidates.find((candidate) =>
    Array.isArray(candidate) && candidate.every((item) => typeof item === "number")
  );

  if (!embedding) {
    throw new Error("Embedding 接口未返回向量");
  }

  return embedding;
}

const defaultEnhancePrompt = [
  "将这张样衣图片美化为高质量白底模特图，用于服装样衣库归档、客户看样和业务报价。",
  "保留原样衣的版型、廓形、颜色、面料纹理、辅料、口袋、纽扣、拼接、明线和图案，不要改款。",
  "使用自然站姿的真人模特或无脸模特展示成衣上身效果，白色或浅灰纯净背景，正面构图，光线均匀。",
  "衣服要平整、有质感，适当修正褶皱、曝光、白平衡和边缘瑕疵，但不能改变真实工艺细节。",
  "不要添加文字、水印、吊牌、品牌标识、复杂场景或额外配饰。"
].join(" ");
