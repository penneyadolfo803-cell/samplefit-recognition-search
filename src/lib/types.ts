export type SampleStatus = "in_stock" | "borrowed" | "maintenance" | "damaged";
export type SampleKind = "physical" | "digital3d";
export type SampleSource = "design" | "bulk";
export type DamageReason = "lost" | "damaged" | "retired";

export interface BomItem {
  id: string;
  materialName: string;
  usage: string;
  color: string;
  supplier: string;
}

export interface DesignFile {
  id: string;
  name: string;
  type: string;
  url: string;
}

export interface BorrowRecord {
  id: string;
  borrower: string;
  team: string;
  purpose: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt?: string;
  note?: string;
}

export type BorrowRequestStatus = "pending" | "approved" | "rejected" | "fulfilled";

export interface BorrowRequest {
  id: string;
  sampleId: string;
  sampleSku: string;
  sampleName: string;
  requester: string;
  team: string;
  phone: string;
  purpose: string;
  dueAt: string;
  status: BorrowRequestStatus;
  note?: string;
  createdAt: string;
}

export interface DamageRecord {
  id: string;
  reporter: string;
  team: string;
  reason: DamageReason;
  estimatedLoss: number;
  reportedAt: string;
  note?: string;
}

export interface Sample {
  id: string;
  sku: string;
  styleNo: string;
  name: string;
  englishName: string;
  category: string;
  season: string;
  gender: string;
  color: string;
  size: string;
  fabric: string;
  composition: string;
  craft: string;
  styleTags: string[];
  sampleKind: SampleKind;
  source: SampleSource;
  ownerTeam: string;
  status: SampleStatus;
  location: string;
  rack: string;
  supplier: string;
  retailPrice: string;
  imageUrl: string;
  enhancedImageUrl?: string;
  threeDUrl: string;
  bomItems: BomItem[];
  designFiles: DesignFile[];
  linkedStyles: string[];
  linkedFabrics: string[];
  linkedPatterns: string[];
  visibilityScope: string;
  favorite: boolean;
  selected: boolean;
  notes: string;
  embedding?: number[];
  borrowHistory: BorrowRecord[];
  damageHistory: DamageRecord[];
  createdAt: string;
  updatedAt: string;
}

export type SampleDraft = Omit<
  Sample,
  "id" | "status" | "embedding" | "borrowHistory" | "damageHistory" | "createdAt" | "updatedAt"
> & {
  id?: string;
  status?: SampleStatus;
};

export interface FieldCompletionResult {
  fields: Partial<SampleDraft>;
  confidence: number;
  notes: string[];
}

export interface QuoteRequest {
  sampleId: string;
  quantity: number;
  materialName?: string;
  materialUnitCost?: number;
}

export interface QuoteResult {
  sampleId: string;
  sampleName: string;
  quantity: number;
  currency: string;
  materialPlan: string;
  materialCost: number;
  accessoryCost: number;
  processFee: number;
  laborFee: number;
  overhead: number;
  margin: number;
  unitPrice: number;
  totalPrice: number;
  assumptions: string[];
  generatedAt: string;
}

export interface SimilarResult {
  sample: Sample;
  score: number;
  reason: string;
  quote?: QuoteResult;
}

export interface HealthPayload {
  ok: boolean;
  aiConfigured: boolean;
  aiCreditsRemaining: number;
  models: {
    text: string;
    vision: string;
    embedding: string;
    image: string;
  };
}
