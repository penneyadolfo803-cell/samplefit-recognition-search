import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction
} from "react";
import {
  Archive,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Boxes,
  Camera,
  Check,
  CheckSquare,
  ClipboardList,
  Coins,
  Database,
  Expand,
  FileText,
  Heart,
  Home,
  ImageUp,
  Loader2,
  LogIn,
  PackagePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Presentation,
  ReceiptText,
  RotateCcw,
  Search,
  Send,
  Settings2,
  Shirt,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  Wand2,
  X,
  type LucideIcon
} from "lucide-react";
import {
  borrowSample,
  completeFields,
  createBorrowRequest,
  createSample,
  damageSample,
  enhanceImage,
  getBorrowRequests,
  getHealth,
  getSamples,
  returnSample,
  searchSimilar,
  updateSample
} from "./lib/api";
import {
  demoSamples,
  draftToDemoSample,
  inferDemoFields,
  searchDemoSamples
} from "./lib/demo";
import { businessTeams } from "./lib/bulk-fixtures";
import {
  createBorrowAnalytics,
  createBorrowBillingRows,
  filterBillingRows,
  summarizeBillingRows,
  type BillingPeriod,
  type BillingSource,
  type BorrowBillingRow,
  type RankedMetric
} from "./lib/billing-analytics";
import {
  filterFrontCatalogSamples,
  getFrontCatalogCounts,
  getFrontCatalogSamples,
  getSampleSourceLabel,
  type FrontCatalogSource
} from "./lib/front-catalog";
import { createDemoWhiteBackgroundPreview, fileToOptimizedDataUrl, formatTags } from "./lib/image";
import { getRecommendedSamples } from "./lib/recommendation";
import type {
  BomItem,
  BorrowRequest,
  DamageReason,
  DesignFile,
  HealthPayload,
  Sample,
  SampleDraft,
  SimilarResult
} from "./lib/types";

type TabId = "library" | "entry" | "bulk" | "borrow" | "billing" | "analytics" | "ai";
type PortalMode = "admin" | "front";
type FrontUser = { name: string; team: string; phone: string };
type PptRecord = {
  id: string;
  fileName: string;
  sampleCount: number;
  sampleSkus: string[];
  createdAt: string;
};
type FeeBill = {
  id: string;
  title: string;
  amount: number;
  points: number;
  createdAt: string;
  status: string;
};
type SampleViewImage = {
  id: string;
  label: string;
  url: string;
};
type YunzhiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};
type BillingRule = {
  baseBorrowFee: number;
  borrowRate: number;
  minBorrowFee: number;
  overdueDailyFee: number;
  lostRate: number;
  damageRate: number;
  retiredRate: number;
};

const appName = "舜天信兴样衣管理系统";
const fixedAiCreditsRemaining = 1200;
const storageKeys = {
  frontUser: "samplefit.front.user",
  frontFavorites: "samplefit.front.favorites",
  pptRecords: "samplefit.front.pptRecords",
  feeBills: "samplefit.front.feeBills",
  billingRule: "samplefit.billing.rule"
};

const designStorageZones = [
  { location: "设计部样衣间", racks: ["SJ-01", "SJ-02", "SJ-03", "SJ-04", "SJ-05", "SJ-06", "SJ-07", "SJ-08"] },
  { location: "上海样衣间", racks: ["A-01", "A-02", "A-03", "B-01", "B-02", "B-11"] },
  { location: "杭州版房", racks: ["K-01", "K-02", "K-03", "K-04"] },
  { location: "汉商巴恩风样衣间", racks: ["HS-09-AW", "HS-09-SS", "HS-10-AW"] }
];

const bulkRackOptions = ["DH-01", "DH-02", "DH-03", "DH-04", "DH-05", "DH-06", "DH-07", "DH-08", "DH-09", "DH-10"];

const emptyDraft: SampleDraft = {
  sku: "",
  styleNo: "",
  name: "",
  englishName: "",
  category: "",
  season: "",
  gender: "",
  color: "",
  size: "",
  fabric: "",
  composition: "",
  craft: "",
  styleTags: [],
  sampleKind: "physical",
  source: "design",
  ownerTeam: "设计部",
  location: "设计部样衣间",
  rack: "SJ-01",
  supplier: "",
  retailPrice: "",
  imageUrl: "",
  enhancedImageUrl: "",
  threeDUrl: "",
  bomItems: [],
  designFiles: [],
  linkedStyles: [],
  linkedFabrics: [],
  linkedPatterns: [],
  visibilityScope: "设计中心,业务人员",
  favorite: false,
  selected: false,
  notes: ""
};

const tabs = [
  { id: "library" as const, label: "样衣库", icon: Database },
  { id: "entry" as const, label: "录入", icon: PackagePlus },
  { id: "bulk" as const, label: "大货", icon: Boxes },
  { id: "borrow" as const, label: "借还", icon: ClipboardList },
  { id: "billing" as const, label: "账单", icon: Banknote },
  { id: "analytics" as const, label: "分析", icon: ReceiptText },
  { id: "ai" as const, label: "识别检索", icon: Camera }
];

const statusText = {
  in_stock: "在库",
  borrowed: "借出",
  maintenance: "维护"
};

const sampleStatusText: Record<Sample["status"], string> = {
  ...statusText,
  damaged: "报损"
};

const damageReasonText: Record<DamageReason, string> = {
  lost: "丢失",
  damaged: "损坏",
  retired: "年久自然淘汰"
};

const defaultBillingRule: BillingRule = {
  baseBorrowFee: 20,
  borrowRate: 0.03,
  minBorrowFee: 20,
  overdueDailyFee: 10,
  lostRate: 1,
  damageRate: 0.6,
  retiredRate: 0
};

const borrowRequestStatusText = {
  pending: "待设计部确认",
  approved: "已同意",
  rejected: "已驳回",
  fulfilled: "已借出"
};

const kindText = {
  physical: "实物样衣",
  digital3d: "3D 样衣"
};

const hasConfiguredApiBase = Boolean(import.meta.env.VITE_API_BASE_URL);
const isStaticDemoHost =
  typeof window !== "undefined" && window.location.hostname.endsWith("github.io") && !hasConfiguredApiBase;

