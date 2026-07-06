import assert from "node:assert/strict";

process.env.LLM_API_KEY = "test-key";
process.env.LLM_IMAGE_EDIT_BASE_URL = "https://mock-ai.example/openai/v2";
process.env.LLM_IMAGE_MODEL = "mock-image-model";

const pngBytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
const calls: Array<{ url: string; headers: Record<string, string> }> = [];
const originalFetch = globalThis.fetch;

globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = typeof input === "string" || input instanceof URL ? String(input) : input.url;
  const headers = headersToRecord(init?.headers);
  calls.push({ url, headers });

  if (url === "https://mock-ai.example/openai/v2/images/edits") {
    return new Response(
      JSON.stringify({
        data: [{ url: "https://mock-ai.example/generated/sample.png" }]
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" }
      }
    );
  }

  if (url === "https://mock-ai.example/generated/sample.png") {
    if (headers["api-key"] !== "test-key" && headers.authorization !== "Bearer test-key") {
      return new Response("auth required", { status: 403 });
    }
    return new Response(pngBytes, {
      status: 200,
      headers: { "content-type": "image/png" }
    });
  }

  return new Response("not found", { status: 404 });
}) as typeof fetch;

try {
  const { enhanceSampleImage } = await import(`../server/llm.ts?test=${Date.now()}`);
  const result = await enhanceSampleImage("data:image/png;base64,AAAA");

  assert.match(result.imageUrl, /^data:image\/png;base64,/, "enhanced image should be inlined as a data URL");
  assert.ok(
    calls.some(
      (call) =>
        call.url === "https://mock-ai.example/generated/sample.png" &&
        (call.headers["api-key"] === "test-key" || call.headers.authorization === "Bearer test-key")
    ),
    "remote generated image should be fetched with API authentication when needed"
  );

  console.log("ai image inline ok");
} finally {
  globalThis.fetch = originalFetch;
}

function headersToRecord(headers: RequestInit["headers"]) {
  const record: Record<string, string> = {};
  if (!headers) {
    return record;
  }
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      record[key.toLowerCase()] = value;
    });
    return record;
  }
  if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      record[String(key).toLowerCase()] = String(value);
    });
    return record;
  }
  Object.entries(headers).forEach(([key, value]) => {
    record[key.toLowerCase()] = String(value);
  });
  return record;
}
