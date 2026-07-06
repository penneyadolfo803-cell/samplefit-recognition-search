import type {
  BorrowRecord,
  BorrowRequest,
  DamageReason,
  FieldCompletionResult,
  HealthPayload,
  QuoteRequest,
  QuoteResult,
  Sample,
  SampleDraft,
  SimilarResult
} from "./types";

const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const inferredApiBaseUrl =
  typeof window !== "undefined" && window.location.pathname.startsWith("/landup/") ? "/landup" : "";
const apiBaseUrl = configuredApiBaseUrl || inferredApiBaseUrl;

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${url}`, {
    headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    ...options
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `请求失败: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getHealth() {
  return request<HealthPayload>("/api/health");
}

export function getSamples() {
  return request<Sample[]>("/api/samples");
}

export function createSample(sample: SampleDraft) {
  return request<Sample>("/api/samples", {
    method: "POST",
    body: JSON.stringify(sample)
  });
}

export function updateSample(id: string, sample: Partial<SampleDraft>) {
  return request<Sample>(`/api/samples/${id}`, {
    method: "PATCH",
    body: JSON.stringify(sample)
  });
}

export function borrowSample(id: string, payload: Omit<BorrowRecord, "id" | "borrowedAt">) {
  return request<Sample>(`/api/samples/${id}/borrow`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function returnSample(id: string, note?: string) {
  return request<Sample>(`/api/samples/${id}/return`, {
    method: "POST",
    body: JSON.stringify({ note })
  });
}

export function damageSample(
  id: string,
  payload: { reporter: string; team: string; reason: DamageReason; estimatedLoss: number; note?: string }
) {
  return request<Sample>(`/api/samples/${id}/damage`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function getBorrowRequests() {
  return request<BorrowRequest[]>("/api/borrow-requests");
}

export function createBorrowRequest(payload: {
  sampleId: string;
  requester: string;
  team: string;
  phone: string;
  purpose: string;
  dueAt: string;
  note?: string;
}) {
  return request<BorrowRequest>("/api/borrow-requests", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function completeFields(partial: Partial<SampleDraft>, imageDataUrl?: string) {
  return request<FieldCompletionResult>("/api/ai/complete-fields", {
    method: "POST",
    body: JSON.stringify({ partial, imageDataUrl })
  });
}

export function enhanceImage(imageDataUrl: string, prompt?: string) {
  return request<{ imageUrl: string; providerPayload?: unknown }>("/api/ai/enhance-image", {
    method: "POST",
    body: JSON.stringify({ imageDataUrl, prompt })
  });
}

export function searchSimilar(payload: {
  imageDataUrl?: string;
  text?: string;
  threshold?: number;
  quantity?: number;
  materialName?: string;
  materialUnitCost?: number;
}) {
  return request<SimilarResult[]>("/api/ai/search-similar", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function generateQuote(payload: QuoteRequest) {
  return request<QuoteResult>("/api/quote/generate", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