function App() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [borrowRequests, setBorrowRequests] = useState<BorrowRequest[]>([]);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [portalMode, setPortalMode] = useState<PortalMode>("admin");
  const [tab, setTab] = useState<TabId>("library");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<SampleDraft>(emptyDraft);
  const [bulkDraft, setBulkDraft] = useState<SampleDraft>({
    ...emptyDraft,
    source: "bulk",
    ownerTeam: businessTeams[0],
    location: getDefaultStorageLocation("bulk", businessTeams[0]),
    rack: bulkRackOptions[0],
    visibilityScope: `${businessTeams[0]},设计中心,样衣管理员`,
    notes: "业务组大货样品"
  });
  const [query, setQuery] = useState("");
  const [bulkQuery, setBulkQuery] = useState("");
  const [bulkTeamFilter, setBulkTeamFilter] = useState("all");
  const [storageFilter, setStorageFilter] = useState("all");
  const [bulkStorageFilter, setBulkStorageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [borrowForm, setBorrowForm] = useState({
    borrower: "",
    team: "",
    purpose: "选样",
    dueAt: ""
  });
  const [damageForm, setDamageForm] = useState({
    reporter: "",
    team: "",
    reason: "damaged" as DamageReason,
    estimatedLoss: "",
    note: ""
  });
  const [damageQuery, setDamageQuery] = useState("");
  const [billingRule, setBillingRule] = useState<BillingRule>(() => ({
    ...defaultBillingRule,
    ...(readStoredObject<Partial<BillingRule>>(storageKeys.billingRule) || {})
  }));
  const [searchImage, setSearchImage] = useState("");
  const [searchText, setSearchText] = useState("");
  const [similarityThreshold, setSimilarityThreshold] = useState(0.12);
  const [quoteQuantity, setQuoteQuantity] = useState(300);
  const [materialName, setMaterialName] = useState("");
  const [materialUnitCost, setMaterialUnitCost] = useState("");
  const [similarResults, setSimilarResults] = useState<SimilarResult[]>([]);
  const [frontLogin, setFrontLogin] = useState<FrontUser>(() => readStoredObject<FrontUser>(storageKeys.frontUser) || {
    name: "",
    team: "",
    phone: ""
  });
  const [frontUser, setFrontUser] = useState<FrontUser | null>(() => readStoredObject<FrontUser>(storageKeys.frontUser));
  const [frontQuery, setFrontQuery] = useState("");
  const [frontCatalogSource, setFrontCatalogSource] = useState<FrontCatalogSource>("all");
  const [frontSelectedIds, setFrontSelectedIds] = useState<string[]>([]);
  const [frontFavoriteIds, setFrontFavoriteIds] = useState<string[]>(() => readStoredArray(storageKeys.frontFavorites));
  const [showProfile, setShowProfile] = useState(false);
  const [showYunzhiAssistant, setShowYunzhiAssistant] = useState(false);
  const [pptRecords, setPptRecords] = useState<PptRecord[]>(() => readStoredObject<PptRecord[]>(storageKeys.pptRecords) || []);
  const [feeBills, setFeeBills] = useState<FeeBill[]>(() => readStoredObject<FeeBill[]>(storageKeys.feeBills) || []);
  const [frontRequestForm, setFrontRequestForm] = useState({
    purpose: "客户看样",
    dueAt: "",
    note: ""
  });

  const selected = samples.find((sample) => sample.id === selectedId) || samples[0];
  const aiCreditsRemaining = health?.aiCreditsRemaining ?? fixedAiCreditsRemaining;
  const designSamples = useMemo(() => samples.filter((sample) => sample.source !== "bulk"), [samples]);
  const bulkSamples = useMemo(() => samples.filter((sample) => sample.source === "bulk"), [samples]);
  const frontCatalogCounts = useMemo(() => getFrontCatalogCounts(samples), [samples]);
  const frontCatalogSamples = useMemo(
    () => getFrontCatalogSamples(samples, frontCatalogSource),
    [samples, frontCatalogSource]
  );
  const frontSelectedSamples = useMemo(
    () => frontCatalogSamples.filter((sample) => frontSelectedIds.includes(sample.id)),
    [frontCatalogSamples, frontSelectedIds]
  );
  const damageCandidates = useMemo(
    () => getDamageCandidates(samples, damageQuery),
    [samples, damageQuery]
  );
  const borrowBillingRows = useMemo(
    () => createBorrowBillingRows(samples, borrowRequests, (sample) => calculateBorrowFee(sample, billingRule)),
    [samples, borrowRequests, billingRule]
  );

  const filteredSamples = useMemo(() => {
    const term = query.trim().toLowerCase();
    return designSamples.filter((sample) => {
      const matchesStatus = statusFilter === "all" || sample.status === statusFilter;
      const matchesKind = kindFilter === "all" || sample.sampleKind === kindFilter;
      const matchesStorage = storageFilter === "all" || sample.location === storageFilter;
      const haystack = [
        sample.sku,
        sample.styleNo,
        sample.name,
        sample.englishName,
        sample.category,
        sample.color,
        sample.fabric,
        sample.location,
        sample.rack,
        sample.visibilityScope,
        sample.styleTags.join(" ")
      ]
        .join(" ")
        .toLowerCase();
      return matchesStatus && matchesKind && matchesStorage && (!term || haystack.includes(term));
    });
  }, [designSamples, query, statusFilter, kindFilter, storageFilter]);

  const filteredBulkSamples = useMemo(() => {
    const term = bulkQuery.trim().toLowerCase();
    return bulkSamples.filter((sample) => {
      const matchesTeam = bulkTeamFilter === "all" || sample.ownerTeam === bulkTeamFilter;
      const matchesStorage = bulkStorageFilter === "all" || sample.location === bulkStorageFilter;
      const haystack = [
        sample.sku,
        sample.styleNo,
        sample.name,
        sample.category,
        sample.color,
        sample.fabric,
        sample.ownerTeam,
        sample.location,
        sample.rack,
        sample.styleTags.join(" ")
      ]
        .join(" ")
        .toLowerCase();
      return matchesTeam && matchesStorage && (!term || haystack.includes(term));
    });
  }, [bulkSamples, bulkQuery, bulkTeamFilter, bulkStorageFilter]);

  const frontSamples = useMemo(() => {
    return filterFrontCatalogSamples(samples, frontCatalogSource, frontQuery);
  }, [samples, frontCatalogSource, frontQuery]);

  const metrics = useMemo(() => {
    return {
      total: designSamples.length,
      bulk: bulkSamples.length,
      inStock: designSamples.filter((sample) => sample.status === "in_stock").length,
      borrowed: designSamples.filter((sample) => sample.status === "borrowed").length,
      damaged: designSamples.filter((sample) => sample.status === "damaged").length,
      selected: designSamples.filter((sample) => sample.selected).length,
      requests: borrowRequests.filter((request) => request.status === "pending").length
    };
  }, [designSamples, bulkSamples, borrowRequests]);

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    writeStoredObject(storageKeys.frontUser, frontUser);
  }, [frontUser]);

  useEffect(() => {
    writeStoredObject(storageKeys.frontFavorites, frontFavoriteIds);
  }, [frontFavoriteIds]);

  useEffect(() => {
    writeStoredObject(storageKeys.pptRecords, pptRecords);
  }, [pptRecords]);

  useEffect(() => {
    writeStoredObject(storageKeys.feeBills, feeBills);
  }, [feeBills]);

  useEffect(() => {
    writeStoredObject(storageKeys.billingRule, billingRule);
  }, [billingRule]);

  async function reload() {
    setBusy("load");
    if (isStaticDemoHost) {
      activateDemoMode();
      setBusy("");
      return;
    }
    try {
      const [healthPayload, samplePayload, requestPayload] = await Promise.all([
        getHealth(),
        getSamples(),
        getBorrowRequests()
      ]);
      setHealth(healthPayload);
      setSamples(samplePayload);
      setBorrowRequests(requestPayload);
      setSelectedId((current) => current || samplePayload[0]?.id || "");
      setDemoMode(false);
    } catch (error) {
      void error;
      activateDemoMode();
    } finally {
      setBusy("");
    }
  }

  function activateDemoMode() {
    setDemoMode(true);
    setHealth({
      ok: true,
      aiConfigured: false,
      aiCreditsRemaining: fixedAiCreditsRemaining,
      models: {
        text: "static-demo",
        vision: "static-demo",
        embedding: "static-demo",
        image: "static-demo"
      }
    });
    setSamples(demoSamples);
    setBorrowRequests([]);
    setSelectedId((current) => current || demoSamples[0]?.id || "");
    setNotice("当前为客户演示版，已启用本地样衣数据和演示 AI 流程");
  }

  async function ensureLiveAiBackend() {
    if (!isStaticDemoHost && !demoMode && health?.aiConfigured) {
      return true;
    }
    if (isStaticDemoHost) {
      return false;
    }

    try {
      const healthPayload = await getHealth();
      setHealth(healthPayload);
      if (healthPayload.aiConfigured) {
        const [samplePayload, requestPayload] = await Promise.all([getSamples(), getBorrowRequests()]);
        setSamples(samplePayload);
        setBorrowRequests(requestPayload);
        setSelectedId((current) => current || samplePayload[0]?.id || "");
        setDemoMode(false);
        return true;
      }
    } catch {
      return false;
    }

    return false;
  }

  function loginFrontDesk() {
    if (!frontLogin.name.trim() || !frontLogin.team.trim()) {
      setNotice("请填写业务员姓名和业务组");
      return;
    }
    setFrontUser({
      name: frontLogin.name.trim(),
      team: frontLogin.team.trim(),
      phone: frontLogin.phone.trim()
    });
    setNotice("已进入业务前台，可查看全部样衣并提交借出申请");
  }

  function toggleFrontSelect(sample: Sample) {
    if (sample.status === "damaged") {
      setNotice("报损样衣不可加入借样或推款");
      return;
    }
    setFrontSelectedIds((current) =>
      current.includes(sample.id) ? current.filter((id) => id !== sample.id) : [...current, sample.id]
    );
    setSelectedId(sample.id);
  }

  function toggleFrontFavorite(sample: Sample) {
    setFrontFavoriteIds((current) =>
      current.includes(sample.id) ? current.filter((id) => id !== sample.id) : [...current, sample.id]
    );
  }

  async function submitFrontBorrowRequest(target: Sample | Sample[]) {
    if (!frontUser) {
      setNotice("请先通过业务前台入口登录");
      return;
    }
    const targets = Array.isArray(target) ? target : [target];
    const unavailable = targets.filter((sample) => sample.status === "damaged");
    if (unavailable.length) {
      setNotice(`报损样衣不可借样：${unavailable.map((sample) => sample.sku).join("、")}`);
      return;
    }
    if (!targets.length) {
      setNotice("请先选择样衣");
      return;
    }
    setBusy("front-request");
    setNotice("");
    try {
      if (demoMode) {
        const requests = targets.map((sample) => ({
          id: uid(),
          sampleId: sample.id,
          sampleSku: sample.sku,
          sampleName: sample.name,
          requester: frontUser.name,
          team: frontUser.team,
          phone: frontUser.phone,
          purpose: frontRequestForm.purpose || "客户看样",
          dueAt: frontRequestForm.dueAt || new Date(Date.now() + 86400000 * 3).toISOString(),
          status: "pending" as const,
          note: frontRequestForm.note,
          createdAt: new Date().toISOString()
        }));
        setBorrowRequests((current) => [...requests, ...current]);
        setFeeBills((current) => [...createBorrowFeeBills(targets, frontUser, billingRule), ...current]);
        setNotice(`客户演示版已提交 ${requests.length} 件样衣借出申请，等待设计部确认`);
        return;
      }

      const requests = await Promise.all(
        targets.map((sample) =>
          createBorrowRequest({
            sampleId: sample.id,
            requester: frontUser.name,
            team: frontUser.team,
            phone: frontUser.phone,
            purpose: frontRequestForm.purpose || "客户看样",
            dueAt: frontRequestForm.dueAt || new Date(Date.now() + 86400000 * 3).toISOString(),
            note: frontRequestForm.note
          })
        )
      );
      setBorrowRequests((current) => [...requests, ...current]);
      setFeeBills((current) => [...createBorrowFeeBills(targets, frontUser, billingRule), ...current]);
      setNotice(`已提交 ${requests.length} 件样衣借出申请，等待设计部确认`);
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setBusy("");
    }
  }

  async function generateFrontPpt() {
    if (!frontUser) {
      setNotice("请先通过业务前台入口登录");
      return;
    }
    if (!frontSelectedSamples.length) {
      setNotice("请先多选样衣，再生成推款 PPT");
      return;
    }
    setBusy("ppt");
    setNotice("");
    try {
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
      const fileName = `舜天信兴推款PPT-${frontUser.team}-${stamp}.pptx`;
      await createRecommendationPpt(frontSelectedSamples, frontUser, fileName);
      const pptRecord: PptRecord = {
        id: uid(),
        fileName,
        sampleCount: frontSelectedSamples.length,
        sampleSkus: frontSelectedSamples.map((sample) => sample.sku),
        createdAt: new Date().toISOString()
      };
      const feeBill: FeeBill = {
        id: uid(),
        title: `推款 PPT 生成 · ${frontSelectedSamples.length} 件`,
        amount: 0,
        points: frontSelectedSamples.length * 5,
        status: "演示计费",
        createdAt: new Date().toISOString()
      };
      setPptRecords((current) => [pptRecord, ...current]);
      setFeeBills((current) => [feeBill, ...current]);
      setNotice(`已生成推款 PPT：${fileName}`);
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setBusy("");
    }
  }

  function startCreate() {
    setDraft({ ...emptyDraft });
    setTab("entry");
  }

  function startBulkCreate(team = businessTeams[0]) {
    setBulkDraft({
      ...emptyDraft,
      source: "bulk",
      ownerTeam: team,
      location: getDefaultStorageLocation("bulk", team),
      rack: bulkRackOptions[0],
      visibilityScope: `${team},设计中心,样衣管理员`,
      notes: "业务组大货样品"
    });
    setTab("bulk");
  }

  function editSample(sample: Sample) {
    const { embedding, borrowHistory, damageHistory, createdAt, updatedAt, ...editable } = sample;
    void embedding;
    void borrowHistory;
    void damageHistory;
    void createdAt;
    void updatedAt;
    setDraft({ ...editable, id: sample.id });
    setTab("entry");
  }

  function editBulkSample(sample: Sample) {
    const { embedding, borrowHistory, damageHistory, createdAt, updatedAt, ...editable } = sample;
    void embedding;
    void borrowHistory;
    void damageHistory;
    void createdAt;
    void updatedAt;
    setBulkDraft({ ...editable, source: "bulk" });
    setTab("bulk");
  }

  async function saveDraft() {
    if (!draft.retailPrice.trim()) {
      setNotice("请填写样衣吊牌价，借样计费需要价格依据");
      return;
    }
    setBusy("save");
    setNotice("");
    const payload: SampleDraft = {
      ...draft,
      location: draft.location || getDefaultStorageLocation("design"),
      rack: draft.rack || getRackOptions(draft.location || getDefaultStorageLocation("design"), "design")[0] || ""
    };
    try {
      if (demoMode) {
        const saved = draftToDemoSample(payload);
        setSamples((current) =>
          payload.id ? current.map((sample) => (sample.id === payload.id ? saved : sample)) : [saved, ...current]
        );
        setSelectedId(saved.id);
        setDraft({ ...emptyDraft });
        setTab("library");
        setNotice("客户演示版已保存到当前浏览器会话");
        return;
      }
      const saved = payload.id ? await updateSample(payload.id, payload) : await createSample(payload);
      await reload();
      setSelectedId(saved.id);
      setDraft({ ...emptyDraft });
      setTab("library");
      setNotice("样衣档案已保存");
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setBusy("");
    }
  }

  async function saveBulkDraft() {
    if (!bulkDraft.retailPrice.trim()) {
      setNotice("请填写大货样品价格，借样计费需要价格依据");
      return;
    }
    setBusy("bulk-save");
    setNotice("");
    const payload: SampleDraft = {
      ...bulkDraft,
      source: "bulk",
      ownerTeam: bulkDraft.ownerTeam || businessTeams[0],
      location: bulkDraft.location || getDefaultStorageLocation("bulk", bulkDraft.ownerTeam || businessTeams[0]),
      rack: bulkDraft.rack || bulkRackOptions[0],
      visibilityScope: bulkDraft.visibilityScope || `${bulkDraft.ownerTeam || businessTeams[0]},设计中心,样衣管理员`
    };
    try {
      if (demoMode) {
        const saved = draftToDemoSample(payload);
        setSamples((current) =>
          payload.id ? current.map((sample) => (sample.id === payload.id ? saved : sample)) : [saved, ...current]
        );
        setSelectedId(saved.id);
        startBulkCreate(payload.ownerTeam);
        setNotice("客户演示版已保存大货样品");
        return;
      }
      const saved = payload.id ? await updateSample(payload.id, payload) : await createSample(payload);
      await reload();
      setSelectedId(saved.id);
      startBulkCreate(payload.ownerTeam);
      setNotice("大货样品已保存");
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setBusy("");
    }
  }

  async function runFieldCompletion() {
    setBusy("complete");
    setNotice("");
    try {
      const useLiveAi = await ensureLiveAiBackend();
      if (!useLiveAi) {
        const result = inferDemoFields(draft);
        setDraft((current) => ({
          ...current,
          ...result.fields,
          styleTags: normalizeArray(result.fields.styleTags ?? current.styleTags)
        }));
        setNotice("客户演示版已补全字段");
        return;
      }
      const result = await completeFields(draft, draft.imageUrl);
      setDraft((current) => ({
        ...current,
        ...result.fields,
        styleTags: normalizeArray(result.fields.styleTags ?? current.styleTags),
        linkedStyles: normalizeArray(result.fields.linkedStyles ?? current.linkedStyles),
        linkedFabrics: normalizeArray(result.fields.linkedFabrics ?? current.linkedFabrics),
        linkedPatterns: normalizeArray(result.fields.linkedPatterns ?? current.linkedPatterns)
      }));
      setNotice(`AI 已补全字段，可信度 ${Math.round(result.confidence * 100)}%`);
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setBusy("");
    }
  }

  async function runEnhanceImage() {
    if (!draft.imageUrl) {
      setNotice("请先上传样衣图片");
      return;
    }
    setBusy("enhance");
    setNotice("");
    try {
      const useLiveAi = await ensureLiveAiBackend();
      if (!useLiveAi) {
        let previewUrl = draft.imageUrl;
        try {
          previewUrl = await createDemoWhiteBackgroundPreview(draft.imageUrl);
        } catch {
          previewUrl = draft.imageUrl;
        }
        setDraft((current) => ({ ...current, enhancedImageUrl: previewUrl }));
        setNotice("客户演示版已生成白底图预览");
        return;
      }
      const result = await enhanceImage(draft.imageUrl);
      setDraft((current) => ({ ...current, enhancedImageUrl: result.imageUrl }));
      setNotice("AI 白底模特图已生成");
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setBusy("");
    }
  }

  async function runSimilarSearch(textOverride?: string) {
    const queryText = textOverride ?? searchText;
    if (!searchImage && !queryText.trim()) {
      setNotice("请上传拍摄图或输入检索词");
      return;
    }
    setBusy("search");
    setNotice("");
    try {
      const useLiveAi = await ensureLiveAiBackend();
      if (!useLiveAi) {
        const results = searchDemoSamples(samples, {
          imageDataUrl: searchImage,
          text: queryText,
          threshold: similarityThreshold,
          quantity: quoteQuantity,
          materialName,
          materialUnitCost: materialUnitCost ? Number(materialUnitCost) : undefined
        });
        setSimilarResults(results);
        setNotice(`客户演示版找到 ${results.length} 个候选样衣并生成报价`);
        return;
      }
      const results = await searchSimilar({
        imageDataUrl: searchImage,
        text: queryText,
        threshold: similarityThreshold,
        quantity: quoteQuantity,
        materialName: materialName || undefined,
        materialUnitCost: materialUnitCost ? Number(materialUnitCost) : undefined
      });
      setSimilarResults(results);
      setNotice(`找到 ${results.length} 个候选样衣`);
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setBusy("");
    }
  }

  async function borrowSelected() {
    if (!selected) {
      return;
    }
    if (selected.status === "damaged") {
      setNotice("报损样衣不可再借出");
      return;
    }
    setBusy("borrow");
    setNotice("");
    try {
      if (demoMode) {
        const updated = {
          ...selected,
          status: "borrowed" as const,
          borrowHistory: [
            {
              id: uid(),
              borrower: borrowForm.borrower,
              team: borrowForm.team,
              purpose: borrowForm.purpose,
              dueAt: borrowForm.dueAt || new Date(Date.now() + 86400000 * 3).toISOString(),
              borrowedAt: new Date().toISOString()
            },
            ...selected.borrowHistory
          ]
        };
        setSamples((current) => current.map((sample) => (sample.id === selected.id ? updated : sample)));
        setNotice("客户演示版已登记借出");
        return;
      }
      const dueAt = borrowForm.dueAt || new Date(Date.now() + 86400000 * 3).toISOString();
      const updated = await borrowSample(selected.id, {
        ...borrowForm,
        dueAt
      });
      await reload();
      setSelectedId(updated.id);
      setBorrowForm({ borrower: "", team: "", purpose: "选样", dueAt: "" });
      setNotice("借出记录已保存");
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setBusy("");
    }
  }

  async function returnSelected() {
    if (!selected) {
      return;
    }
    setBusy("return");
    setNotice("");
    try {
      if (demoMode) {
        const updated = {
          ...selected,
          status: "in_stock" as const,
          borrowHistory: selected.borrowHistory.map((record) =>
            record.returnedAt ? record : { ...record, returnedAt: new Date().toISOString() }
          )
        };
        setSamples((current) => current.map((sample) => (sample.id === selected.id ? updated : sample)));
        setNotice("客户演示版已归还入库");
        return;
      }
      const updated = await returnSample(selected.id);
      await reload();
      setSelectedId(updated.id);
      setNotice("样衣已归还入库");
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setBusy("");
    }
  }

  async function reportDamageSelected() {
    if (!selected) {
      return;
    }
    const reporter = damageForm.reporter.trim() || "样衣管理员";
    const team = damageForm.team.trim() || "设计部";
    const manualEstimatedLoss = damageForm.estimatedLoss.trim();
    const estimatedLoss =
      manualEstimatedLoss ? parseMoneyValue(manualEstimatedLoss) : calculateDamageFee(selected, damageForm.reason, billingRule);

    setBusy("damage");
    setNotice("");
    try {
      if (demoMode) {
        const record = {
          id: uid(),
          reporter,
          team,
          reason: damageForm.reason,
          estimatedLoss,
          note: damageForm.note,
          reportedAt: new Date().toISOString()
        };
        const updated: Sample = {
          ...selected,
          status: "damaged",
          damageHistory: [record, ...(selected.damageHistory || [])],
          updatedAt: new Date().toISOString()
        };
        setSamples((current) => current.map((sample) => (sample.id === selected.id ? updated : sample)));
        setFrontSelectedIds((current) => current.filter((id) => id !== selected.id));
        setNotice(`已登记报损：${selected.sku} · ${damageReasonText[damageForm.reason]}`);
        setDamageForm({ reporter: "", team: "", reason: "damaged", estimatedLoss: "", note: "" });
        return;
      }
      const updated = await damageSample(selected.id, {
        reporter,
        team,
        reason: damageForm.reason,
        estimatedLoss,
        note: damageForm.note
      });
      await reload();
      setSelectedId(updated.id);
      setFrontSelectedIds((current) => current.filter((id) => id !== updated.id));
      setNotice(`已登记报损：${updated.sku} · ${damageReasonText[damageForm.reason]}`);
      setDamageForm({ reporter: "", team: "", reason: "damaged", estimatedLoss: "", note: "" });
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setBusy("");
    }
  }

  async function toggleFlag(sample: Sample, field: "favorite" | "selected") {
    if (demoMode) {
      setSamples((current) =>
        current.map((item) => (item.id === sample.id ? { ...item, [field]: !item[field] } : item))
      );
      return;
    }
    const updated = await updateSample(sample.id, { [field]: !sample[field] });
    setSamples((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  async function uploadDraftImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const imageUrl = await fileToOptimizedDataUrl(file);
    setDraft((current) => ({ ...current, imageUrl }));
  }

  async function uploadBulkFrontImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const imageUrl = await fileToOptimizedDataUrl(file);
    setBulkDraft((current) => ({ ...current, imageUrl, enhancedImageUrl: imageUrl }));
  }

  async function uploadBulkBackImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const imageUrl = await fileToOptimizedDataUrl(file);
    setBulkDraft((current) => ({
      ...current,
      designFiles: [
        ...current.designFiles.filter((fileItem) => fileItem.name !== "大货背面白底模特图"),
        { id: uid(), name: "大货背面白底模特图", type: "PNG", url: imageUrl }
      ]
    }));
  }

  async function uploadSearchImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setSearchImage(await fileToOptimizedDataUrl(file, 960));
  }

  return (
    <div className={`app-shell ${portalMode === "front" ? "front-mode" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Shirt size={22} />
          </div>
          <div>
            <strong>舜天信兴</strong>
            <span>样衣管理系统</span>
          </div>
        </div>

        <div className="portal-switch">
          <button
            className={portalMode === "admin" ? "active" : ""}
            onClick={() => setPortalMode("admin")}
            type="button"
          >
            <ShieldCheck size={17} />
            设计部后台
          </button>
          <button
            className={portalMode === "front" ? "active" : ""}
            onClick={() => setPortalMode("front")}
            type="button"
          >
            <LogIn size={17} />
            业务前台
          </button>
        </div>

        {portalMode === "admin" && (
          <nav className="side-nav">
            {tabs.map((item) => (
              <button
                className={tab === item.id ? "active" : ""}
                key={item.id}
                onClick={() => setTab(item.id)}
                type="button"
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>
        )}

        <div className="model-card">
          <span className={health?.aiConfigured ? "dot ok" : "dot"} />
          <div>
            <strong>{demoMode ? "客户演示版" : health?.aiConfigured ? "真实 AI 已接入" : "AI 未配置"}</strong>
            <small>{health?.models.embedding || "等待服务启动"}</small>
          </div>
        </div>
      </aside>

      <main className="main">
        {portalMode === "admin" && (
          <header className="topbar">
            <div>
              <p className="eyebrow">{appName}</p>
              <h1>{titleFor(tab)}</h1>
            </div>
            <div className="top-actions">
              <button className="assistant-trigger" onClick={() => setShowYunzhiAssistant(true)} type="button">
                <img alt="问问云知" src="./yunzhi-avatar.png" />
                问问云知
              </button>
              <div className="credit-pill">
                <Coins size={16} />
                <span>AI 积分剩余</span>
                <strong>{aiCreditsRemaining}</strong>
              </div>
              <button className="ghost" onClick={() => setShowProfile(true)} type="button">
                <UserRound size={16} />
                我的
              </button>
              <button className="ghost" onClick={() => void reload()} type="button">
                <RotateCcw size={16} />
                刷新
              </button>
              <button onClick={startCreate} type="button">
                <PackagePlus size={16} />
                新增样衣
              </button>
              <button className="ghost" onClick={() => startBulkCreate()} type="button">
                <Boxes size={16} />
                大货录入
              </button>
            </div>
          </header>
        )}

        {notice && <div className="notice">{notice}</div>}

        {portalMode === "admin" && (
          <section className="metrics">
            <Metric icon={Boxes} label="在线样衣" value={metrics.total} />
            <Metric icon={Database} label="大货样品" value={metrics.bulk} />
            <Metric icon={BadgeCheck} label="可借在库" value={metrics.inStock} />
            <Metric icon={Archive} label="当前借出" value={metrics.borrowed} />
            <Metric icon={AlertTriangle} label="报损样衣" value={metrics.damaged} />
            <Metric icon={ClipboardList} label="待处理申请" value={metrics.requests} />
          </section>
        )}

        {busy === "load" ? (
          <div className="loading">
            <Loader2 className="spin" size={22} />
            加载中
          </div>
        ) : portalMode === "front" ? (
          <FrontDeskPinterestView
            busy={busy}
            frontLogin={frontLogin}
            frontFavoriteIds={frontFavoriteIds}
            frontCatalogSource={frontCatalogSource}
            frontCatalogCounts={frontCatalogCounts}
            frontQuery={frontQuery}
            frontRequestForm={frontRequestForm}
            frontSamples={frontSamples}
            frontSelectedIds={frontSelectedIds}
            frontSelectedSamples={frontSelectedSamples}
            frontUser={frontUser}
            requests={borrowRequests}
            searchImage={searchImage}
            selected={selected}
            similarResults={similarResults}
            aiCreditsRemaining={aiCreditsRemaining}
            billingRule={billingRule}
            generateFrontPpt={generateFrontPpt}
            openProfile={() => setShowProfile(true)}
            openYunzhi={() => setShowYunzhiAssistant(true)}
            reload={reload}
            runFrontVisualSearch={() => runSimilarSearch("")}
            setPortalMode={setPortalMode}
            setFrontCatalogSource={setFrontCatalogSource}
            setFrontLogin={setFrontLogin}
            setFrontQuery={setFrontQuery}
            setFrontRequestForm={setFrontRequestForm}
            setSelectedId={setSelectedId}
            loginFrontDesk={loginFrontDesk}
            submitFrontBorrowRequest={submitFrontBorrowRequest}
            toggleFrontFavorite={toggleFrontFavorite}
            toggleFrontSelect={toggleFrontSelect}
            uploadSearchImage={uploadSearchImage}
          />
        ) : (
          <>
            {tab === "library" && (
              <LibraryView
                filteredSamples={filteredSamples}
                kindFilter={kindFilter}
                query={query}
                selected={selected}
                setKindFilter={setKindFilter}
                setQuery={setQuery}
                setSelectedId={setSelectedId}
                setStorageFilter={setStorageFilter}
                setStatusFilter={setStatusFilter}
                storageFilter={storageFilter}
                statusFilter={statusFilter}
                editSample={editSample}
                toggleFlag={toggleFlag}
              />
            )}

            {tab === "entry" && (
              <EntryView
                busy={busy}
                draft={draft}
                runEnhanceImage={runEnhanceImage}
                runFieldCompletion={runFieldCompletion}
                saveDraft={saveDraft}
                setDraft={setDraft}
                uploadDraftImage={uploadDraftImage}
              />
            )}

            {tab === "bulk" && (
              <BulkGoodsView
                bulkDraft={bulkDraft}
                busy={busy}
                filteredBulkSamples={filteredBulkSamples}
                selected={selected?.source === "bulk" ? selected : undefined}
                bulkQuery={bulkQuery}
                bulkTeamFilter={bulkTeamFilter}
                bulkStorageFilter={bulkStorageFilter}
                setBulkDraft={setBulkDraft}
                setBulkQuery={setBulkQuery}
                setBulkTeamFilter={setBulkTeamFilter}
                setBulkStorageFilter={setBulkStorageFilter}
                editBulkSample={editBulkSample}
                saveBulkDraft={saveBulkDraft}
                startBulkCreate={startBulkCreate}
                uploadBulkBackImage={uploadBulkBackImage}
                uploadBulkFrontImage={uploadBulkFrontImage}
              />
            )}

            {tab === "borrow" && selected && (
              <BorrowView
                billingRule={billingRule}
                borrowForm={borrowForm}
                busy={busy}
                damageCandidates={damageCandidates}
                damageForm={damageForm}
                damageQuery={damageQuery}
                selected={selected}
                setBillingRule={setBillingRule}
                setBorrowForm={setBorrowForm}
                setDamageForm={setDamageForm}
                setDamageQuery={setDamageQuery}
                setSelectedId={setSelectedId}
                borrowSelected={borrowSelected}
                reportDamageSelected={reportDamageSelected}
                returnSelected={returnSelected}
              />
            )}

            {tab === "billing" && (
              <BillingPullView
                billingRows={borrowBillingRows}
                billingRule={billingRule}
              />
            )}

            {tab === "analytics" && (
              <DataAnalysisView
                billingRows={borrowBillingRows}
                samples={samples}
              />
            )}

            {tab === "ai" && (
              <AiView
                busy={busy}
                results={similarResults}
                searchImage={searchImage}
                searchText={searchText}
                similarityThreshold={similarityThreshold}
                quoteQuantity={quoteQuantity}
                materialName={materialName}
                materialUnitCost={materialUnitCost}
                setSearchText={setSearchText}
                setSimilarityThreshold={setSimilarityThreshold}
                setQuoteQuantity={setQuoteQuantity}
                setMaterialName={setMaterialName}
                setMaterialUnitCost={setMaterialUnitCost}
                uploadSearchImage={uploadSearchImage}
                runSimilarSearch={runSimilarSearch}
                setSelectedId={setSelectedId}
                setTab={setTab}
              />
            )}
          </>
        )}
      </main>

      <nav className="mobile-nav">
        <button
          className={portalMode === "front" ? "active" : ""}
          onClick={() => setPortalMode("front")}
          type="button"
        >
          <LogIn size={18} />
          <span>前台</span>
        </button>
        {tabs.map((item) => (
          <button
            className={portalMode === "admin" && tab === item.id ? "active" : ""}
            key={item.id}
            onClick={() => {
              setPortalMode("admin");
              setTab(item.id);
            }}
            type="button"
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {showProfile && (
        <ProfileDrawer
          bills={feeBills}
          frontUser={frontUser}
          onClose={() => setShowProfile(false)}
          pptRecords={pptRecords}
          requests={borrowRequests}
        />
      )}

      {showYunzhiAssistant && (
        <YunzhiAssistantDrawer
          billingRule={billingRule}
          frontUser={frontUser}
          onClose={() => setShowYunzhiAssistant(false)}
          samples={samples}
          selected={selected}
        />
      )}
    </div>
  );
}

function LibraryView(props: {
  filteredSamples: Sample[];
  kindFilter: string;
  query: string;
  selected?: Sample;
  setKindFilter: (value: string) => void;
  setQuery: (value: string) => void;
  setSelectedId: (value: string) => void;
  setStorageFilter: (value: string) => void;
  setStatusFilter: (value: string) => void;
  storageFilter: string;
  statusFilter: string;
  editSample: (sample: Sample) => void;
  toggleFlag: (sample: Sample, field: "favorite" | "selected") => Promise<void>;
}) {
  return (
    <section className="library-grid">
      <div className="panel browser-panel">
        <div className="filters">
          <label className="search-box">
            <Search size={16} />
            <input
              onChange={(event) => props.setQuery(event.target.value)}
              placeholder="款号、名称、标签、面料"
              value={props.query}
            />
          </label>
          <select onChange={(event) => props.setStatusFilter(event.target.value)} value={props.statusFilter}>
            <option value="all">全部状态</option>
            <option value="in_stock">在库</option>
            <option value="borrowed">借出</option>
            <option value="maintenance">维护</option>
            <option value="damaged">报损</option>
          </select>
          <select onChange={(event) => props.setKindFilter(event.target.value)} value={props.kindFilter}>
            <option value="all">全部类型</option>
            <option value="physical">实物样衣</option>
            <option value="digital3d">3D 样衣</option>
          </select>
          <select onChange={(event) => props.setStorageFilter(event.target.value)} value={props.storageFilter}>
            <option value="all">全部库位</option>
            {getStorageZones("design").map((zone) => (
              <option key={zone.location} value={zone.location}>
                {zone.location}
              </option>
            ))}
          </select>
        </div>

        <div className="sample-list">
          {props.filteredSamples.map((sample) => (
            <button
              className={`sample-card ${props.selected?.id === sample.id ? "active" : ""}`}
              key={sample.id}
              onClick={() => props.setSelectedId(sample.id)}
              type="button"
            >
              <img alt={sample.name} src={sample.enhancedImageUrl || sample.imageUrl} />
              <div className="sample-card-body">
                <div className="card-title">
                  <strong>{sample.name}</strong>
                  <span className={`status ${sample.status}`}>{sampleStatusText[sample.status]}</span>
                </div>
                <small>
                  {sample.sku} · {sample.styleNo}
                </small>
                <small>{sample.location} · {sample.rack}</small>
                <div className="tag-row">
                  {formatTags(sample.styleTags).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="panel detail-panel">
        {props.selected ? (
          <SampleDetail
            sample={props.selected}
            editSample={props.editSample}
            toggleFlag={props.toggleFlag}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}

function SampleDetail(props: {
  sample: Sample;
  editSample: (sample: Sample) => void;
  toggleFlag: (sample: Sample, field: "favorite" | "selected") => Promise<void>;
}) {
  const activeBorrow = props.sample.borrowHistory.find((record) => !record.returnedAt);

  return (
    <article className="detail">
      <div className="detail-media">
        <img alt={props.sample.name} src={props.sample.enhancedImageUrl || props.sample.imageUrl} />
        <div className="media-actions">
          <button className="icon-button" onClick={() => void props.toggleFlag(props.sample, "favorite")} type="button">
            <Heart fill={props.sample.favorite ? "currentColor" : "none"} size={16} />
          </button>
          <button className="icon-button" onClick={() => void props.toggleFlag(props.sample, "selected")} type="button">
            <Check size={16} />
          </button>
        </div>
      </div>

      <div className="detail-head">
        <div>
          <p className="eyebrow">{kindText[props.sample.sampleKind]}</p>
          <h2>{props.sample.name}</h2>
          <p>{props.sample.englishName || "English name pending"}</p>
        </div>
        <button onClick={() => props.editSample(props.sample)} type="button">
          <FileText size={16} />
          编辑
        </button>
      </div>

      <div className="info-grid">
        <Info label="样衣款号" value={props.sample.sku} />
        <Info label="款式编号" value={props.sample.styleNo} />
        <Info label="品类" value={props.sample.category} />
        <Info label="季节" value={props.sample.season} />
        <Info label="颜色" value={props.sample.color} />
        <Info label="尺码" value={props.sample.size} />
        <Info label="位置" value={`${props.sample.location} ${props.sample.rack}`} />
        <Info label="数据范围" value={props.sample.visibilityScope} />
      </div>

      <section className="detail-section">
        <h3>面料 BOM</h3>
        <div className="mini-table">
          {props.sample.bomItems.map((item) => (
            <div key={item.id}>
              <span>{item.materialName}</span>
              <span>{item.usage}</span>
              <span>{item.color}</span>
              <span>{item.supplier}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="detail-section chain">
        <h3>关联资料链</h3>
        <PillGroup label="款式" values={props.sample.linkedStyles} />
        <PillGroup label="面料" values={props.sample.linkedFabrics} />
        <PillGroup label="版型" values={props.sample.linkedPatterns} />
      </section>

      <section className="detail-section">
        <h3>工艺与文件</h3>
        <p>{props.sample.craft || props.sample.notes}</p>
        <div className="file-list">
          {props.sample.designFiles.map((file) => (
            <span key={file.id}>
              {file.type} · {file.name}
            </span>
          ))}
        </div>
      </section>

      {activeBorrow && (
        <div className="borrow-banner">
          <strong>当前借出给 {activeBorrow.borrower}</strong>
          <span>{activeBorrow.purpose}</span>
        </div>
      )}
    </article>
  );
}

function EntryView(props: {
  busy: string;
  draft: SampleDraft;
  runEnhanceImage: () => Promise<void>;
  runFieldCompletion: () => Promise<void>;
  saveDraft: () => Promise<void>;
  setDraft: Dispatch<SetStateAction<SampleDraft>>;
  uploadDraftImage: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
}) {
  const setField = <K extends keyof SampleDraft>(key: K, value: SampleDraft[K]) => {
    props.setDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="entry-layout">
      <div className="panel image-panel">
        <div className="image-preview">
          {props.draft.enhancedImageUrl || props.draft.imageUrl ? (
            <img alt="样衣预览" src={props.draft.enhancedImageUrl || props.draft.imageUrl} />
          ) : (
            <div className="empty-image">
              <ImageUp size={28} />
              <span>上传样衣图</span>
            </div>
          )}
        </div>
        <div className="button-row">
          <label className="file-button">
            <Upload size={16} />
            上传图片
            <input accept="image/*" onChange={props.uploadDraftImage} type="file" />
          </label>
          <button className="ghost" disabled={props.busy === "enhance"} onClick={props.runEnhanceImage} type="button">
            {props.busy === "enhance" ? <Loader2 className="spin" size={16} /> : <Wand2 size={16} />}
            AI 白底模特图
          </button>
        </div>
      </div>

      <div className="panel form-panel">
        <div className="form-toolbar">
          <div>
            <h2>{props.draft.id ? "维护样衣资料" : "录入样衣资料"}</h2>
            <p>按在线样衣资料库口径维护款式、面料、版型关联信息</p>
          </div>
          <button className="ghost" disabled={props.busy === "complete"} onClick={props.runFieldCompletion} type="button">
            {props.busy === "complete" ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
            AI 补全
          </button>
        </div>

        <div className="form-grid">
          <Field label="样衣款号" value={props.draft.sku} onChange={(value) => setField("sku", value)} />
          <Field label="款式编号" value={props.draft.styleNo} onChange={(value) => setField("styleNo", value)} />
          <Field label="中文名称" value={props.draft.name} onChange={(value) => setField("name", value)} />
          <Field label="英文名称" value={props.draft.englishName} onChange={(value) => setField("englishName", value)} />
          <Field label="品类" value={props.draft.category} onChange={(value) => setField("category", value)} />
          <Field label="季节" value={props.draft.season} onChange={(value) => setField("season", value)} />
          <Field label="颜色" value={props.draft.color} onChange={(value) => setField("color", value)} />
          <Field label="尺码" value={props.draft.size} onChange={(value) => setField("size", value)} />
          <Field label="面料" value={props.draft.fabric} onChange={(value) => setField("fabric", value)} />
          <Field label="成分" value={props.draft.composition} onChange={(value) => setField("composition", value)} />
          <Field label="供应商" value={props.draft.supplier} onChange={(value) => setField("supplier", value)} />
          <Field label="吊牌价" value={props.draft.retailPrice} onChange={(value) => setField("retailPrice", value)} />
          <StorageSelector
            location={props.draft.location}
            rack={props.draft.rack}
            source="design"
            onLocationChange={(value) => {
              setField("location", value);
              setField("rack", getRackOptions(value, "design")[0] || "");
            }}
            onRackChange={(value) => setField("rack", value)}
          />
          <label>
            样衣类型
            <select
              onChange={(event) => setField("sampleKind", event.target.value as SampleDraft["sampleKind"])}
              value={props.draft.sampleKind}
            >
              <option value="physical">实物样衣</option>
              <option value="digital3d">3D 样衣</option>
            </select>
          </label>
          <Field label="3D 链接" value={props.draft.threeDUrl} onChange={(value) => setField("threeDUrl", value)} />
        </div>

        <label>
          标签
          <input
            onChange={(event) => setField("styleTags", parseList(event.target.value))}
            value={props.draft.styleTags.join("，")}
          />
        </label>
        <label>
          工艺说明
          <textarea onChange={(event) => setField("craft", event.target.value)} value={props.draft.craft} />
        </label>
        <label>
          面料 BOM
          <textarea
            onChange={(event) => setField("bomItems", parseBom(event.target.value))}
            value={formatBom(props.draft.bomItems)}
          />
        </label>
        <div className="form-grid">
          <Field
            label="关联款式"
            value={props.draft.linkedStyles.join("，")}
            onChange={(value) => setField("linkedStyles", parseList(value))}
          />
          <Field
            label="关联面料"
            value={props.draft.linkedFabrics.join("，")}
            onChange={(value) => setField("linkedFabrics", parseList(value))}
          />
          <Field
            label="关联版型"
            value={props.draft.linkedPatterns.join("，")}
            onChange={(value) => setField("linkedPatterns", parseList(value))}
          />
          <Field
            label="数据范围"
            value={props.draft.visibilityScope}
            onChange={(value) => setField("visibilityScope", value)}
          />
        </div>
        <label>
          设计文件
          <textarea
            onChange={(event) => setField("designFiles", parseFiles(event.target.value))}
            value={formatFiles(props.draft.designFiles)}
          />
        </label>
        <label>
          备注
          <textarea onChange={(event) => setField("notes", event.target.value)} value={props.draft.notes} />
        </label>

        <div className="form-footer">
          <label className="checkline">
            <input
              checked={Boolean(props.draft.selected)}
              onChange={(event) => setField("selected", event.target.checked)}
              type="checkbox"
            />
            加入在线选样
          </label>
          <button disabled={props.busy === "save"} onClick={props.saveDraft} type="button">
            {props.busy === "save" ? <Loader2 className="spin" size={16} /> : <Check size={16} />}
            保存档案
          </button>
        </div>
      </div>
    </section>
  );
}

function BulkGoodsView(props: {
  bulkDraft: SampleDraft;
  busy: string;
  filteredBulkSamples: Sample[];
  selected?: Sample;
  bulkQuery: string;
  bulkTeamFilter: string;
  bulkStorageFilter: string;
  setBulkDraft: Dispatch<SetStateAction<SampleDraft>>;
  setBulkQuery: (value: string) => void;
  setBulkTeamFilter: (value: string) => void;
  setBulkStorageFilter: (value: string) => void;
  editBulkSample: (sample: Sample) => void;
  saveBulkDraft: () => Promise<void>;
  startBulkCreate: (team?: string) => void;
  uploadBulkBackImage: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  uploadBulkFrontImage: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
}) {
  const setField = <K extends keyof SampleDraft>(key: K, value: SampleDraft[K]) => {
    props.setBulkDraft((current) => ({ ...current, [key]: value }));
  };
  const backImage = props.bulkDraft.designFiles.find((file) => file.name.includes("背面"))?.url || "";

  return (
    <section className="bulk-layout">
      <div className="panel browser-panel">
        <div className="filters">
          <label className="search-box">
            <Search size={16} />
            <input
              onChange={(event) => props.setBulkQuery(event.target.value)}
              placeholder="搜索大货款号、品类、业务组"
              value={props.bulkQuery}
            />
          </label>
          <select onChange={(event) => props.setBulkTeamFilter(event.target.value)} value={props.bulkTeamFilter}>
            <option value="all">全部业务组</option>
            {businessTeams.map((team) => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
          <select onChange={(event) => props.setBulkStorageFilter(event.target.value)} value={props.bulkStorageFilter}>
            <option value="all">全部库位</option>
            {getStorageZones("bulk").map((zone) => (
              <option key={zone.location} value={zone.location}>
                {zone.location}
              </option>
            ))}
          </select>
        </div>

        <div className="bulk-list">
          {props.filteredBulkSamples.map((sample) => (
            <button
              className={`sample-card ${props.selected?.id === sample.id ? "active" : ""}`}
              key={sample.id}
              onClick={() => props.editBulkSample(sample)}
              type="button"
            >
              <img alt={sample.name} src={sample.enhancedImageUrl || sample.imageUrl} />
              <div className="sample-card-body">
                <div className="card-title">
                  <strong>{sample.name}</strong>
                  <span className="status in_stock">{sample.ownerTeam}</span>
                </div>
                <small>{sample.sku} · {sample.category}</small>
                <small>{sample.location} · {sample.rack}</small>
                <div className="tag-row">
                  {formatTags(sample.styleTags).slice(0, 4).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="panel bulk-form-panel">
        <div className="form-toolbar">
          <div>
            <h2>{props.bulkDraft.id ? "维护大货样品" : "大货录入"}</h2>
            <p>业务组大货样品与设计部样品分库存放</p>
          </div>
          <button className="ghost" onClick={() => props.startBulkCreate(props.bulkDraft.ownerTeam)} type="button">
            <PackagePlus size={16} />
            新建大货
          </button>
        </div>

        <div className="bulk-images">
          <div className="image-preview compact">
            {props.bulkDraft.imageUrl ? <img alt="大货正面" src={props.bulkDraft.imageUrl} /> : <span>正面图</span>}
          </div>
          <div className="image-preview compact">
            {backImage ? <img alt="大货背面" src={backImage} /> : <span>背面图</span>}
          </div>
        </div>
        <div className="button-row">
          <label className="file-button">
            <Upload size={16} />
            上传正面
            <input accept="image/*" onChange={props.uploadBulkFrontImage} type="file" />
          </label>
          <label className="file-button">
            <Upload size={16} />
            上传背面
            <input accept="image/*" onChange={props.uploadBulkBackImage} type="file" />
          </label>
        </div>

        <div className="form-grid">
          <label>
            业务组
            <select
              onChange={(event) => {
                const team = event.target.value;
                props.setBulkDraft((current) => ({
                  ...current,
                  ownerTeam: team,
                  location: getDefaultStorageLocation("bulk", team),
                  rack: bulkRackOptions[0],
                  visibilityScope: `${team},设计中心,样衣管理员`
                }));
              }}
              value={props.bulkDraft.ownerTeam}
            >
              {businessTeams.map((team) => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </label>
          <Field label="大货款号" value={props.bulkDraft.sku} onChange={(value) => setField("sku", value)} />
          <Field label="款式编号" value={props.bulkDraft.styleNo} onChange={(value) => setField("styleNo", value)} />
          <Field label="中文名称" value={props.bulkDraft.name} onChange={(value) => setField("name", value)} />
          <Field label="英文名称" value={props.bulkDraft.englishName} onChange={(value) => setField("englishName", value)} />
          <Field label="品类" value={props.bulkDraft.category} onChange={(value) => setField("category", value)} />
          <Field label="季节" value={props.bulkDraft.season} onChange={(value) => setField("season", value)} />
          <Field label="颜色" value={props.bulkDraft.color} onChange={(value) => setField("color", value)} />
          <Field label="尺码" value={props.bulkDraft.size} onChange={(value) => setField("size", value)} />
          <Field label="面料" value={props.bulkDraft.fabric} onChange={(value) => setField("fabric", value)} />
          <Field label="成分" value={props.bulkDraft.composition} onChange={(value) => setField("composition", value)} />
          <Field label="供应商" value={props.bulkDraft.supplier} onChange={(value) => setField("supplier", value)} />
          <Field label="大货价" value={props.bulkDraft.retailPrice} onChange={(value) => setField("retailPrice", value)} />
          <StorageSelector
            location={props.bulkDraft.location}
            rack={props.bulkDraft.rack}
            source="bulk"
            ownerTeam={props.bulkDraft.ownerTeam}
            onLocationChange={(value) => {
              setField("location", value);
              setField("rack", getRackOptions(value, "bulk", props.bulkDraft.ownerTeam)[0] || "");
            }}
            onRackChange={(value) => setField("rack", value)}
          />
        </div>

        <label>
          标签
          <input
            onChange={(event) => setField("styleTags", parseList(event.target.value))}
            value={props.bulkDraft.styleTags.join("，")}
          />
        </label>
        <label>
          工艺/大货说明
          <textarea onChange={(event) => setField("craft", event.target.value)} value={props.bulkDraft.craft} />
        </label>
        <label>
          面料 BOM
          <textarea
            onChange={(event) => setField("bomItems", parseBom(event.target.value))}
            value={formatBom(props.bulkDraft.bomItems)}
          />
        </label>

        <div className="button-row">
          <button disabled={props.busy === "bulk-save"} onClick={props.saveBulkDraft} type="button">
            {props.busy === "bulk-save" ? <Loader2 className="spin" size={16} /> : <Check size={16} />}
            保存大货样品
          </button>
          {props.selected && (
            <button className="ghost" onClick={() => props.editBulkSample(props.selected as Sample)} type="button">
              <FileText size={16} />
              编辑当前
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function BorrowView(props: {
  billingRule: BillingRule;
  borrowForm: { borrower: string; team: string; purpose: string; dueAt: string };
  busy: string;
  damageCandidates: Sample[];
  damageForm: { reporter: string; team: string; reason: DamageReason; estimatedLoss: string; note: string };
  damageQuery: string;
  selected: Sample;
  setBillingRule: Dispatch<SetStateAction<BillingRule>>;
  setBorrowForm: Dispatch<SetStateAction<{ borrower: string; team: string; purpose: string; dueAt: string }>>;
  setDamageForm: Dispatch<SetStateAction<{ reporter: string; team: string; reason: DamageReason; estimatedLoss: string; note: string }>>;
  setDamageQuery: (value: string) => void;
  setSelectedId: (value: string) => void;
  borrowSelected: () => Promise<void>;
  reportDamageSelected: () => Promise<void>;
  returnSelected: () => Promise<void>;
}) {
  const updateBillingRule = (field: keyof BillingRule, value: string, percentage = false) => {
    const numericValue = Number(value);
    props.setBillingRule((current) => ({
      ...current,
      [field]: Number.isFinite(numericValue) ? (percentage ? numericValue / 100 : numericValue) : 0
    }));
  };

  return (
    <section className="borrow-layout">
      <div className="panel selected-panel">
        <img alt={props.selected.name} src={props.selected.enhancedImageUrl || props.selected.imageUrl} />
        <div>
          <p className="eyebrow">{props.selected.sku}</p>
          <h2>{props.selected.name}</h2>
          <p>{props.selected.location} · {props.selected.rack}</p>
          <span className={`status ${props.selected.status}`}>{sampleStatusText[props.selected.status]}</span>
          <div className="money-stack">
            <small>吊牌价 {formatRetailPrice(props.selected)}</small>
            <strong>借样 {formatMoney(calculateBorrowFee(props.selected, props.billingRule))}/次</strong>
          </div>
        </div>
      </div>

      <div className="panel borrow-form">
        <h2>借出登记</h2>
        <Field
          label="借用人"
          value={props.borrowForm.borrower}
          onChange={(value) => props.setBorrowForm((current) => ({ ...current, borrower: value }))}
        />
        <Field
          label="部门"
          value={props.borrowForm.team}
          onChange={(value) => props.setBorrowForm((current) => ({ ...current, team: value }))}
        />
        <Field
          label="用途"
          value={props.borrowForm.purpose}
          onChange={(value) => props.setBorrowForm((current) => ({ ...current, purpose: value }))}
        />
        <label>
          预计归还
          <input
            onChange={(event) => props.setBorrowForm((current) => ({ ...current, dueAt: event.target.value }))}
            type="datetime-local"
            value={props.borrowForm.dueAt}
          />
        </label>
        <div className="button-row">
          <button disabled={props.busy === "borrow"} onClick={props.borrowSelected} type="button">
            <ClipboardList size={16} />
            确认借出
          </button>
          <button className="ghost" disabled={props.busy === "return"} onClick={props.returnSelected} type="button">
            <RotateCcw size={16} />
            归还入库
          </button>
        </div>
      </div>

      <div className="panel damage-form">
        <h2>样衣报损</h2>
        <p>用于出库报损：丢失、损坏、年久自然淘汰。</p>
        <div className="form-grid two">
          <Field
            label="报损人"
            value={props.damageForm.reporter}
            onChange={(value) => props.setDamageForm((current) => ({ ...current, reporter: value }))}
          />
          <Field
            label="部门"
            value={props.damageForm.team}
            onChange={(value) => props.setDamageForm((current) => ({ ...current, team: value }))}
          />
        </div>
        <label>
          报损原因
          <select
            onChange={(event) =>
              props.setDamageForm((current) => ({ ...current, reason: event.target.value as DamageReason }))
            }
            value={props.damageForm.reason}
          >
            {Object.entries(damageReasonText).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="估损金额"
          value={props.damageForm.estimatedLoss}
          onChange={(value) => props.setDamageForm((current) => ({ ...current, estimatedLoss: value }))}
        />
        <label>
          报损说明
          <textarea
            onChange={(event) => props.setDamageForm((current) => ({ ...current, note: event.target.value }))}
            value={props.damageForm.note}
          />
        </label>
        <div className="fee-preview">
          <Banknote size={16} />
          <span>建议估损 {formatMoney(calculateDamageFee(props.selected, props.damageForm.reason, props.billingRule))}</span>
        </div>
        <button
          className="danger"
          disabled={props.busy === "damage" || props.selected.status === "damaged"}
          onClick={() => void props.reportDamageSelected()}
          type="button"
        >
          {props.busy === "damage" ? <Loader2 className="spin" size={16} /> : <AlertTriangle size={16} />}
          确认报损
        </button>
      </div>

      <div className="panel history-panel">
        <h2>借还记录</h2>
        <div className="history-list">
          {props.selected.borrowHistory.map((record) => (
            <div key={record.id}>
              <strong>{record.borrower}</strong>
              <span>{record.team} · {record.purpose}</span>
              <small>{formatDate(record.borrowedAt)} 借出</small>
              <small>{record.returnedAt ? `${formatDate(record.returnedAt)} 归还` : "未归还"}</small>
            </div>
          ))}
        </div>
      </div>

      <div className="panel billing-rule-panel">
        <div className="form-toolbar">
          <div>
            <h2>收费规则</h2>
            <p>业务员前台可见借样计价，后台可随时调整。</p>
          </div>
          <Settings2 size={22} />
        </div>
        <div className="form-grid two">
          <Field
            label="借样基础费"
            value={String(props.billingRule.baseBorrowFee)}
            onChange={(value) => updateBillingRule("baseBorrowFee", value)}
          />
          <Field
            label="吊牌价比例%"
            value={String(Math.round(props.billingRule.borrowRate * 100))}
            onChange={(value) => updateBillingRule("borrowRate", value, true)}
          />
          <Field
            label="最低借样费"
            value={String(props.billingRule.minBorrowFee)}
            onChange={(value) => updateBillingRule("minBorrowFee", value)}
          />
          <Field
            label="逾期每日费"
            value={String(props.billingRule.overdueDailyFee)}
            onChange={(value) => updateBillingRule("overdueDailyFee", value)}
          />
          <Field
            label="丢失赔付%"
            value={String(Math.round(props.billingRule.lostRate * 100))}
            onChange={(value) => updateBillingRule("lostRate", value, true)}
          />
          <Field
            label="损坏赔付%"
            value={String(Math.round(props.billingRule.damageRate * 100))}
            onChange={(value) => updateBillingRule("damageRate", value, true)}
          />
          <Field
            label="淘汰赔付%"
            value={String(Math.round(props.billingRule.retiredRate * 100))}
            onChange={(value) => updateBillingRule("retiredRate", value, true)}
          />
        </div>
      </div>

      <div className="panel damage-candidates">
        <div className="form-toolbar">
          <div>
            <h2>老样衣报损推荐</h2>
            <p>默认优先推荐季节较早、维护中或借出较久的样衣，也可按款号搜索。</p>
          </div>
          <AlertTriangle size={22} />
        </div>
        <label className="search-box">
          <Search size={16} />
          <input
            onChange={(event) => props.setDamageQuery(event.target.value)}
            placeholder="按款号、名称、品类搜索"
            value={props.damageQuery}
          />
        </label>
        <div className="damage-candidate-list">
          {props.damageCandidates.map((sample) => (
            <button
              className={sample.id === props.selected.id ? "active" : ""}
              key={sample.id}
              onClick={() => props.setSelectedId(sample.id)}
              type="button"
            >
              <img alt={sample.name} src={sample.enhancedImageUrl || sample.imageUrl} />
              <div>
                <strong>{sample.sku}</strong>
                <span>{sample.name} · {sample.season || sample.category}</span>
                <small>{sampleStatusText[sample.status]} · {sample.location} · {sample.rack}</small>
                <small>{formatRetailPrice(sample)}</small>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function BillingPullView(props: {
  billingRows: BorrowBillingRow[];
  billingRule: BillingRule;
}) {
  const [period, setPeriod] = useState<BillingPeriod>("month");
  const [source, setSource] = useState<BillingSource>("all");
  const [pulledAt, setPulledAt] = useState(new Date().toISOString());
  const rows = useMemo(() => filterBillingRows(props.billingRows, source), [props.billingRows, source]);
  const buckets = useMemo(() => summarizeBillingRows(rows, period), [rows, period]);
  const totalFee = rows.reduce((total, row) => total + row.fee, 0);
  const latestBucket = buckets[0];

  return (
    <section className="billing-layout">
      <div className="panel billing-control-panel">
        <div className="form-toolbar">
          <div>
            <p className="eyebrow">账单拉取</p>
            <h2>样衣借用费用</h2>
            <span>按年 / 月 / 周快速拉取前台申请和后台实际借出费用。</span>
          </div>
          <Banknote size={24} />
        </div>

        <div className="form-grid two">
          <label>
            汇总周期
            <select onChange={(event) => setPeriod(event.target.value as BillingPeriod)} value={period}>
              <option value="year">按年</option>
              <option value="month">按月</option>
              <option value="week">按周</option>
            </select>
          </label>
          <label>
            账单来源
            <select onChange={(event) => setSource(event.target.value as BillingSource)} value={source}>
              <option value="all">全部账单</option>
              <option value="request">前台借样申请</option>
              <option value="borrow">后台实际借出</option>
            </select>
          </label>
        </div>

        <div className="button-row">
          <button onClick={() => setPulledAt(new Date().toISOString())} type="button">
            <ReceiptText size={16} />
            拉取账单
          </button>
          <button className="ghost" disabled={!rows.length} onClick={() => downloadBillingCsv(rows)} type="button">
            <FileText size={16} />
            导出明细
          </button>
        </div>

        <div className="billing-rule-note">
          <strong>当前计费规则</strong>
          <span>
            基础 {formatMoney(props.billingRule.baseBorrowFee)} + 吊牌价 {Math.round(props.billingRule.borrowRate * 100)}%，最低{" "}
            {formatMoney(props.billingRule.minBorrowFee)}/次
          </span>
          <small>最近拉取：{formatDate(pulledAt)}</small>
        </div>
      </div>

      <div className="billing-kpis">
        <Metric icon={ReceiptText} label="账单笔数" value={rows.length} />
        <div className="metric money-metric">
          <Banknote size={18} />
          <span>借样费用</span>
          <strong>{formatMoney(totalFee)}</strong>
        </div>
        <div className="metric money-metric">
          <ClipboardList size={18} />
          <span>平均单次</span>
          <strong>{formatMoney(rows.length ? totalFee / rows.length : 0)}</strong>
        </div>
        <div className="metric money-metric">
          <Database size={18} />
          <span>{latestBucket?.label || "最近周期"}</span>
          <strong>{latestBucket ? formatMoney(latestBucket.totalFee) : formatMoney(0)}</strong>
        </div>
      </div>

      <div className="panel billing-summary-panel">
        <div className="form-toolbar">
          <div>
            <h2>周期汇总</h2>
            <p>用于每年、每月、每周快速对账。</p>
          </div>
        </div>
        <div className="billing-table">
          <div className="billing-row head">
            <span>周期</span>
            <span>笔数</span>
            <span>总费用</span>
            <span>平均费用</span>
          </div>
          {buckets.length ? (
            buckets.map((bucket) => (
              <div className="billing-row" key={bucket.key}>
                <strong>{bucket.label}</strong>
                <span>{bucket.count}</span>
                <span>{formatMoney(bucket.totalFee)}</span>
                <span>{formatMoney(bucket.averageFee)}</span>
              </div>
            ))
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      <div className="panel billing-detail-panel">
        <div className="form-toolbar">
          <div>
            <h2>账单明细</h2>
            <p>保留业务员、业务组、款号、品类、风格、库位，方便追溯客户需求。</p>
          </div>
        </div>
        <div className="billing-detail-list">
          {rows.slice(0, 18).map((row) => (
            <div key={row.id}>
              <strong>{row.sampleSku} · {row.sampleName}</strong>
              <span>{row.borrower} · {row.team} · {row.category || "未维护品类"}</span>
              <small>{formatDate(row.date)} · {billingSourceText(row.source)} · {row.location} {row.rack}</small>
              <b>{formatMoney(row.fee)}</b>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DataAnalysisView(props: {
  billingRows: BorrowBillingRow[];
  samples: Sample[];
}) {
  const [source, setSource] = useState<BillingSource>("all");
  const rows = useMemo(() => filterBillingRows(props.billingRows, source), [props.billingRows, source]);
  const analytics = useMemo(() => createBorrowAnalytics(rows), [rows]);
  const inStockCount = props.samples.filter((sample) => sample.status === "in_stock").length;

  return (
    <section className="analysis-layout">
      <div className="panel analysis-hero-panel">
        <div className="form-toolbar">
          <div>
            <p className="eyebrow">数据分析</p>
            <h2>客户借样需求画像</h2>
            <span>分析业务员、业务组、品类、风格和时间趋势，帮助设计部提前备样。</span>
          </div>
          <ReceiptText size={24} />
        </div>
        <label>
          分析来源
          <select onChange={(event) => setSource(event.target.value as BillingSource)} value={source}>
            <option value="all">全部借样数据</option>
            <option value="request">前台借样申请</option>
            <option value="borrow">后台实际借出</option>
          </select>
        </label>
        <div className="analysis-insights">
          {analytics.insights.map((item) => (
            <div key={item}>
              <Sparkles size={16} />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="billing-kpis">
        <Metric icon={ClipboardList} label="借样次数" value={analytics.totalCount} />
        <div className="metric money-metric">
          <Banknote size={18} />
          <span>借样费用</span>
          <strong>{formatMoney(analytics.totalFee)}</strong>
        </div>
        <Metric icon={BadgeCheck} label="当前在库" value={inStockCount} />
        <Metric icon={Shirt} label="样衣总数" value={props.samples.length} />
      </div>

      <div className="analysis-grid">
        <RankedPanel title="业务员排行" rows={analytics.topBorrowers} />
        <RankedPanel title="业务组排行" rows={analytics.topTeams} />
        <RankedPanel title="品类借用最多" rows={analytics.topCategories} />
        <RankedPanel title="风格借用最多" rows={analytics.topStyles} />
      </div>

      <div className="analysis-grid wide">
        <RankedPanel title="月度趋势" rows={analytics.monthlyTrend} />
        <RankedPanel title="周度趋势" rows={analytics.weeklyTrend} />
      </div>

      <div className="panel prep-panel">
        <h2>第二年提前备样建议</h2>
        <div className="prep-list">
          {analytics.topCategories.slice(0, 4).map((item) => (
            <div key={item.label}>
              <strong>{item.label}</strong>
              <span>历史借用 {item.count} 次，费用 {formatMoney(item.fee)}</span>
              <small>建议：下一季提前准备 3-5 件同品类、同风格、不同价位段样衣。</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AiView(props: {
  busy: string;
  results: SimilarResult[];
  searchImage: string;
  searchText: string;
  similarityThreshold: number;
  quoteQuantity: number;
  materialName: string;
  materialUnitCost: string;
  setSearchText: (value: string) => void;
  setSimilarityThreshold: (value: number) => void;
  setQuoteQuantity: (value: number) => void;
  setMaterialName: (value: string) => void;
  setMaterialUnitCost: (value: string) => void;
  uploadSearchImage: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  runSimilarSearch: () => Promise<void>;
  setSelectedId: (id: string) => void;
  setTab: (tab: TabId) => void;
}) {
  return (
    <section className="ai-layout">
      <div className="panel image-panel">
        <div className="image-preview compact">
          {props.searchImage ? (
            <img alt="拍图检索" src={props.searchImage} />
          ) : (
            <div className="empty-image">
              <Camera size={28} />
              <span>拍图搜同款</span>
            </div>
          )}
        </div>
        <label className="file-button wide">
          <Upload size={16} />
          上传拍摄图
          <input accept="image/*" onChange={props.uploadSearchImage} type="file" />
        </label>
      </div>

      <div className="panel ai-search-panel">
        <h2>中英文与自然语言检索</h2>
        <textarea
          onChange={(event) => props.setSearchText(event.target.value)}
          placeholder="如: white cotton crew neck T-shirt, 白色纯棉圆领T恤"
          value={props.searchText}
        />
        <div className="quote-controls">
          <label>
            相似度阈值
            <input
              max="0.8"
              min="0"
              onChange={(event) => props.setSimilarityThreshold(Number(event.target.value))}
              step="0.01"
              type="range"
              value={props.similarityThreshold}
            />
            <small>{Math.round(props.similarityThreshold * 100)}%</small>
          </label>
          <Field
            label="报价数量"
            value={String(props.quoteQuantity)}
            onChange={(value) => props.setQuoteQuantity(Number(value) || 1)}
          />
          <Field label="替换面辅料" value={props.materialName} onChange={props.setMaterialName} />
          <Field label="材料单件成本" value={props.materialUnitCost} onChange={props.setMaterialUnitCost} />
        </div>
        <button disabled={props.busy === "search"} onClick={() => void props.runSimilarSearch()} type="button">
          {props.busy === "search" ? <Loader2 className="spin" size={16} /> : <Search size={16} />}
          检索并报价
        </button>
      </div>

      <div className="panel results-panel">
        <h2>候选样衣</h2>
        <div className="result-list">
          {props.results.map((result) => (
            <button
              key={result.sample.id}
              onClick={() => {
                props.setSelectedId(result.sample.id);
                props.setTab("library");
              }}
              type="button"
            >
              <img alt={result.sample.name} src={result.sample.enhancedImageUrl || result.sample.imageUrl} />
              <div>
                <strong>{result.sample.name}</strong>
                <span>{Math.round(result.score * 100)}% · {result.reason}</span>
                <small>{result.sample.styleTags.join("，")}</small>
                {result.quote && (
                  <em>
                    单价 ¥{result.quote.unitPrice.toFixed(2)} · 合计 ¥
                    {result.quote.totalPrice.toLocaleString("zh-CN")}
                  </em>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function FrontDeskPinterestView(props: {
  aiCreditsRemaining: number;
  busy: string;
  frontLogin: { name: string; team: string; phone: string };
  frontFavoriteIds: string[];
  frontCatalogSource: FrontCatalogSource;
  frontCatalogCounts: Record<FrontCatalogSource, number>;
  frontQuery: string;
  frontRequestForm: { purpose: string; dueAt: string; note: string };
  frontSamples: Sample[];
  frontSelectedIds: string[];
  frontSelectedSamples: Sample[];
  frontUser: { name: string; team: string; phone: string } | null;
  requests: BorrowRequest[];
  searchImage: string;
  selected?: Sample;
  similarResults: SimilarResult[];
  billingRule: BillingRule;
  generateFrontPpt: () => Promise<void>;
  openProfile: () => void;
  openYunzhi: () => void;
  reload: () => Promise<void>;
  runFrontVisualSearch: () => Promise<void>;
  setPortalMode: (value: PortalMode) => void;
  setFrontCatalogSource: (value: FrontCatalogSource) => void;
  setFrontLogin: Dispatch<SetStateAction<{ name: string; team: string; phone: string }>>;
  setFrontQuery: (value: string) => void;
  setFrontRequestForm: Dispatch<SetStateAction<{ purpose: string; dueAt: string; note: string }>>;
  setSelectedId: (value: string) => void;
  loginFrontDesk: () => void;
  submitFrontBorrowRequest: (target: Sample | Sample[]) => Promise<void>;
  toggleFrontFavorite: (sample: Sample) => void;
  toggleFrontSelect: (sample: Sample) => void;
  uploadSearchImage: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
}) {
  const [frontFilter, setFrontFilter] = useState<"all" | "available" | "favorites" | "selected">("all");
  const [frontDetailId, setFrontDetailId] = useState<string | null>(null);
  const [menuCollapsed, setMenuCollapsed] = useState(false);
  const [visualSearchOpen, setVisualSearchOpen] = useState(false);
  const [visualSearchHasRun, setVisualSearchHasRun] = useState(false);
  const [activeDetailImageId, setActiveDetailImageId] = useState("front");
  const [zoomImage, setZoomImage] = useState<{ sample: Sample; image: SampleViewImage } | null>(null);
  const catalogOptions: Array<{ id: FrontCatalogSource; label: string; icon: LucideIcon; count: number }> = [
    { id: "all", label: "全部样衣", icon: Home, count: props.frontCatalogCounts.all },
    { id: "design", label: "设计样衣", icon: Shirt, count: props.frontCatalogCounts.design },
    { id: "bulk", label: "大货样品", icon: Boxes, count: props.frontCatalogCounts.bulk }
  ];
  const visibleSamples = props.frontSamples.filter((sample) => {
    if (frontFilter === "available") {
      return sample.status === "in_stock";
    }
    if (frontFilter === "favorites") {
      return props.frontFavoriteIds.includes(sample.id);
    }
    if (frontFilter === "selected") {
      return props.frontSelectedIds.includes(sample.id);
    }
    return true;
  });
  const detailSample = frontDetailId ? props.frontSamples.find((sample) => sample.id === frontDetailId) || null : null;
  const detailImages = detailSample ? getSampleViewImages(detailSample) : [];
  const activeDetailImage = detailImages.find((image) => image.id === activeDetailImageId) || detailImages[0];
  const recommendationSamples = detailSample ? getRecommendedSamples(detailSample, props.frontSamples, 18) : [];
  const currentFavoriteCount = props.frontSamples.filter((sample) => props.frontFavoriteIds.includes(sample.id)).length;
  const currentSelectedCount = props.frontSamples.filter((sample) => props.frontSelectedIds.includes(sample.id)).length;
  const menuItems = [
    { id: "all" as const, label: "全部", icon: Home, count: props.frontSamples.length },
    {
      id: "available" as const,
      label: "在库",
      icon: BadgeCheck,
      count: props.frontSamples.filter((sample) => sample.status === "in_stock").length
    },
    { id: "favorites" as const, label: "收藏", icon: Heart, count: currentFavoriteCount },
    { id: "selected" as const, label: "已选", icon: CheckSquare, count: currentSelectedCount }
  ];
  const filterLabel = menuItems.find((item) => item.id === frontFilter)?.label || "全部";
  const catalogLabel = catalogOptions.find((item) => item.id === props.frontCatalogSource)?.label || "全部样衣";
  const boardTitle = props.frontCatalogSource === "all" && frontFilter === "all" ? "全部样衣" : `${filterLabel}${catalogLabel}`;
  const frontSampleIds = new Set(props.frontSamples.map((sample) => sample.id));
  const frontVisualResults = visualSearchHasRun
    ? props.similarResults.filter((result) => frontSampleIds.has(result.sample.id)).slice(0, 12)
    : [];

  const openSample = (sample: Sample) => {
    props.setSelectedId(sample.id);
    setFrontDetailId(sample.id);
    setActiveDetailImageId("front");
    setZoomImage(null);
  };
  const openVisualSearch = () => {
    setVisualSearchHasRun(false);
    setVisualSearchOpen(true);
  };
  const uploadFrontSearchImage = async (event: ChangeEvent<HTMLInputElement>) => {
    setVisualSearchHasRun(false);
    await props.uploadSearchImage(event);
  };
  const runFrontSearch = async () => {
    await props.runFrontVisualSearch();
    setVisualSearchHasRun(true);
  };

  const renderPinCard = (sample: Sample, compact = false) => {
    const favorited = props.frontFavoriteIds.includes(sample.id);
    const selected = props.frontSelectedIds.includes(sample.id);
    return (
      <article
        className={`front-pin-card ${props.selected?.id === sample.id ? "active" : ""} ${compact ? "compact" : ""}`}
        key={sample.id}
      >
        <button className="front-pin-image" onClick={() => openSample(sample)} type="button">
          <img alt={sample.name} src={sample.enhancedImageUrl || sample.imageUrl} />
        </button>
        <div className="front-pin-actions">
          <button
            aria-label="收藏"
            className={favorited ? "front-round-action active" : "front-round-action"}
            onClick={() => props.toggleFrontFavorite(sample)}
            type="button"
          >
            <Heart fill={favorited ? "currentColor" : "none"} size={16} />
          </button>
          <button
            aria-label="选择"
            className={selected ? "front-round-action active" : "front-round-action"}
            onClick={() => props.toggleFrontSelect(sample)}
            type="button"
          >
            <Check size={16} />
          </button>
        </div>
        <div className="front-pin-body">
          <button className="front-pin-title" onClick={() => openSample(sample)} type="button">
            <strong>{sample.name}</strong>
          </button>
          <span>{sample.sku} · {sample.category}</span>
          <div className="front-card-meta">
            <small className={`front-source ${sample.source}`}>{getSampleSourceLabel(sample)}</small>
            <small className={`status ${sample.status}`}>{sampleStatusText[sample.status]}</small>
            <small>{formatMoney(calculateBorrowFee(sample, props.billingRule))}/次</small>
            <small>{sample.color || sample.fabric}</small>
            <span className={favorited ? "front-like-count active" : "front-like-count"}>
              <Heart fill={favorited ? "currentColor" : "none"} size={14} />
              {sampleLikeCount(sample, props.frontFavoriteIds)}
            </span>
          </div>
        </div>
      </article>
    );
  };

  if (!props.frontUser) {
    return (
      <section className="front-login-layout">
        <div className="panel front-hero-panel">
          <p className="eyebrow">业务前台</p>
          <h2>业务员登录后可查看全部在线样衣</h2>
          <p>前台仅提交借出需求，不直接改变库存状态。设计部后台确认后再登记正式借出。</p>
          <div className="front-hero-stats">
            <span>在线样衣 {props.frontSamples.length}</span>
            <span>可申请 {props.frontSamples.filter((sample) => sample.status === "in_stock").length}</span>
            <span>待处理 {props.requests.filter((request) => request.status === "pending").length}</span>
          </div>
        </div>
        <div className="panel front-login-card">
          <div className="form-toolbar">
            <div>
              <h2>前台入口登录</h2>
              <p>用于记录申请人和业务组</p>
            </div>
            <UserRound size={24} />
          </div>
          <Field
            label="业务员姓名"
            value={props.frontLogin.name}
            onChange={(value) => props.setFrontLogin((current) => ({ ...current, name: value }))}
          />
          <Field
            label="业务组"
            value={props.frontLogin.team}
            onChange={(value) => props.setFrontLogin((current) => ({ ...current, team: value }))}
          />
          <Field
            label="手机"
            value={props.frontLogin.phone}
            onChange={(value) => props.setFrontLogin((current) => ({ ...current, phone: value }))}
          />
          <button onClick={props.loginFrontDesk} type="button">
            <LogIn size={16} />
            进入前台
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={`front-pinterest-shell ${menuCollapsed ? "menu-collapsed" : ""}`}>
      <aside className="front-side-menu">
        <div className="front-menu-head">
          <button
            aria-label={menuCollapsed ? "展开菜单" : "收起菜单"}
            className="front-menu-toggle"
            onClick={() => setMenuCollapsed((value) => !value)}
            type="button"
          >
            {menuCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <div className="front-menu-brand">
            <Shirt size={20} />
            <span>舜天信兴</span>
          </div>
        </div>

        <div className="front-catalog-switch" aria-label="前台库存类型">
          {catalogOptions.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={props.frontCatalogSource === item.id ? "active" : ""}
                key={item.id}
                onClick={() => {
                  props.setFrontCatalogSource(item.id);
                  setFrontFilter("all");
                  setFrontDetailId(null);
                  setVisualSearchHasRun(false);
                }}
                type="button"
              >
                <Icon size={16} />
                <span>{item.label}</span>
                <b>{item.count}</b>
              </button>
            );
          })}
        </div>

        <nav className="front-menu-list">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={frontFilter === item.id ? "active" : ""}
                key={item.id}
                onClick={() => {
                  setFrontFilter(item.id);
                  setFrontDetailId(null);
                }}
                type="button"
              >
                <Icon size={19} />
                <span>{item.label}</span>
                <b>{item.count}</b>
              </button>
            );
          })}
        </nav>

        <div className="front-menu-foot">
          <button onClick={() => props.setPortalMode("admin")} type="button">
            <ShieldCheck size={18} />
            <span>后台</span>
          </button>
          <button onClick={() => void props.reload()} type="button">
            <RotateCcw size={18} />
            <span>刷新</span>
          </button>
        </div>
      </aside>

      <div className="front-workspace">
        <header className="front-floating-topbar">
          <div className="front-search-pill">
            <Search size={16} />
            <input onChange={(event) => props.setFrontQuery(event.target.value)} placeholder="搜索" value={props.frontQuery} />
            <button
              aria-label="拍照搜款"
              className="front-visual-trigger"
              onClick={openVisualSearch}
              title="拍照或上传图片搜类似款"
              type="button"
            >
              <Camera size={18} />
            </button>
          </div>
          <div className="front-top-actions">
            <button className="assistant-trigger compact" onClick={props.openYunzhi} type="button">
              <img alt="问问云知" src="./yunzhi-avatar.png" />
              问问云知
            </button>
            <span className="front-credit-chip">
              <Coins size={15} />
              {props.aiCreditsRemaining}
            </span>
            <button
              disabled={!props.frontSelectedSamples.length || props.busy === "ppt"}
              onClick={() => void props.generateFrontPpt()}
              type="button"
            >
              {props.busy === "ppt" ? <Loader2 className="spin" size={16} /> : <Presentation size={16} />}
              推款 PPT
              {props.frontSelectedSamples.length ? <b>{props.frontSelectedSamples.length}</b> : null}
            </button>
            <button className="ghost" onClick={props.openProfile} type="button">
              <UserRound size={16} />
              我的
            </button>
          </div>
        </header>

        {!detailSample ? (
          <div className="front-board">
            <div className="front-board-head">
              <div>
                <p className="eyebrow">业务前台</p>
                <h2>{boardTitle}</h2>
              </div>
              <div className="front-board-stats">
                <span>{visibleSamples.length} 件</span>
                <span>已选 {props.frontSelectedSamples.length}</span>
                <span>{props.frontUser.name} · {props.frontUser.team}</span>
              </div>
            </div>

            {visibleSamples.length ? (
              <div className="front-waterfall">{visibleSamples.map((sample) => renderPinCard(sample))}</div>
            ) : (
              <EmptyState />
            )}
          </div>
        ) : (
          <div className="front-detail-page">
            <button className="front-back-button" onClick={() => setFrontDetailId(null)} type="button">
              <ArrowLeft size={18} />
              返回
            </button>

            <div className="front-detail-hero">
              <div className="front-detail-image">
                <div className="front-detail-image-stage">
                  {activeDetailImage && <img alt={`${detailSample.name}${activeDetailImage.label}`} src={activeDetailImage.url} />}
                  <button
                    aria-label="放大图片"
                    className="front-zoom-button"
                    disabled={!activeDetailImage}
                    onClick={() => activeDetailImage && setZoomImage({ sample: detailSample, image: activeDetailImage })}
                    type="button"
                  >
                    <Expand size={18} />
                  </button>
                </div>
                {detailImages.length > 1 ? (
                  <div aria-label="样衣正背面图片" className="front-detail-thumbs">
                    {detailImages.map((image) => (
                      <button
                        className={image.id === activeDetailImage?.id ? "active" : ""}
                        key={image.id}
                        onClick={() => setActiveDetailImageId(image.id)}
                        type="button"
                      >
                        <img alt={`${detailSample.name}${image.label}`} src={image.url} />
                        <span>{image.label}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="front-detail-thumbs single">
                    <span>背面图待上传</span>
                  </div>
                )}
              </div>

              <div className="front-detail-info">
                <div className="front-detail-actions">
                  <button
                    className={props.frontFavoriteIds.includes(detailSample.id) ? "front-icon-text active" : "front-icon-text"}
                    onClick={() => props.toggleFrontFavorite(detailSample)}
                    type="button"
                  >
                    <Heart fill={props.frontFavoriteIds.includes(detailSample.id) ? "currentColor" : "none"} size={18} />
                    收藏
                  </button>
                  <button
                    className={props.frontSelectedIds.includes(detailSample.id) ? "front-icon-text active" : "front-icon-text"}
                    onClick={() => props.toggleFrontSelect(detailSample)}
                    type="button"
                  >
                    <Check size={18} />
                    选择
                  </button>
                  <span className={props.frontFavoriteIds.includes(detailSample.id) ? "front-like-count active" : "front-like-count"}>
                    <Heart fill={props.frontFavoriteIds.includes(detailSample.id) ? "currentColor" : "none"} size={18} />
                    {sampleLikeCount(detailSample, props.frontFavoriteIds)}
                  </span>
                </div>

                <div>
                  <p className="eyebrow">{detailSample.sku}</p>
                  <h2>{detailSample.name}</h2>
                  <p>{detailSample.color} · {detailSample.fabric}</p>
                </div>

                <div className="front-detail-tags">
                  {formatTags(detailSample.styleTags).slice(0, 7).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>

                <div className="info-grid">
                  <Info label="样衣类型" value={getSampleSourceLabel(detailSample)} />
                  <Info label="状态" value={sampleStatusText[detailSample.status]} />
                  <Info label="吊牌价" value={formatRetailPrice(detailSample)} />
                  <Info label="借样计费" value={`${formatMoney(calculateBorrowFee(detailSample, props.billingRule))}/次`} />
                  <Info label="季节" value={detailSample.season} />
                  <Info label="尺码" value={detailSample.size} />
                  <Info label="库位" value={`${detailSample.location} ${detailSample.rack}`} />
                </div>

                {props.frontSelectedSamples.length > 0 && (
                  <div className="selected-strip">
                    <strong>已选推款</strong>
                    <div>
                      {props.frontSelectedSamples.map((sample) => (
                        <span key={sample.id}>{sample.sku}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="front-request-form compact">
                  <Field
                    label="借样用途"
                    value={props.frontRequestForm.purpose}
                    onChange={(value) => props.setFrontRequestForm((current) => ({ ...current, purpose: value }))}
                  />
                  <label>
                    期望归还
                    <input
                      onChange={(event) =>
                        props.setFrontRequestForm((current) => ({ ...current, dueAt: event.target.value }))
                      }
                      type="datetime-local"
                      value={props.frontRequestForm.dueAt}
                    />
                  </label>
                  <label>
                    备注
                    <textarea
                      onChange={(event) =>
                        props.setFrontRequestForm((current) => ({ ...current, note: event.target.value }))
                      }
                      value={props.frontRequestForm.note}
                    />
                  </label>
                  <div className="button-row">
                    <button
                      disabled={props.busy === "front-request"}
                      onClick={() => void props.submitFrontBorrowRequest(detailSample)}
                      type="button"
                    >
                      {props.busy === "front-request" ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
                      申请当前样衣
                    </button>
                    <button
                      className="ghost"
                      disabled={props.busy === "front-request" || !props.frontSelectedSamples.length}
                      onClick={() => void props.submitFrontBorrowRequest(props.frontSelectedSamples)}
                      type="button"
                    >
                      <ClipboardList size={16} />
                      申请已选
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <section className="front-recommend-section">
              <div className="front-board-head">
                <div>
                  <p className="eyebrow">近似款推荐</p>
                  <h2>{detailSample.category || "相关样衣"}</h2>
                </div>
                <span>{recommendationSamples.length} 件</span>
              </div>
              {recommendationSamples.length ? (
                <div className="front-waterfall recommend">
                  {recommendationSamples.map((sample) => renderPinCard(sample, true))}
                </div>
              ) : (
                <EmptyState />
              )}
            </section>
          </div>
        )}
      </div>

      {visualSearchOpen && (
        <div className="front-visual-backdrop" role="presentation">
          <section className="front-visual-panel" role="dialog" aria-label="拍照搜款">
            <div className="profile-head">
              <div>
                <p className="eyebrow">拍照搜款</p>
                <h2>上传图片检索类似样衣</h2>
                <span>支持现场拍照或从相册选择，结果仅展示当前前台可见样衣。</span>
              </div>
              <button className="icon-button" onClick={() => setVisualSearchOpen(false)} type="button">
                <X size={17} />
              </button>
            </div>

            <div className="front-visual-body">
              <div className="front-visual-upload">
                <div className="image-preview compact">
                  {props.searchImage ? (
                    <img alt="拍照搜款" src={props.searchImage} />
                  ) : (
                    <div className="empty-image">
                      <Camera size={28} />
                      <span>拍照或上传图片</span>
                    </div>
                  )}
                </div>
                <label className="file-button wide">
                  <ImageUp size={16} />
                  选择图片
                  <input accept="image/*" capture="environment" onChange={uploadFrontSearchImage} type="file" />
                </label>
                <button disabled={props.busy === "search" || !props.searchImage} onClick={() => void runFrontSearch()} type="button">
                  {props.busy === "search" ? <Loader2 className="spin" size={16} /> : <Search size={16} />}
                  搜类似款
                </button>
              </div>

              <div className="front-visual-results">
                <div className="front-board-head">
                  <div>
                    <p className="eyebrow">检索结果</p>
                    <h2>
                      {frontVisualResults.length
                        ? `${frontVisualResults.length} 个候选款`
                        : visualSearchHasRun
                          ? "未找到候选款"
                          : "等待上传图片"}
                    </h2>
                  </div>
                </div>
                {frontVisualResults.length ? (
                  <div className="front-visual-result-grid">
                    {frontVisualResults.map((result) => {
                      const sample = props.frontSamples.find((item) => item.id === result.sample.id) || result.sample;
                      return (
                        <button
                          className="front-visual-result"
                          key={result.sample.id}
                          onClick={() => {
                            openSample(sample);
                            setVisualSearchOpen(false);
                          }}
                          type="button"
                        >
                          <img alt={sample.name} src={sample.enhancedImageUrl || sample.imageUrl} />
                          <div>
                            <strong>{sample.name}</strong>
                            <span>{sample.sku} · {Math.round(result.score * 100)}%</span>
                            <small>{result.reason}</small>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Search size={28} />
                    <span>{visualSearchHasRun ? "换一张图片再试" : "上传图片后点击搜类似款"}</span>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {zoomImage && (
        <div className="front-image-zoom-backdrop" onClick={() => setZoomImage(null)} role="presentation">
          <section
            aria-label="样衣图片放大预览"
            className="front-image-zoom-panel"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="profile-head">
              <div>
                <p className="eyebrow">
                  {zoomImage.sample.sku} · {zoomImage.image.label}
                </p>
                <h2>{zoomImage.sample.name}</h2>
              </div>
              <button className="icon-button" onClick={() => setZoomImage(null)} type="button">
                <X size={17} />
              </button>
            </div>
            <div className="front-image-zoom-stage">
              <img alt={`${zoomImage.sample.name}${zoomImage.image.label}`} src={zoomImage.image.url} />
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function FrontDeskView(props: {
  busy: string;
  frontLogin: { name: string; team: string; phone: string };
  frontFavoriteIds: string[];
  frontQuery: string;
  frontRequestForm: { purpose: string; dueAt: string; note: string };
  frontSamples: Sample[];
  frontSelectedIds: string[];
  frontSelectedSamples: Sample[];
  frontUser: { name: string; team: string; phone: string } | null;
  requests: BorrowRequest[];
  selected?: Sample;
  setFrontLogin: Dispatch<SetStateAction<{ name: string; team: string; phone: string }>>;
  setFrontQuery: (value: string) => void;
  setFrontRequestForm: Dispatch<SetStateAction<{ purpose: string; dueAt: string; note: string }>>;
  setSelectedId: (value: string) => void;
  loginFrontDesk: () => void;
  submitFrontBorrowRequest: (target: Sample | Sample[]) => Promise<void>;
  toggleFrontFavorite: (sample: Sample) => void;
  toggleFrontSelect: (sample: Sample) => void;
}) {
  const userRequests = props.frontUser
    ? props.requests.filter((request) => request.requester === props.frontUser?.name)
    : [];

  if (!props.frontUser) {
    return (
      <section className="front-login-layout">
        <div className="panel front-hero-panel">
          <p className="eyebrow">业务前台</p>
          <h2>业务员登录后可查看全部在线样衣</h2>
          <p>前台仅提交借出需求，不直接改变库存状态。设计部后台确认后再登记正式借出。</p>
          <div className="front-hero-stats">
            <span>在线样衣 {props.frontSamples.length}</span>
            <span>可申请 {props.frontSamples.filter((sample) => sample.status === "in_stock").length}</span>
            <span>待处理 {props.requests.filter((request) => request.status === "pending").length}</span>
          </div>
        </div>
        <div className="panel front-login-card">
          <div className="form-toolbar">
            <div>
              <h2>前台入口登录</h2>
              <p>用于记录申请人和业务组</p>
            </div>
            <UserRound size={24} />
          </div>
          <Field
            label="业务员姓名"
            value={props.frontLogin.name}
            onChange={(value) => props.setFrontLogin((current) => ({ ...current, name: value }))}
          />
          <Field
            label="业务组"
            value={props.frontLogin.team}
            onChange={(value) => props.setFrontLogin((current) => ({ ...current, team: value }))}
          />
          <Field
            label="手机"
            value={props.frontLogin.phone}
            onChange={(value) => props.setFrontLogin((current) => ({ ...current, phone: value }))}
          />
          <button onClick={props.loginFrontDesk} type="button">
            <LogIn size={16} />
            进入前台
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="front-desk-layout">
      <div className="panel front-catalog-panel">
        <div className="front-user-line">
          <div>
            <strong>{props.frontUser.name}</strong>
            <span>{props.frontUser.team}</span>
          </div>
          <small>已选 {props.frontSelectedSamples.length} 件</small>
        </div>
        <label className="search-box">
          <Search size={16} />
          <input
            onChange={(event) => props.setFrontQuery(event.target.value)}
            placeholder="搜索款号、品类、颜色、面料"
            value={props.frontQuery}
          />
        </label>
        <div className="front-sample-grid">
          {props.frontSamples.map((sample) => (
            <article
              className={`front-sample-card ${props.selected?.id === sample.id ? "active" : ""}`}
              key={sample.id}
            >
              <button className="front-card-main" onClick={() => props.setSelectedId(sample.id)} type="button">
                <img alt={sample.name} src={sample.enhancedImageUrl || sample.imageUrl} />
              </button>
              <div className="front-card-body">
                <strong>{sample.name}</strong>
                <span>{sample.sku} · {sample.category}</span>
                <div className="front-card-meta">
                  <small className={`front-source ${sample.source}`}>{getSampleSourceLabel(sample)}</small>
                  <small className={`status ${sample.status}`}>{sampleStatusText[sample.status]}</small>
                  <small>{sample.color || sample.fabric}</small>
                </div>
                <div className="front-card-actions">
                  <button
                    className={props.frontSelectedIds.includes(sample.id) ? "front-action active" : "front-action"}
                    onClick={() => props.toggleFrontSelect(sample)}
                    type="button"
                  >
                    <Check size={15} />
                    选中
                  </button>
                  <button
                    className={props.frontFavoriteIds.includes(sample.id) ? "front-action active" : "front-action"}
                    onClick={() => props.toggleFrontFavorite(sample)}
                    type="button"
                  >
                    <Heart fill={props.frontFavoriteIds.includes(sample.id) ? "currentColor" : "none"} size={15} />
                    收藏
                  </button>
                  <span className={props.frontFavoriteIds.includes(sample.id) ? "front-like-count active" : "front-like-count"}>
                    <Heart fill={props.frontFavoriteIds.includes(sample.id) ? "currentColor" : "none"} size={15} />
                    {sampleLikeCount(sample, props.frontFavoriteIds)}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="panel front-request-panel">
        {props.selected ? (
          <>
            <img alt={props.selected.name} src={props.selected.enhancedImageUrl || props.selected.imageUrl} />
            <div className="detail-head compact-head">
              <div>
                <p className="eyebrow">{props.selected.sku}</p>
                <h2>{props.selected.name}</h2>
                <p>{props.selected.color} · {props.selected.fabric}</p>
              </div>
              <span className={`status ${props.selected.status}`}>{sampleStatusText[props.selected.status]}</span>
            </div>
            <div className="info-grid">
              <Info label="位置" value={`${props.selected.location} ${props.selected.rack}`} />
              <Info label="季节" value={props.selected.season} />
              <Info label="尺码" value={props.selected.size} />
              <Info label="供应商" value={props.selected.supplier} />
            </div>
            <div className="front-request-form">
              {props.frontSelectedSamples.length > 0 && (
                <div className="selected-strip">
                  <strong>已选推款</strong>
                  <div>
                    {props.frontSelectedSamples.map((sample) => (
                      <span key={sample.id}>{sample.sku}</span>
                    ))}
                  </div>
                </div>
              )}
              <Field
                label="借样用途"
                value={props.frontRequestForm.purpose}
                onChange={(value) => props.setFrontRequestForm((current) => ({ ...current, purpose: value }))}
              />
              <label>
                期望归还
                <input
                  onChange={(event) =>
                    props.setFrontRequestForm((current) => ({ ...current, dueAt: event.target.value }))
                  }
                  type="datetime-local"
                  value={props.frontRequestForm.dueAt}
                />
              </label>
              <label>
                备注
                <textarea
                  onChange={(event) =>
                    props.setFrontRequestForm((current) => ({ ...current, note: event.target.value }))
                  }
                  value={props.frontRequestForm.note}
                />
              </label>
              <div className="button-row">
                <button
                  disabled={props.busy === "front-request"}
                  onClick={() => void props.submitFrontBorrowRequest(props.selected as Sample)}
                  type="button"
                >
                  {props.busy === "front-request" ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
                  申请当前样衣
                </button>
                <button
                  className="ghost"
                  disabled={props.busy === "front-request" || !props.frontSelectedSamples.length}
                  onClick={() => void props.submitFrontBorrowRequest(props.frontSelectedSamples)}
                  type="button"
                >
                  <ClipboardList size={16} />
                  申请已选
                </button>
              </div>
            </div>
          </>
        ) : (
          <EmptyState />
        )}
      </div>

      <div className="panel front-history-panel">
        <h2>我的申请</h2>
        <div className="history-list">
          {userRequests.length ? (
            userRequests.map((request) => (
              <div key={request.id}>
                <strong>{request.sampleName}</strong>
                <span>{request.sampleSku} · {request.purpose}</span>
                <small>{formatDate(request.createdAt)} 提交</small>
                <small>{borrowRequestStatusText[request.status]}</small>
              </div>
            ))
          ) : (
            <div>
              <strong>暂无申请</strong>
              <span>选择样衣后提交借出需求</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ProfileDrawer(props: {
  bills: FeeBill[];
  frontUser: FrontUser | null;
  onClose: () => void;
  pptRecords: PptRecord[];
  requests: BorrowRequest[];
}) {
  const visibleRequests = props.frontUser
    ? props.requests.filter((request) => request.requester === props.frontUser?.name)
    : props.requests;

  return (
    <div className="profile-backdrop" role="presentation">
      <aside className="panel profile-drawer" role="dialog" aria-label="我的">
        <div className="profile-head">
          <div>
            <p className="eyebrow">我的</p>
            <h2>{props.frontUser ? props.frontUser.name : "个人中心"}</h2>
            <span>{props.frontUser ? props.frontUser.team : "登录业务前台后记录会归到个人名下"}</span>
          </div>
          <button className="icon-button" onClick={props.onClose} type="button">
            <X size={17} />
          </button>
        </div>

        <section className="profile-section">
          <h3>
            <ClipboardList size={16} />
            借样记录
          </h3>
          <div className="profile-list">
            {visibleRequests.length ? (
              visibleRequests.slice(0, 8).map((request) => (
                <div key={request.id}>
                  <strong>{request.sampleName}</strong>
                  <span>{request.sampleSku} · {request.purpose}</span>
                  <small>
                    {formatDate(request.createdAt)} · {borrowRequestStatusText[request.status]}
                  </small>
                </div>
              ))
            ) : (
              <div>
                <strong>暂无借样记录</strong>
                <span>在业务前台提交申请后会出现在这里</span>
              </div>
            )}
          </div>
        </section>

        <section className="profile-section">
          <h3>
            <Presentation size={16} />
            PPT 记录
          </h3>
          <div className="profile-list">
            {props.pptRecords.length ? (
              props.pptRecords.slice(0, 8).map((record) => (
                <div key={record.id}>
                  <strong>{record.fileName}</strong>
                  <span>{record.sampleCount} 件 · {record.sampleSkus.join("，")}</span>
                  <small>{formatDate(record.createdAt)} 生成</small>
                </div>
              ))
            ) : (
              <div>
                <strong>暂无 PPT 记录</strong>
                <span>多选样衣后点击右上角生成推款 PPT</span>
              </div>
            )}
          </div>
        </section>

        <section className="profile-section">
          <h3>
            <ReceiptText size={16} />
            费用账单
          </h3>
          <div className="profile-list">
            {props.bills.length ? (
              props.bills.slice(0, 8).map((bill) => (
                <div key={bill.id}>
                  <strong>{bill.title}</strong>
                  <span>{bill.status} · AI 积分 {bill.points}</span>
                  <small>
                    {formatMoney(bill.amount)} · {formatDate(bill.createdAt)}
                  </small>
                </div>
              ))
            ) : (
              <div>
                <strong>暂无费用账单</strong>
                <span>后续接充值和扣费后会显示真实费用流水</span>
              </div>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}

function YunzhiAssistantDrawer(props: {
  billingRule: BillingRule;
  frontUser: FrontUser | null;
  onClose: () => void;
  samples: Sample[];
  selected?: Sample;
}) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<YunzhiMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "你好，我是云知。可以问我在库样衣、库位架杆、相似款、报价规则、流行趋势、汇率换算和款式设计建议。"
    }
  ]);
  const quickQuestions = ["查在库风衣", "当前款报价", "今年流行趋势", "美元汇率换算", "按库位找样衣"];

  const ask = (text: string) => {
    const value = text.trim();
    if (!value) {
      return;
    }
    const userMessage: YunzhiMessage = { id: uid(), role: "user", content: value };
    const assistantMessage: YunzhiMessage = {
      id: uid(),
      role: "assistant",
      content: buildYunzhiAnswer(value, props.samples, props.selected, props.billingRule)
    };
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setQuery("");
  };

  return (
    <div className="profile-backdrop" role="presentation">
      <aside className="panel profile-drawer yunzhi-drawer" role="dialog" aria-label="问问云知">
        <div className="profile-head yunzhi-head">
          <img alt="问问云知" src="./yunzhi-avatar.png" />
          <div>
            <p className="eyebrow">AI 小助手</p>
            <h2>问问云知</h2>
            <span>{props.frontUser ? `${props.frontUser.team} · ${props.frontUser.name}` : "样衣、趋势、汇率、报价一站查询"}</span>
          </div>
          <button className="icon-button" onClick={props.onClose} type="button">
            <X size={17} />
          </button>
        </div>

        <div className="yunzhi-quick">
          {quickQuestions.map((question) => (
            <button key={question} onClick={() => ask(question)} type="button">
              {question}
            </button>
          ))}
        </div>

        <div className="yunzhi-chat">
          {messages.map((message) => (
            <div className={`yunzhi-message ${message.role}`} key={message.id}>
              <span>{message.role === "assistant" ? "云知" : "我"}</span>
              <p>{message.content}</p>
            </div>
          ))}
        </div>

        <form
          className="yunzhi-input"
          onSubmit={(event) => {
            event.preventDefault();
            ask(query);
          }}
        >
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="例如：找几件在库风衣，或者帮我看当前款怎么报价"
            value={query}
          />
          <button type="submit">
            <Send size={16} />
          </button>
        </form>
      </aside>
    </div>
  );
}

function Metric(props: { icon: LucideIcon; label: string; value: number }) {
  const Icon = props.icon;
  return (
    <div className="metric">
      <Icon size={18} />
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}

function RankedPanel(props: { title: string; rows: RankedMetric[] }) {
  const maxFee = Math.max(...props.rows.map((row) => row.fee), 1);
  return (
    <div className="panel ranked-panel">
      <h2>{props.title}</h2>
      <div className="ranked-list">
        {props.rows.length ? (
          props.rows.map((row) => (
            <div key={row.label}>
              <div>
                <strong>{row.label}</strong>
                <span>{row.count} 次 · {formatMoney(row.fee)}</span>
              </div>
              <i style={{ width: `${Math.max(8, (row.fee / maxFee) * 100)}%` }} />
            </div>
          ))
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function Info(props: { label: string; value: string }) {
  return (
    <div className="info">
      <span>{props.label}</span>
      <strong>{props.value || "待维护"}</strong>
    </div>
  );
}

function Field(props: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      {props.label}
      <input onChange={(event) => props.onChange(event.target.value)} value={props.value || ""} />
    </label>
  );
}

function StorageSelector(props: {
  location: string;
  rack: string;
  source: Sample["source"];
  ownerTeam?: string;
  onLocationChange: (value: string) => void;
  onRackChange: (value: string) => void;
}) {
  const zones = getStorageZones(props.source, props.ownerTeam);
  const zoneOptions = includeCurrentOption(zones.map((zone) => zone.location), props.location);
  const rackOptions = includeCurrentOption(getRackOptions(props.location, props.source, props.ownerTeam), props.rack);

  return (
    <>
      <label>
        库位
        <select onChange={(event) => props.onLocationChange(event.target.value)} value={props.location}>
          {zoneOptions.map((location) => (
            <option key={location} value={location}>
              {location}
            </option>
          ))}
        </select>
      </label>
      <label>
        架杆
        <select onChange={(event) => props.onRackChange(event.target.value)} value={props.rack}>
          {rackOptions.map((rack) => (
            <option key={rack} value={rack}>
              {rack}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

function PillGroup(props: { label: string; values: string[] }) {
  return (
    <div className="pill-group">
      <span>{props.label}</span>
      <div>
        {props.values.map((value) => (
          <b key={value}>{value}</b>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <Database size={28} />
      <span>暂无样衣</span>
    </div>
  );
}

function titleFor(tab: TabId) {
  return {
    library: "在线样衣资料库",
    entry: "样衣录入与维护",
    bulk: "业务组大货录入",
    borrow: "样衣借还",
    billing: "账单拉取",
    analytics: "数据分析",
    ai: "识别检索与自动报价"
  }[tab];
}

function readError(error: unknown) {
  return error instanceof Error ? error.message : "操作失败";
}

function parseList(value: string) {
  return value
    .split(/[,，、\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }
  return parseList(String(value || ""));
}

function formatBom(items: BomItem[]) {
  return items.map((item) => [item.materialName, item.usage, item.color, item.supplier].join(" | ")).join("\n");
}

function parseBom(value: string): BomItem[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [materialName = "", usage = "", color = "", supplier = ""] = line.split("|").map((item) => item.trim());
      return { id: uid(), materialName, usage, color, supplier };
    });
}

function formatFiles(items: DesignFile[]) {
  return items.map((item) => [item.name, item.type, item.url].join(" | ")).join("\n");
}

function parseFiles(value: string): DesignFile[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", type = "", url = ""] = line.split("|").map((item) => item.trim());
      return { id: uid(), name, type, url };
    });
}

function getSampleViewImages(sample: Sample): SampleViewImage[] {
  const images: SampleViewImage[] = [];
  const seen = new Set<string>();
  const addImage = (image: SampleViewImage) => {
    if (!image.url || seen.has(image.url)) {
      return;
    }
    seen.add(image.url);
    images.push(image);
  };

  addImage({
    id: "front",
    label: "正面",
    url: sample.enhancedImageUrl || sample.imageUrl
  });

  sample.designFiles
    .filter(isSampleImageFile)
    .forEach((file, index) => {
      addImage({
        id: file.id || `file-${index}`,
        label: labelForSampleImage(file.name, file.url, index),
        url: file.url
      });
    });

  return images;
}

function isSampleImageFile(file: DesignFile) {
  return /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i.test(file.url) || /jpe?g|png|webp|gif|image/i.test(file.type);
}

function labelForSampleImage(name: string, url: string, index: number) {
  const text = `${name} ${url}`.toLowerCase();
  if (text.includes("背") || text.includes("back")) {
    return "背面";
  }
  if (text.includes("正") || text.includes("front")) {
    return "正面";
  }
  return `图片 ${index + 1}`;
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function formatDate(value: string) {
  if (!value) {
    return "";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY"
  }).format(value);
}

function billingSourceText(source: BorrowBillingRow["source"]) {
  return source === "request" ? "前台申请" : "后台借出";
}

function downloadBillingCsv(rows: BorrowBillingRow[]) {
  const headers = ["日期", "来源", "业务员", "业务组", "款号", "名称", "品类", "风格", "库位", "架杆", "费用", "用途"];
  const lines = [
    headers,
    ...rows.map((row) => [
      row.date,
      billingSourceText(row.source),
      row.borrower,
      row.team,
      row.sampleSku,
      row.sampleName,
      row.category,
      row.styleTags.join("/"),
      row.location,
      row.rack,
      String(row.fee),
      row.purpose
    ])
  ].map((line) => line.map(escapeCsvCell).join(","));
  const blob = new Blob([`\ufeff${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `样衣借用账单-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string) {
  const text = String(value || "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseMoneyValue(value: string | number | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const normalized = String(value || "").replace(/,/g, "");
  const match = normalized.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function formatRetailPrice(sample: Sample) {
  const price = parseMoneyValue(sample.retailPrice);
  return price ? formatMoney(price) : "未标价";
}

function calculateBorrowFee(sample: Sample, rule: BillingRule) {
  const price = parseMoneyValue(sample.retailPrice);
  const fee = rule.baseBorrowFee + price * rule.borrowRate;
  return Math.round(Math.max(rule.minBorrowFee, fee));
}

function calculateDamageFee(sample: Sample, reason: DamageReason, rule: BillingRule) {
  const price = parseMoneyValue(sample.retailPrice);
  const rate = reason === "lost" ? rule.lostRate : reason === "damaged" ? rule.damageRate : rule.retiredRate;
  return Math.round(price * rate);
}

function createBorrowFeeBills(samples: Sample[], user: FrontUser, rule: BillingRule): FeeBill[] {
  return samples.map((sample) => ({
    id: uid(),
    title: `借样费用 · ${sample.sku} · ${user.team}`,
    amount: calculateBorrowFee(sample, rule),
    points: 0,
    createdAt: new Date().toISOString(),
    status: "待结算"
  }));
}

function getDamageCandidates(samples: Sample[], query: string) {
  const term = query.trim().toLowerCase();
  const candidates = samples.filter((sample) => sample.status !== "damaged");
  if (term) {
    return candidates
      .filter((sample) =>
        [
          sample.sku,
          sample.styleNo,
          sample.name,
          sample.englishName,
          sample.category,
          sample.season,
          sample.ownerTeam,
          sample.location,
          sample.rack
        ]
          .join(" ")
          .toLowerCase()
          .includes(term)
      )
      .slice(0, 12);
  }

  return [...candidates]
    .sort((a, b) => damageCandidateScore(b) - damageCandidateScore(a))
    .slice(0, 12);
}

function damageCandidateScore(sample: Sample) {
  const year = Number(String(sample.season).match(/20\d{2}/)?.[0] || 0);
  const ageScore = year ? Math.max(0, new Date().getFullYear() - year) * 12 : 18;
  const statusScore = sample.status === "maintenance" ? 36 : sample.status === "borrowed" ? 18 : 0;
  const historyScore = sample.borrowHistory.length * 3;
  return ageScore + statusScore + historyScore;
}

function getStorageZones(source: Sample["source"], ownerTeam?: string) {
  if (source === "bulk") {
    const preferredTeams = ownerTeam ? [ownerTeam, ...businessTeams.filter((team) => team !== ownerTeam)] : businessTeams;
    return preferredTeams.map((team) => ({
      location: `${team}大货样衣区`,
      racks: bulkRackOptions
    }));
  }
  return designStorageZones;
}

function getDefaultStorageLocation(source: Sample["source"], ownerTeam?: string) {
  return getStorageZones(source, ownerTeam)[0]?.location || "";
}

function getRackOptions(location: string, source: Sample["source"], ownerTeam?: string) {
  const zones = getStorageZones(source, ownerTeam);
  return zones.find((zone) => zone.location === location)?.racks || zones[0]?.racks || [];
}

function includeCurrentOption(options: string[], current: string) {
  return current && !options.includes(current) ? [current, ...options] : options;
}

function sampleLikeCount(sample: Sample, favoriteIds: string[]) {
  const seed = Array.from(sample.sku || sample.id).reduce((total, char) => total + char.charCodeAt(0), 0);
  return 18 + (seed % 42) + (favoriteIds.includes(sample.id) ? 1 : 0);
}

async function createRecommendationPpt(samples: Sample[], user: FrontUser, fileName: string) {
  const { default: pptxgen } = await import("pptxgenjs");
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = appName;
  pptx.company = "舜天信兴";
  pptx.subject = "业务前台推款方案";
  pptx.title = fileName.replace(/\.pptx$/i, "");

  const cover = pptx.addSlide();
  cover.background = { color: "EEF6FF" };
  cover.addText("舜天信兴推款方案", {
    x: 0.7,
    y: 1.0,
    w: 8.8,
    h: 0.7,
    fontFace: "Microsoft YaHei",
    fontSize: 34,
    bold: true,
    color: "123047"
  });
  cover.addText(`${user.team} · ${user.name}\n${samples.length} 件样衣 · ${new Date().toLocaleDateString("zh-CN")}`, {
    x: 0.75,
    y: 2.0,
    w: 6.4,
    h: 1.1,
    fontFace: "Microsoft YaHei",
    fontSize: 16,
    color: "51616F",
    breakLine: false
  });
  cover.addText(samples.map((sample, index) => `${index + 1}. ${sample.sku} ${sample.name}`).join("\n"), {
    x: 0.8,
    y: 3.25,
    w: 11.2,
    h: 2.7,
    fontFace: "Microsoft YaHei",
    fontSize: 13,
    color: "243747",
    breakLine: false,
    fit: "shrink"
  });

  for (const [index, sample] of samples.entries()) {
    const slide = pptx.addSlide();
    slide.background = { color: "F7FBFF" };
    slide.addText(`${String(index + 1).padStart(2, "0")} / ${samples.length}`, {
      x: 0.65,
      y: 0.38,
      w: 1.4,
      h: 0.25,
      fontFace: "Microsoft YaHei",
      fontSize: 10,
      bold: true,
      color: "1F74C9"
    });
    const imageData = await imageToDataUrl(sample.enhancedImageUrl || sample.imageUrl);
    if (imageData) {
      slide.addImage({ data: imageData, x: 0.7, y: 0.85, w: 4.4, h: 5.7, sizing: { type: "cover", x: 0.7, y: 0.85, w: 4.4, h: 5.7 } });
    }
    slide.addText(sample.name, {
      x: 5.55,
      y: 0.85,
      w: 6.4,
      h: 0.52,
      fontFace: "Microsoft YaHei",
      fontSize: 23,
      bold: true,
      color: "13222C",
      fit: "shrink"
    });
    slide.addText(`${sample.sku} · ${sample.styleNo || "未维护款式编号"}`, {
      x: 5.58,
      y: 1.48,
      w: 5.8,
      h: 0.34,
      fontFace: "Microsoft YaHei",
      fontSize: 12,
      bold: true,
      color: "1F74C9"
    });
    const details = [
      ["品类", sample.category],
      ["季节", sample.season],
      ["颜色", sample.color],
      ["尺码", sample.size],
      ["面料", sample.fabric],
      ["工艺", sample.craft]
    ]
      .map(([label, value]) => `${label}：${value || "待维护"}`)
      .join("\n");
    slide.addText(details, {
      x: 5.58,
      y: 2.0,
      w: 6.5,
      h: 2.2,
      fontFace: "Microsoft YaHei",
      fontSize: 13,
      color: "243747",
      breakLine: false,
      fit: "shrink"
    });
    slide.addText(`标签：${sample.styleTags.join(" / ") || "待维护"}\n建议：用于客户看样、同款拓展、面辅料替换报价。`, {
      x: 5.58,
      y: 4.55,
      w: 6.4,
      h: 1.15,
      fontFace: "Microsoft YaHei",
      fontSize: 12,
      color: "51616F",
      breakLine: false,
      fit: "shrink"
    });
    slide.addText(appName, {
      x: 5.58,
      y: 6.42,
      w: 3.8,
      h: 0.25,
      fontFace: "Microsoft YaHei",
      fontSize: 9,
      color: "7A8794"
    });
  }

  await pptx.writeFile({ fileName });
}

function buildYunzhiAnswer(query: string, samples: Sample[], selected: Sample | undefined, billingRule: BillingRule) {
  const text = query.toLowerCase();
  const inStockSamples = samples.filter((sample) => sample.status === "in_stock");
  const keywordMatches = findSampleMatches(query, samples);

  if (text.includes("汇率") || text.includes("美元") || text.includes("usd") || text.includes("eur")) {
    return [
      "当前演示版提供报价口径参考，不直接作为财务结算汇率。",
      "可先按 USD/CNY 7.20、EUR/CNY 7.78 做内部测算；正式给客户前建议接入实时汇率接口。",
      selected ? `当前款 ${selected.sku} 吊牌价 ${formatRetailPrice(selected)}，借样费 ${formatMoney(calculateBorrowFee(selected, billingRule))}/次。` : ""
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (text.includes("报价") || text.includes("价格") || text.includes("费用")) {
    const sample = keywordMatches[0] || selected;
    if (!sample) {
      return `当前收费规则：基础借样费 ${formatMoney(billingRule.baseBorrowFee)}，按吊牌价 ${Math.round(
        billingRule.borrowRate * 100
      )}% 计费，最低 ${formatMoney(billingRule.minBorrowFee)}/次。`;
    }
    return `${sample.sku} ${sample.name}\n吊牌价：${formatRetailPrice(sample)}\n借样费：${formatMoney(
      calculateBorrowFee(sample, billingRule)
    )}/次\n库位：${sample.location} · ${sample.rack}`;
  }

  if (text.includes("库位") || text.includes("架杆") || text.includes("归还") || text.includes("在库")) {
    const matches = (keywordMatches.length ? keywordMatches : inStockSamples).filter((sample) => sample.status === "in_stock");
    return matches.length
      ? `找到 ${matches.length} 件在库样衣：\n${matches
          .slice(0, 6)
          .map((sample) => `${sample.sku} ${sample.name}｜${sample.location} · ${sample.rack}`)
          .join("\n")}`
      : "没有找到符合条件的在库样衣，可以换一个款号、品类或库位再问。";
  }

  if (text.includes("趋势") || text.includes("流行")) {
    return [
      "近期可重点关注：轻户外防晒、通勤轻西装、低饱和绿色/灰蓝、肌理针织、套装化搭配。",
      "给客户推款时建议按“外套主推 + 衬衫/针织内搭 + 下装补充”组合，减少单品跳跃。",
      `当前库里在库样衣 ${inStockSamples.length} 件，可优先从同品类和同色系中挑。`
    ].join("\n");
  }

  if (text.includes("设计") || text.includes("款式") || text.includes("开发")) {
    const sample = keywordMatches[0] || selected;
    if (!sample) {
      return "可以给我一个品类或款号，我会结合现有样衣给出廓形、面料、颜色和工艺方向。";
    }
    return `基于 ${sample.sku} ${sample.name}：\n1. 保留 ${sample.category} 的核心廓形，做一版更轻量的${sample.fabric || "面料"}。\n2. 颜色可扩展到雾蓝、灰绿、米白，便于成组推款。\n3. 工艺上建议强化口袋、门襟或领型差异，形成同系列不同价位。`;
  }

  if (keywordMatches.length) {
    return `我找到了这些相关样衣：\n${keywordMatches
      .slice(0, 6)
      .map(
        (sample) =>
          `${sample.sku} ${sample.name}｜${sample.category}｜${sampleStatusText[sample.status]}｜${sample.location} · ${sample.rack}`
      )
      .join("\n")}`;
  }

  return "可以问我：在库样衣、某个款号的库位、当前款报价、趋势方向、汇率测算，或者让云知根据某个款式给开发建议。";
}

function findSampleMatches(query: string, samples: Sample[]) {
  const terms = query
    .toLowerCase()
    .split(/[\s,，。/]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 1 && !["查询", "看看", "帮我", "样衣", "在库"].includes(term));

  if (!terms.length) {
    return [];
  }

  return samples
    .map((sample) => {
      const haystack = [
        sample.sku,
        sample.styleNo,
        sample.name,
        sample.englishName,
        sample.category,
        sample.color,
        sample.fabric,
        sample.location,
        sample.rack,
        sample.ownerTeam,
        sample.styleTags.join(" ")
      ]
        .join(" ")
        .toLowerCase();
      return { sample, score: terms.filter((term) => haystack.includes(term)).length };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.sample);
}

async function imageToDataUrl(url: string) {
  if (!url) {
    return "";
  }
  if (url.startsWith("data:")) {
    return url;
  }
  try {
    const absoluteUrl = new URL(url, window.location.href).toString();
    const response = await fetch(absoluteUrl);
    const blob = await response.blob();
    return await blobToDataUrl(blob);
  } catch {
    return "";
  }
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("图片读取失败"));
    reader.readAsDataURL(blob);
  });
}

function readStoredArray(key: string) {
  return readStoredObject<string[]>(key) || [];
}

function readStoredObject<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeStoredObject(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }
  if (value === null || value === undefined) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(value));
}

export default App;
