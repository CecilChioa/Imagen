import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import qqGroupIcon from "./assets/quniconhigh.png";
import { SingleGeneratePage } from "./pages/SingleGeneratePage";
import { BatchGeneratePage } from "./pages/BatchGeneratePage";
import { BatchConvertPage } from "./pages/BatchConvertPage";
import { SettingsModal } from "./pages/SettingsModal";
import "./styles.css";

type ApiProfile = { id: string; name: string; apiKey: string; apiBaseUrl: string; model: string };
type GeneratedImage = { path: string | null; format: string; dataUrl: string };
type GenerationResult = {
  id: string; createdAt: string; prompt: string; status: string;
  outputs: GeneratedImage[]; error: string | null; request: unknown; response: unknown;
};
type Settings = {
  apiProfiles: ApiProfile[]; activeApiProfileId: string; outputDir: string; size: string; quality: string;
  outputFormat: string; removeBackground: boolean; n: number; positivePrompt: string; negativePrompt: string;
  positivePromptLibrary: string[]; negativePromptLibrary: string[]; stylePreset: string; contentType: string;
  referenceLibraryDir: string; referenceImagePath: string; maskImagePath: string; history: GenerationResult[];
};
type BatchItem = { id: string; prompt: string; fullPrompt: string; negativePrompt: string; status: string; path?: string; error?: string; previewDataUrl?: string };
type BatchConvertResult = { total: number; converted: number; failed: number; errors: string[] };
type SaveButtonState = "idle" | "saving" | "saved" | "resave";
type ViewMode = "single" | "batch" | "convert";
type BatchMode = "queue" | "concurrent";
type ConvertTarget = "png" | "tga" | "blp";

const defaultApiProfile: ApiProfile = { id: "default", name: "PPtokens", apiKey: "", apiBaseUrl: "https://api.openai.com/v1", model: "gpt-image-2" };
const defaultSettings: Settings = {
  apiProfiles: [defaultApiProfile], activeApiProfileId: defaultApiProfile.id, outputDir: "outputs",
  size: "1024x1024", quality: "medium", outputFormat: "png", removeBackground: false, n: 1,
  positivePrompt: "", negativePrompt: "", positivePromptLibrary: [], negativePromptLibrary: [],
  stylePreset: "none", contentType: "icon", referenceLibraryDir: "", referenceImagePath: "", maskImagePath: "", history: [],
};
const stylePresets = [
  { id: "none", name: "默认风格", prompt: "" },
  { id: "dark", name: "暗黑奇幻", prompt: "dark fantasy, high contrast, dramatic lighting, arcane atmosphere" },
  { id: "pixel", name: "像素艺术", prompt: "pixel art style, retro game texture, crisp edges" },
  { id: "xianxia", name: "国风仙侠", prompt: "Chinese xianxia fantasy, elegant oriental style, mystical aura" },
  { id: "ink", name: "中式水墨", prompt: "Chinese ink wash, restrained colors, brush texture" },
  { id: "anime", name: "次元幻想", prompt: "anime fantasy style, cel shading, vivid magical effects" },
  { id: "scifi", name: "科幻未来", prompt: "futuristic sci-fi style, neon accents, advanced technology details, cinematic lighting" },
  { id: "mecha", name: "机甲工业", prompt: "mechanical industrial style, hard-surface design, metal texture, engineered structure" },
  { id: "magic", name: "魔法史诗", prompt: "epic magic fantasy style, spell effects, mystical runes, dramatic composition" },
  { id: "national", name: "国潮插画", prompt: "guochao illustration style, trendy Chinese aesthetics, bold colors, decorative pattern" },
  { id: "watercolor", name: "清新水彩", prompt: "fresh watercolor style, soft pigment bleeding, paper texture, airy atmosphere" },
  { id: "oilpaint", name: "厚涂手绘", prompt: "painterly hand-painted style, rich brushstrokes, layered color blocks, artistic texture" },
  { id: "minimal", name: "极简扁平", prompt: "minimal flat design style, simplified geometry, clean silhouette, clear visual hierarchy" },
  { id: "realism", name: "写实电影", prompt: "cinematic realism style, physically plausible lighting, filmic contrast, detailed textures" },
];
const contentTypes = [
  { id: "icon", name: "图标", prompt: "icon-oriented composition, centered subject, clean silhouette, readable at small size" },
  { id: "poster", name: "宣传图", prompt: "promotional key visual, cinematic composition, strong atmosphere" },
  { id: "ui", name: "UI", prompt: "UI asset direction, clean hierarchy, production-ready interface component" },
  { id: "character", name: "角色立绘", prompt: "character illustration direction, clear silhouette, expressive pose, clean focal hierarchy" },
  { id: "scene", name: "场景概念", prompt: "environment concept art direction, depth layering, strong lighting mood, cinematic framing" },
  { id: "product", name: "产品渲染", prompt: "product rendering direction, material accuracy, controlled reflections, studio lighting setup" },
  { id: "cover", name: "封面主视觉", prompt: "cover key visual direction, strong center of interest, readable composition, brand-friendly style" },
  { id: "banner", name: "横幅海报", prompt: "banner poster direction, horizontal composition, headline-safe negative space, high visual impact" },
  { id: "social", name: "社媒配图", prompt: "social media artwork direction, eye-catching focal point, platform-friendly composition, clear contrast" },
  { id: "texture", name: "材质贴图", prompt: "texture map direction, tiling-friendly detail, controlled noise, consistent material pattern" },
  { id: "background", name: "背景壁纸", prompt: "wallpaper background direction, balanced composition, clean gradients or details, low visual clutter" },
];

