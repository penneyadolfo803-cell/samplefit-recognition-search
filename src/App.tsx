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
  BadgeCheck,
  Boxes,
  Camera,
  Check,
  ClipboardList,
  Database,
  FileText,
  Heart,
  ImageUp,
  Loader2,
  PackagePlus,
  RotateCcw,
  Search,
  Shirt,
  Sparkles,
  Upload,
  Wand2,
  type LucideIcon
} from "lucide-react";
import {
  borrowSample,
  completeFields,
  createSample,
  enhanceImage,
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
import { fileToOptimizedDataUrl, formatTags } from "./lib/image";
import type {
  BomItem,
  DesignFile,
  HealthPayload,
  Sample,
  SampleDraft,
  SimilarResult
} from "./lib/types";

type TabId = "library" | "entry" | "borrow" | "ai";

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
  location: "",
  rack: "",
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
  { id: "borrow" as const, label: "借还", icon: ClipboardList },
  { id: "ai" as const, label: "识别检索", icon: Camera }
];

const statusText = {
  in_stock: "在库",
  borrowed: "借出",
  maintenance: "维护"
};

const kindText = {
  physical: "实物样衣",
  digital3d: "3D 样衣"
};

function App() {
  const [samples, setSamples] = useState<Sample[]>([]);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [tab, setTab] = useState<TabId>("library");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<SampleDraft>(emptyDraft);
  const [query, setQuery] = useState("");
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
  const [searchImage, setSearchImage] = useState("");
  const [searchText, setSearchText] = useState("");
  const [similarityThreshold, setSimilarityThreshold] = useState(0.12);
  const [quoteQuantity, setQuoteQuantity] = useState(300);
  const [materialName, setMaterialName] = useState("");
  const [materialUnitCost, setMaterialUnitCost] = useState("");
  const [similarResults, setSimilarResults] = useState<SimilarResult[]>([]);

  const selected = samples.find((sample) => sample.id === selectedId) || samples[0];

  const filteredSamples = useMemo(() => {
    const term = query.trim().toLowerCase();
    return samples.filter((sample) => {
      const matchesStatus = statusFilter === "all" || sample.status === statusFilter;
      const matchesKind = kindFilter === "all" || sample.sampleKind === kindFilter;
      const haystack = [
        sample.sku,
        sample.styleNo,
        sample.name,
        sample.englishName,
        sample.category,
        sample.color,
        sample.fabric,
        sample.location,
        sample.visibilityScope,
        sample.styleTags.join(" ")
      ]
        .join(" ")
        .toLowerCase();
      return matchesStatus && matchesKind && (!term || haystack.includes(term));
    });
  }, [samples, query, statusFilter, kindFilter]);

  const metrics = useMemo(() => {
    return {
      total: samples.length,
      inStock: samples.filter((sample) => sample.status === "in_stock").length,
      borrowed: samples.filter((sample) => sample.status === "borrowed").length,
      selected: samples.filter((sample) => sample.selected).length
    };
  }, [samples]);

  useEffect(() => {
    void reload();
  }, []);

  async function reload() {
    setBusy("load");
    try {
      const [healthPayload, samplePayload] = await Promise.all([getHealth(), getSamples()]);
      setHealth(healthPayload);
      setSamples(samplePayload);
      setSelectedId((current) => current || samplePayload[0]?.id || "");
      setDemoMode(false);
    } catch (error) {
      void error;
      setDemoMode(true);
      setHealth({
        ok: true,
        aiConfigured: false,
        models: {
          text: "static-demo",
          vision: "static-demo",
          embedding: "static-demo",
          image: "static-demo"
        }
      });
      setSamples(demoSamples);
      setSelectedId((current) => current || demoSamples[0]?.id || "");
      setNotice("当前为网页演示模式，真实 AI 能力需部署后端服务");
    } finally {
      setBusy("");
    }
  }

  function startCreate() {
    setDraft({ ...emptyDraft });
    setTab("entry");
  }

  function editSample(sample: Sample) {
    const { embedding, borrowHistory, createdAt, updatedAt, ...editable } = sample;
    void embedding;
    void borrowHistory;
    void createdAt;
    void updatedAt;
    setDraft({ ...editable, id: sample.id });
    setTab("entry");
  }

  async function saveDraft() {
    setBusy("save");
    setNotice("");
    try {
      if (demoMode) {
        const saved = draftToDemoSample(draft);
        setSamples((current) =>
          draft.id ? current.map((sample) => (sample.id === draft.id ? saved : sample)) : [saved, ...current]
        );
        setSelectedId(saved.id);
        setDraft({ ...emptyDraft });
        setTab("library");
        setNotice("演示模式已保存到当前浏览器会话");
        return;
      }
      const saved = draft.id ? await updateSample(draft.id, draft) : await createSample(draft);
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

  async function runFieldCompletion() {
    setBusy("complete");
    setNotice("");
    try {
      if (demoMode) {
        const result = inferDemoFields(draft);
        setDraft((current) => ({
          ...current,
          ...result.fields,
          styleTags: normalizeArray(result.fields.styleTags ?? current.styleTags)
        }));
        setNotice("演示模式已按本地规则补全字段");
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
      if (demoMode) {
        setDraft((current) => ({ ...current, enhancedImageUrl: current.imageUrl }));
        setNotice("演示模式保留原图，真实美化需后端 AI 服务");
        return;
      }
      const result = await enhanceImage(draft.imageUrl);
      setDraft((current) => ({ ...current, enhancedImageUrl: result.imageUrl }));
      setNotice("AI 美化图片已生成");
    } catch (error) {
      setNotice(readError(error));
    } finally {
      setBusy("");
    }
  }

  async function runSimilarSearch() {
    if (!searchImage && !searchText.trim()) {
      setNotice("请上传拍摄图或输入检索词");
      return;
    }
    setBusy("search");
    setNotice("");
    try {
      if (demoMode) {
        const results = searchDemoSamples(samples, {
          imageDataUrl: searchImage,
          text: searchText,
          threshold: similarityThreshold,
          quantity: quoteQuantity,
          materialName,
          materialUnitCost: materialUnitCost ? Number(materialUnitCost) : undefined
        });
        setSimilarResults(results);
        setNotice(`演示模式找到 ${results.length} 个候选样衣并生成报价`);
        return;
      }
      const results = await searchSimilar({
        imageDataUrl: searchImage,
        text: searchText,
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
        setNotice("演示模式已登记借出");
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
        setNotice("演示模式已归还入库");
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

  async function uploadSearchImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setSearchImage(await fileToOptimizedDataUrl(file, 960));
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Shirt size={22} />
          </div>
          <div>
            <strong>SampleFit</strong>
            <span>样衣识别检索系统</span>
          </div>
        </div>

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

        <div className="model-card">
          <span className={health?.aiConfigured ? "dot ok" : "dot"} />
          <div>
          <strong>{demoMode ? "网页演示" : health?.aiConfigured ? "AI 已接入" : "AI 未配置"}</strong>
            <small>{health?.models.embedding || "等待服务启动"}</small>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">样衣识别检索与自动报价</p>
            <h1>{titleFor(tab)}</h1>
          </div>
          <div className="top-actions">
            <button className="ghost" onClick={() => void reload()} type="button">
              <RotateCcw size={16} />
              刷新
            </button>
            <button onClick={startCreate} type="button">
              <PackagePlus size={16} />
              新增样衣
            </button>
          </div>
        </header>

        {notice && <div className="notice">{notice}</div>}

        <section className="metrics">
          <Metric icon={Boxes} label="在线样衣" value={metrics.total} />
          <Metric icon={BadgeCheck} label="可借在库" value={metrics.inStock} />
          <Metric icon={Archive} label="当前借出" value={metrics.borrowed} />
          <Metric icon={Check} label="已选样" value={metrics.selected} />
        </section>

        {busy === "load" ? (
          <div className="loading">
            <Loader2 className="spin" size={22} />
            加载中
          </div>
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
                setStatusFilter={setStatusFilter}
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

            {tab === "borrow" && selected && (
              <BorrowView
                borrowForm={borrowForm}
                busy={busy}
                selected={selected}
                setBorrowForm={setBorrowForm}
                borrowSelected={borrowSelected}
                returnSelected={returnSelected}
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
        {tabs.map((item) => (
          <button
            className={tab === item.id ? "active" : ""}
            key={item.id}
            onClick={() => setTab(item.id)}
            type="button"
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
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
  setStatusFilter: (value: string) => void;
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
          </select>
          <select onChange={(event) => props.setKindFilter(event.target.value)} value={props.kindFilter}>
            <option value="all">全部类型</option>
            <option value="physical">实物样衣</option>
            <option value="digital3d">3D 样衣</option>
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
                  <span className={`status ${sample.status}`}>{statusText[sample.status]}</span>
                </div>
                <small>
                  {sample.sku} · {sample.styleNo}
                </small>
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
            AI 美化
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
          <Field label="位置" value={props.draft.location} onChange={(value) => setField("location", value)} />
          <Field label="货架" value={props.draft.rack} onChange={(value) => setField("rack", value)} />
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

function BorrowView(props: {
  borrowForm: { borrower: string; team: string; purpose: string; dueAt: string };
  busy: string;
  selected: Sample;
  setBorrowForm: Dispatch<SetStateAction<{ borrower: string; team: string; purpose: string; dueAt: string }>>;
  borrowSelected: () => Promise<void>;
  returnSelected: () => Promise<void>;
}) {
  return (
    <section className="borrow-layout">
      <div className="panel selected-panel">
        <img alt={props.selected.name} src={props.selected.enhancedImageUrl || props.selected.imageUrl} />
        <div>
          <p className="eyebrow">{props.selected.sku}</p>
          <h2>{props.selected.name}</h2>
          <p>{props.selected.location} · {props.selected.rack}</p>
          <span className={`status ${props.selected.status}`}>{statusText[props.selected.status]}</span>
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
        <button disabled={props.busy === "search"} onClick={props.runSimilarSearch} type="button">
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
    borrow: "样衣借还",
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

export default App;
