import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Sample } from "../src/lib/types";
import { generateQuoteForSample } from "./quote";
import {
  completeSampleFields,
  cosineSimilarity,
  createMultimodalEmbedding,
  enhanceSampleImage,
  getModelConfig,
  isAiConfigured
} from "./llm";
import {
  createBorrowRecord,
  createBorrowRequest,
  lexicalScore,
  mergeSample,
  readDb,
  searchableText,
  toSample,
  writeDb
} from "./store";

const app = express();
const port = Number(process.env.PORT || 4174);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const fixedAiCreditsRemaining = 1200;

app.use(cors());
app.use(express.json({ limit: "30mb" }));

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    aiConfigured: isAiConfigured(),
    aiCreditsRemaining: fixedAiCreditsRemaining,
    models: getModelConfig()
  });
});

app.get("/api/samples", async (_request, response, next) => {
  try {
    const db = await readDb();
    response.json(db.samples.map(publicSample));
  } catch (error) {
    next(error);
  }
});

app.post("/api/samples", async (request, response, next) => {
  try {
    const db = await readDb();
    const sample = toSample(request.body);

    if (isAiConfigured()) {
      sample.embedding = await tryEmbedding(sample.imageUrl, searchableText(sample));
    }

    db.samples.unshift(sample);
    await writeDb(db);
    response.status(201).json(publicSample(sample));
  } catch (error) {
    next(error);
  }
});

app.patch("/api/samples/:id", async (request, response, next) => {
  try {
    const db = await readDb();
    const index = db.samples.findIndex((sample) => sample.id === request.params.id);

    if (index < 0) {
      response.status(404).send("样衣不存在");
      return;
    }

    const updated = mergeSample(db.samples[index], request.body);
    const shouldReindex =
      request.body.imageUrl !== undefined ||
      request.body.name !== undefined ||
      request.body.category !== undefined ||
      request.body.styleTags !== undefined;

    if (shouldReindex && isAiConfigured()) {
      updated.embedding = await tryEmbedding(updated.imageUrl, searchableText(updated));
    }

    db.samples[index] = updated;
    await writeDb(db);
    response.json(publicSample(updated));
  } catch (error) {
    next(error);
  }
});

app.post("/api/samples/:id/borrow", async (request, response, next) => {
  try {
    const db = await readDb();
    const sample = db.samples.find((item) => item.id === request.params.id);

    if (!sample) {
      response.status(404).send("样衣不存在");
      return;
    }

    const record = createBorrowRecord(request.body);
    sample.status = "borrowed";
    sample.borrowHistory = [record, ...sample.borrowHistory];
    sample.updatedAt = new Date().toISOString();
    await writeDb(db);
    response.json(publicSample(sample));
  } catch (error) {
    next(error);
  }
});

app.post("/api/samples/:id/return", async (request, response, next) => {
  try {
    const db = await readDb();
    const sample = db.samples.find((item) => item.id === request.params.id);

    if (!sample) {
      response.status(404).send("样衣不存在");
      return;
    }

    const active = sample.borrowHistory.find((record) => !record.returnedAt);
    if (active) {
      active.returnedAt = new Date().toISOString();
      active.note = request.body?.note || active.note;
    }
    sample.status = "in_stock";
    sample.updatedAt = new Date().toISOString();
    await writeDb(db);
    response.json(publicSample(sample));
  } catch (error) {
    next(error);
  }
});

app.get("/api/borrow-requests", async (_request, response, next) => {
  try {
    const db = await readDb();
    response.json(db.borrowRequests);
  } catch (error) {
    next(error);
  }
});

app.post("/api/borrow-requests", async (request, response, next) => {
  try {
    const db = await readDb();
    const sample = db.samples.find((item) => item.id === request.body.sampleId);

    if (!sample) {
      response.status(404).send("样衣不存在");
      return;
    }

    const record = createBorrowRequest(sample, {
      requester: cleanText(request.body.requester),
      team: cleanText(request.body.team),
      phone: cleanText(request.body.phone),
      purpose: cleanText(request.body.purpose) || "客户看样",
      dueAt: cleanText(request.body.dueAt) || new Date(Date.now() + 86400000 * 3).toISOString(),
      note: cleanText(request.body.note)
    });

    if (!record.requester || !record.team) {
      response.status(400).send("请填写申请人和业务组");
      return;
    }

    db.borrowRequests.unshift(record);
    await writeDb(db);
    response.status(201).json(record);
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/complete-fields", async (request, response, next) => {
  try {
    const result = await completeSampleFields(request.body);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/enhance-image", async (request, response, next) => {
  try {
    const result = await enhanceSampleImage(request.body.imageDataUrl, request.body.prompt);
    response.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/ai/search-similar", async (request, response, next) => {
  try {
    const db = await readDb();
    const text = String(request.body.text || "");
    const threshold = clamp(Number(request.body.threshold ?? 0), 0, 1);
    const quotePayload = {
      quantity: Number(request.body.quantity || 300),
      materialName: request.body.materialName,
      materialUnitCost: request.body.materialUnitCost
    };
    let queryEmbedding: number[] | undefined;

    if (isAiConfigured() && (request.body.imageDataUrl || text.trim())) {
      queryEmbedding = await createMultimodalEmbedding({
        imageDataUrl: request.body.imageDataUrl,
        text
      });
    }

    const results = await Promise.all(
      db.samples.map(async (sample) => {
        let score = lexicalScore(text, sample);

        if (queryEmbedding) {
          if (!sample.embedding) {
            sample.embedding = await tryEmbedding(sample.imageUrl, searchableText(sample));
          }
          if (sample.embedding) {
            score = cosineSimilarity(queryEmbedding, sample.embedding);
          }
        }

        return {
          sample: publicSample(sample),
          score,
          reason: queryEmbedding ? "图片和字段向量相似" : "文本字段命中",
          quote: generateQuoteForSample(sample, { sampleId: sample.id, ...quotePayload })
        };
      })
    );

    await writeDb(db);
    response.json(
      results
        .filter((result) => result.score >= threshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
    );
  } catch (error) {
    next(error);
  }
});

app.post("/api/quote/generate", async (request, response, next) => {
  try {
    const db = await readDb();
    const sample = db.samples.find((item) => item.id === request.body.sampleId);

    if (!sample) {
      response.status(404).send("样衣不存在");
      return;
    }

    response.json(generateQuoteForSample(sample, request.body));
  } catch (error) {
    next(error);
  }
});

const distDir = path.join(rootDir, "dist");
app.use(express.static(distDir));
app.get("*", (_request, response) => {
  response.sendFile(path.join(distDir, "index.html"));
});

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction
  ) => {
    const message = error instanceof Error ? error.message : "服务器错误";
    response.status(500).send(message);
  }
);

app.listen(port, "0.0.0.0", () => {
  console.log(`舜天信兴样衣管理系统 API running at http://127.0.0.1:${port}`);
});

async function tryEmbedding(imageUrl: string, text: string) {
  try {
    return await createMultimodalEmbedding({ imageUrl: imageUrl || undefined, text });
  } catch (error) {
    console.warn(error instanceof Error ? error.message : error);
    return undefined;
  }
}

function publicSample(sample: Sample) {
  const { embedding, ...rest } = sample;
  void embedding;
  return rest;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

function cleanText(value: unknown) {
  return String(value || "").trim().slice(0, 200);
}