const normalizeSettings = (raw: Partial<Settings>): Settings => {
  const profiles = raw.apiProfiles && raw.apiProfiles.length > 0 ? raw.apiProfiles : [defaultApiProfile];
  const active = profiles.find((p) => p.id === raw.activeApiProfileId)?.id ?? profiles[0].id;
  return { ...defaultSettings, ...raw, apiProfiles: profiles, activeApiProfileId: active, positivePromptLibrary: raw.positivePromptLibrary ?? [], negativePromptLibrary: raw.negativePromptLibrary ?? [], history: (raw.history ?? []).slice(0, 10) };
};
const createApiProfile = (): ApiProfile => ({ ...defaultApiProfile, id: crypto.randomUUID(), name: "新 API" });
const formatLog = (v: unknown) => JSON.stringify(v, null, 2);
const replaceFragment = (source: string, fragments: string[], next: string) => [source, ...fragments].reduce((acc, f) => f ? acc.split(f).join("") : acc).replace(/\s*,\s*,+/g, ", ").replace(/^\s*,\s*|\s*,\s*$/g, "").trim().concat(next ? `${source.trim() ? ", " : ""}${next}` : "");

export default function App() {
  const [view, setView] = useState<ViewMode>("single");
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [draftSettings, setDraftSettings] = useState<Settings>(defaultSettings);
  const [editingProfileId, setEditingProfileId] = useState(defaultApiProfile.id);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiSignupOpen, setApiSignupOpen] = useState(false);
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [localModelOpen, setLocalModelOpen] = useState(false);
  const [status, setStatus] = useState("就绪");
  const [generateLogs, setGenerateLogs] = useState<string[]>(["等待生成任务..."]);
  const [convertLogs, setConvertLogs] = useState<string[]>(["等待转换任务..."]);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [generationBusy, setGenerationBusy] = useState(false);
  const [convertBusy, setConvertBusy] = useState(false);
  const generationRunIdRef = useRef(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [generationStartedAt, setGenerationStartedAt] = useState<number | null>(null);
  const [saveNotice, setSaveNotice] = useState("");
  const [saveButtonState, setSaveButtonState] = useState<SaveButtonState>("idle");
  const [saveSize, setSaveSize] = useState("original");
  const [customWidth, setCustomWidth] = useState(64);
  const [customHeight, setCustomHeight] = useState(64);
  const [referencePreviewSrc, setReferencePreviewSrc] = useState("");
  const [maskPreviewSrc, setMaskPreviewSrc] = useState("");
  const [batchPromptText, setBatchPromptText] = useState("");
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [batchMode, setBatchMode] = useState<BatchMode>("queue");
  const [batchConcurrency, setBatchConcurrency] = useState(5);
  const [convertSourceDir, setConvertSourceDir] = useState("");
  const [convertTargetDir, setConvertTargetDir] = useState("");
  const [convertSourceFormats, setConvertSourceFormats] = useState<string[]>(["png"]);
  const [convertTargetFormat, setConvertTargetFormat] = useState<ConvertTarget>("blp");
  const [convertRecursive, setConvertRecursive] = useState(true);
  const [convertKeepStructure, setConvertKeepStructure] = useState(true);
  const [localModelName, setLocalModelName] = useState("本地模型 - Ollama");
  const [localModelBaseUrl, setLocalModelBaseUrl] = useState("http://127.0.0.1:11434/v1");
  const [localModelId, setLocalModelId] = useState("llava");

  const activeProfile = useMemo(() => settings.apiProfiles.find((p) => p.id === settings.activeApiProfileId) ?? settings.apiProfiles[0], [settings]);
  const editingProfile = useMemo(() => draftSettings.apiProfiles.find((p) => p.id === editingProfileId) ?? draftSettings.apiProfiles[0], [draftSettings, editingProfileId]);

  useEffect(() => { invoke<Settings>("load_settings").then((v) => { const next = normalizeSettings(v); setSettings(next); setDraftSettings(next); setEditingProfileId(next.activeApiProfileId); setHistory(next.history); }).catch(() => setSettingsOpen(true)); }, []);
  useEffect(() => { if (!generationBusy || generationStartedAt == null) return; const t = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - generationStartedAt) / 1000)), 250); return () => window.clearInterval(t); }, [generationBusy, generationStartedAt]);
  useEffect(() => { if (!saveNotice) return; const t = window.setTimeout(() => setSaveNotice(""), 2200); return () => window.clearTimeout(t); }, [saveNotice]);
  useEffect(() => { if (!status) return; const t = window.setTimeout(() => setStatus(""), 5000); return () => window.clearTimeout(t); }, [status]);
  useEffect(() => { if (!settings.referenceImagePath) return void setReferencePreviewSrc(""); invoke<string>("read_image_data_url", { path: settings.referenceImagePath }).then(setReferencePreviewSrc).catch(() => setReferencePreviewSrc("")); }, [settings.referenceImagePath]);
  useEffect(() => { if (!settings.maskImagePath) return void setMaskPreviewSrc(""); invoke<string>("read_image_data_url", { path: settings.maskImagePath }).then(setMaskPreviewSrc).catch(() => setMaskPreviewSrc("")); }, [settings.maskImagePath]);

  const persistSettings = async (next: Settings) => { setSettings(next); setDraftSettings(next); await invoke("save_settings", { settings: next }); };
  const getSaveDimensions = () => saveSize === "original" ? { width: 0, height: 0 } : (saveSize === "custom" ? { width: customWidth, height: customHeight } : (() => { const [w, h] = saveSize.split("x").map(Number); return { width: w, height: h }; })());
  const chooseDirectory = async (title: string) => { const s = await open({ directory: true, multiple: false, title }); return typeof s === "string" ? s : ""; };

  const onChooseReferenceImage = async () => { const s = await open({ multiple: false, filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "tga", "bmp"] }], title: "选择参考图" }); if (typeof s === "string") await persistSettings({ ...settings, referenceImagePath: s }); };
  const onChooseMaskImage = async () => { const s = await open({ multiple: false, filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "tga", "bmp"] }], title: "选择蒙版图" }); if (typeof s === "string") await persistSettings({ ...settings, maskImagePath: s }); };
  const onChooseReferenceLibraryDir = async () => { const dir = await chooseDirectory("选择参考图库文件夹"); if (!dir) return; await persistSettings({ ...settings, referenceLibraryDir: dir }); };
  const pickReferenceFromLibrary = async (base: Settings) => !base.referenceLibraryDir ? base : { ...base, referenceImagePath: await invoke<string>("pick_random_reference_image", { directory: base.referenceLibraryDir }) };
  const saveHistoryResult = async (result: GenerationResult, base: Settings = settings) => { const next = [result, ...base.history.filter((i) => i.id !== result.id)].slice(0, 10); setHistory(next); await persistSettings({ ...base, history: next }); };

  const savePromptToLibrary = async (kind: "positive" | "negative") => { const prompt = (kind === "positive" ? settings.positivePrompt : settings.negativePrompt).trim(); if (!prompt) return setStatus(`${kind === "positive" ? "正向" : "负向"}提示词为空`); const key = kind === "positive" ? "positivePromptLibrary" : "negativePromptLibrary"; if (settings[key].includes(prompt)) return setStatus("提示词已在库中"); await persistSettings({ ...settings, [key]: [prompt, ...settings[key]] }); };
  const choosePromptFromLibrary = async (kind: "positive" | "negative", prompt: string) => { if (!prompt) return; await persistSettings(kind === "positive" ? { ...settings, positivePrompt: prompt } : { ...settings, negativePrompt: prompt }); };
  const deletePromptFromLibrary = async (kind: "positive" | "negative", prompt: string) => { if (!prompt) return; const key = kind === "positive" ? "positivePromptLibrary" : "negativePromptLibrary"; await persistSettings({ ...settings, [key]: settings[key].filter((it) => it !== prompt) }); };

  const onGenerate = async () => {
    if (generationBusy) { generationRunIdRef.current += 1; setGenerationBusy(false); setStatus("已停止生成"); return; }
    if (!activeProfile?.apiKey.trim()) { setStatus("请先在设置中填写 API Key"); setSettingsOpen(true); return; }
    if (!settings.positivePrompt.trim()) { setStatus("请输入正向提示词"); return; }
    const startedAt = Date.now(); const runId = generationRunIdRef.current + 1; generationRunIdRef.current = runId;
    setGenerationStartedAt(startedAt); setElapsedSeconds(0); setGenerationBusy(true); setGenerateLogs([`[${new Date().toLocaleString()}] 开始单图生成`]);
    try {
      const g = await pickReferenceFromLibrary(settings); if (g.referenceImagePath !== settings.referenceImagePath) setSettings(g);
      const result = await invoke<GenerationResult>("generate_image", { settings: g }); if (generationRunIdRef.current !== runId) return;
      await saveHistoryResult(result, g); setPreviewSrc(result.outputs[0]?.dataUrl ?? null); setSaveButtonState("idle");
      setGenerateLogs((c) => [...c, formatLog(result.response)]); setStatus("生成完成");
    } catch (e) { if (generationRunIdRef.current !== runId) return; setStatus(String(e)); setGenerateLogs((c) => [...c, String(e)]); }
    finally { if (generationRunIdRef.current !== runId) return; setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)); setGenerationBusy(false); }
  };

  const onSavePreview = async () => {
    if (!previewSrc) return;
    const { width, height } = getSaveDimensions();
    setSaveButtonState("saving");
    try {
      const path = await invoke<string>("save_generated_image", { request: { settings, dataUrl: previewSrc, width, height } });
      setSaveButtonState("saved"); setSaveNotice(`保存成功：${path}`); setGenerateLogs((c) => [...c, path]); setStatus("保存完成");
      window.setTimeout(() => setSaveButtonState((s) => (s === "saved" ? "resave" : s)), 900);
    } catch (e) { setSaveButtonState("resave"); setStatus(String(e)); }
  };

  const applyStylePreset = (id: string) => { const preset = stylePresets.find((s) => s.id === id) ?? stylePresets[0]; setSettings({ ...settings, stylePreset: id, positivePrompt: replaceFragment(settings.positivePrompt, stylePresets.map((i) => i.prompt), preset.prompt) }); };
  const applyContentType = (id: string) => { const ct = contentTypes.find((s) => s.id === id) ?? contentTypes[0]; setSettings({ ...settings, contentType: id, positivePrompt: replaceFragment(settings.positivePrompt, contentTypes.map((i) => i.prompt), ct.prompt) }); };

  const onBatchGenerate = async () => { /* keep existing behavior */
    if (generationBusy) { generationRunIdRef.current += 1; setGenerationBusy(false); setStatus("已停止批量生成"); return; }
    const prompts = batchPromptText.split(/\r?\n/).map((x) => x.trim()).filter(Boolean); if (!prompts.length) return setStatus("请输入批量提示词");
    const items: BatchItem[] = prompts.map((p, idx) => ({ id: String(Date.now() + idx), prompt: p, fullPrompt: [settings.positivePrompt.trim(), p].filter(Boolean).join("\n"), negativePrompt: settings.negativePrompt.trim(), status: "等待" }));
    setBatchItems(items); setGenerationBusy(true); const startedAt = Date.now(); setGenerationStartedAt(startedAt); setElapsedSeconds(0); setGenerateLogs([`批量开始，共 ${items.length} 条`]);
    const runId = generationRunIdRef.current + 1; generationRunIdRef.current = runId; const concurrency = batchMode === "concurrent" ? Math.max(1, Math.min(20, batchConcurrency || 1)) : 1;
    const runOne = async (item: BatchItem) => { if (generationRunIdRef.current !== runId) return; setBatchItems((c) => c.map((i) => i.id === item.id ? { ...i, status: "生成中" } : i));
      try { const base = { ...settings, positivePrompt: item.fullPrompt, negativePrompt: item.negativePrompt, n: 1 }; const result = await invoke<GenerationResult>("generate_image", { settings: base }); const dataUrl = result.outputs[0]?.dataUrl ?? ""; let path = "";
        if (dataUrl) { const { width, height } = getSaveDimensions(); path = await invoke<string>("save_generated_image", { request: { settings: base, dataUrl, width, height } }); }
        setBatchItems((c) => c.map((i) => i.id === item.id ? { ...i, status: "完成", path, previewDataUrl: dataUrl || i.previewDataUrl } : i));
      } catch (e) { setBatchItems((c) => c.map((i) => i.id === item.id ? { ...i, status: "失败", error: String(e) } : i)); } };
    try {
      if (concurrency <= 1) { for (const item of items) { if (generationRunIdRef.current !== runId) break; /* eslint-disable-next-line no-await-in-loop */ await runOne(item); } }
      else { let next = 0; await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => { while (generationRunIdRef.current === runId) { const item = items[next++]; if (!item) break; /* eslint-disable-next-line no-await-in-loop */ await runOne(item); } })); }
    } finally { if (generationRunIdRef.current === runId) { setGenerationBusy(false); setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000)); setStatus("批量生成完成"); } }
  };

  const toggleConvertSourceFormat = (ext: string) => setConvertSourceFormats((c) => c.includes(ext) ? (c.length === 1 ? c : c.filter((i) => i !== ext)) : [...c, ext]);
  const onBatchConvert = async () => {
    if (convertBusy) return;
    if (!convertSourceDir.trim() || !convertTargetDir.trim() || convertSourceFormats.length === 0) return setStatus("请完善转换参数");
    setConvertBusy(true); setConvertLogs(["开始批量转换...", formatLog({ sourceDir: convertSourceDir, targetDir: convertTargetDir, sourceFormats: convertSourceFormats, targetFormat: convertTargetFormat })]);
    try {
      const result = await invoke<BatchConvertResult>("batch_convert_images", { request: { sourceDir: convertSourceDir, targetDir: convertTargetDir, sourceFormats: convertSourceFormats, targetFormat: convertTargetFormat, recursive: convertRecursive, keepStructure: convertKeepStructure, blpEncoding: "raw1", blpAlphaBits: 8, blpJpegAlpha: true, blpMakeMipmaps: true, blpFilter: "nearest", alphaMode: "passthrough", alphaThreshold: 128 } });
      setConvertLogs((c) => [...c, `完成：成功 ${result.converted} / 失败 ${result.failed}`, ...result.errors.slice(0, 100)]);
    } catch (e) { setConvertLogs((c) => [...c, `失败：${String(e)}`]); setStatus(String(e)); } finally { setConvertBusy(false); }
  };

  const addProfile = () => { const p = createApiProfile(); setDraftSettings((c) => ({ ...c, apiProfiles: [...c.apiProfiles, p], activeApiProfileId: p.id })); setEditingProfileId(p.id); };
  const updateEditingProfile = (patch: Partial<ApiProfile>) => setDraftSettings((c) => ({ ...c, apiProfiles: c.apiProfiles.map((p) => p.id === editingProfileId ? { ...p, ...patch } : p) }));
  const deleteProfile = (id: string) => setDraftSettings((c) => { if (c.apiProfiles.length <= 1) return c; const apiProfiles = c.apiProfiles.filter((p) => p.id !== id); const activeApiProfileId = c.activeApiProfileId === id ? apiProfiles[0].id : c.activeApiProfileId; setEditingProfileId(activeApiProfileId); return { ...c, apiProfiles, activeApiProfileId }; });
  const onChooseOutputDir = async () => { const selected = await open({ directory: true, multiple: false, title: "选择输出目录" }); if (typeof selected === "string") setDraftSettings({ ...draftSettings, outputDir: selected }); };
  const onSaveAllSettings = async () => { const next = normalizeSettings(draftSettings); await persistSettings(next); setEditingProfileId(next.activeApiProfileId); setSettingsOpen(false); setStatus("设置已保存"); };
  const onOpenApiSignup = async (provider: "pptokens" | "aifast" | "yunwu") => { try { await invoke("open_api_signup_url", { provider }); } catch (e) { setStatus(String(e)); } };
  const onConnectLocalModel = () => { const p = createApiProfile(); const next = { ...p, name: localModelName.trim() || "本地模型", apiBaseUrl: localModelBaseUrl.trim() || "http://127.0.0.1:11434/v1", model: localModelId.trim() || "llava", apiKey: "" }; setDraftSettings((c) => ({ ...c, apiProfiles: [...c.apiProfiles, next], activeApiProfileId: next.id })); setEditingProfileId(next.id); setLocalModelOpen(false); setStatus("本地模型已接入，请保存设置"); };

  return (
    <div className="app-shell">
      <header className="topbar">
        <nav className="topbar-actions">
          <button className="icon-button" onClick={() => setSettingsOpen(true)} title="设置">⚙</button>
          <button className={view === "single" ? "topbar-button active" : "topbar-button"} onClick={() => setView("single")}>单图生成</button>
          <button className={view === "batch" ? "topbar-button active" : "topbar-button"} onClick={() => setView("batch")}>批量生成</button>
          <button className={view === "convert" ? "topbar-button active" : "topbar-button"} onClick={() => setView("convert")}>批量转换</button>
          <button className="qq-group-button" title="加入QQ群免费获取最新版本" onClick={() => invoke("open_qq_group_url")}><img src={qqGroupIcon} alt="加入QQ群免费获取最新版本" /></button>
        </nav>
      </header>

      {view === "single" ? (
        <SingleGeneratePage
          settings={settings} stylePresets={stylePresets} contentTypes={contentTypes}
          referencePreviewSrc={referencePreviewSrc} maskPreviewSrc={maskPreviewSrc} history={history as any}
          previewSrc={previewSrc} generationBusy={generationBusy} saveButtonState={saveButtonState}
          saveSize={saveSize} customWidth={customWidth} customHeight={customHeight} logs={generateLogs} elapsedSeconds={elapsedSeconds}
          onSettingsChange={setSettings} onApplyContentType={applyContentType} onApplyStylePreset={applyStylePreset}
          onChooseReferenceLibraryDir={onChooseReferenceLibraryDir}
          onPickReferenceFromLibrary={async () => { const next = await pickReferenceFromLibrary(settings); await persistSettings(next); setStatus("已随机抽取参考图"); }}
          onClearReferenceLibraryDir={async () => persistSettings({ ...settings, referenceLibraryDir: "" })}
          onChooseReferenceImage={onChooseReferenceImage} onChooseMaskImage={onChooseMaskImage}
          onSavePrompt={savePromptToLibrary} onDeletePrompt={deletePromptFromLibrary} onChoosePrompt={choosePromptFromLibrary}
          onApplyHistory={(item: any) => { const req = (item.request as Record<string, unknown>) ?? {}; setSettings((c) => ({ ...c, positivePrompt: typeof req.positive_prompt === "string" ? req.positive_prompt : item.prompt, negativePrompt: typeof req.negative_prompt === "string" ? req.negative_prompt : "" })); }}
          onGenerate={onGenerate} onSavePreview={onSavePreview} onSaveSizeChange={setSaveSize}
          onCustomWidthChange={setCustomWidth} onCustomHeightChange={setCustomHeight}
        />
      ) : view === "batch" ? (
        <BatchGeneratePage
          generationBusy={generationBusy} elapsedSeconds={elapsedSeconds}
          batchPromptText={batchPromptText} batchMode={batchMode} batchConcurrency={batchConcurrency}
          saveSize={saveSize} logs={generateLogs} batchItems={batchItems as any}
          onBatchPromptTextChange={setBatchPromptText} onBatchModeChange={setBatchMode}
          onBatchConcurrencyChange={setBatchConcurrency} onSaveSizeChange={setSaveSize}
          onBatchGenerate={onBatchGenerate}
          onBatchItemApply={(item: any) => { setView("single"); setSettings((c) => ({ ...c, positivePrompt: item.fullPrompt, negativePrompt: item.negativePrompt })); }}
        />
      ) : (
        <BatchConvertPage
          convertBusy={convertBusy} convertSourceDir={convertSourceDir} convertTargetDir={convertTargetDir}
          convertSourceFormats={convertSourceFormats} convertTargetFormat={convertTargetFormat} convertRecursive={convertRecursive}
          convertKeepStructure={convertKeepStructure} logs={convertLogs}
          onChooseSourceDir={async () => { const d = await chooseDirectory("选择源文件夹"); if (d) setConvertSourceDir(d); }}
          onChooseTargetDir={async () => { const d = await chooseDirectory("选择目标文件夹"); if (d) setConvertTargetDir(d); }}
          onToggleSourceFormat={toggleConvertSourceFormat} onTargetFormatChange={setConvertTargetFormat}
          onRecursiveChange={setConvertRecursive} onKeepStructureChange={setConvertKeepStructure}
          onBatchConvert={onBatchConvert}
        />
      )}

      <SettingsModal
        open={settingsOpen} draftSettings={draftSettings as any} editingProfileId={editingProfileId}
        editingProfile={editingProfile as any} localModelName={localModelName} localModelBaseUrl={localModelBaseUrl}
        localModelId={localModelId} apiSignupOpen={apiSignupOpen} releaseNotesOpen={releaseNotesOpen}
        aboutOpen={aboutOpen} localModelOpen={localModelOpen} onClose={() => setSettingsOpen(false)}
        onSelectProfile={(id) => { setEditingProfileId(id); setDraftSettings({ ...draftSettings, activeApiProfileId: id }); }}
        onDraftSettingsChange={setDraftSettings as any} onAddProfile={addProfile} onUpdateEditingProfile={updateEditingProfile}
        onDeleteProfile={deleteProfile} onChooseOutputDir={onChooseOutputDir} onSaveAllSettings={onSaveAllSettings}
        onSetApiSignupOpen={setApiSignupOpen} onSetReleaseNotesOpen={setReleaseNotesOpen} onSetAboutOpen={setAboutOpen}
        onSetLocalModelOpen={setLocalModelOpen} onOpenApiSignup={onOpenApiSignup}
        onLocalModelNameChange={setLocalModelName} onLocalModelBaseUrlChange={setLocalModelBaseUrl}
        onLocalModelIdChange={setLocalModelId} onConnectLocalModel={onConnectLocalModel}
      />

      {saveNotice && <div className="save-toast" role="status"><strong>保存成功</strong><span>{saveNotice.replace(/^保存成功：?/, "")}</span></div>}
      <footer className="status-line">{status}</footer>
    </div>
  );
}
