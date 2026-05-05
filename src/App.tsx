import { useEffect, useMemo, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import qqGroupIcon from "./assets/quniconhigh.png";
import "./styles.css";

type ApiProfile = {
  id: string;
  name: string;
  apiKey: string;
  apiBaseUrl: string;
  model: string;
};

type GeneratedImage = {
  path: string | null;
  format: string;
  dataUrl: string;
};

type GenerationResult = {
  id: string;
  createdAt: string;
  prompt: string;
  status: string;
  outputs: GeneratedImage[];
  error: string | null;
  request: unknown;
  response: unknown;
};

type Settings = {
  apiProfiles: ApiProfile[];
  activeApiProfileId: string;
  outputDir: string;
  size: string;
  quality: string;
  outputFormat: string;
  removeBackground: boolean;
  n: number;
  positivePrompt: string;
  negativePrompt: string;
  positivePromptLibrary: string[];
  negativePromptLibrary: string[];
  stylePreset: string;
  contentType: string;
  referenceLibraryDir: string;
  referenceImagePath: string;
  maskImagePath: string;
  history: GenerationResult[];
};

type BatchItem = {
  id: string;
  prompt: string;
  fullPrompt: string;
  negativePrompt: string;
  status: "等待" | "生成中" | "完成" | "失败" | "已停止";
  path?: string;
  error?: string;
};

type BatchConvertResult = {
  total: number;
  converted: number;
  failed: number;
  errors: string[];
};

type SaveButtonState = "idle" | "saving" | "saved" | "resave";
type ViewMode = "single" | "batch" | "convert";
type BatchMode = "queue" | "concurrent";
type ConvertTarget = "png" | "tga" | "blp";

const defaultApiProfile: ApiProfile = {
  id: "default",
  name: "PPtokens",
  apiKey: "",
  apiBaseUrl: "https://api.openai.com/v1",
  model: "gpt-image-2",
};

const defaultSettings: Settings = {
  apiProfiles: [defaultApiProfile],
  activeApiProfileId: defaultApiProfile.id,
  outputDir: "outputs",
  size: "1024x1024",
  quality: "medium",
  outputFormat: "png",
  removeBackground: false,
  n: 1,
  positivePrompt: "",
  negativePrompt: "",
  positivePromptLibrary: [],
  negativePromptLibrary: [],
  stylePreset: "none",
  contentType: "icon",
  referenceLibraryDir: "",
  referenceImagePath: "",
  maskImagePath: "",
  history: [],
};

const stylePresets = [
  { id: "none", name: "默认风格", prompt: "" },
  { id: "dark", name: "暗黑奇幻", prompt: "dark fantasy, high contrast, dramatic lighting, arcane atmosphere" },
  { id: "pixel", name: "像素艺术", prompt: "pixel art style, retro game texture, crisp edges" },
  { id: "xianxia", name: "国风仙侠", prompt: "Chinese xianxia fantasy, elegant oriental style, mystical aura" },
  { id: "ink", name: "中式水墨", prompt: "Chinese ink wash, restrained colors, brush texture" },
  { id: "anime", name: "次元幻想", prompt: "anime fantasy style, cel shading, vivid magical effects" },
];

const contentTypes = [
  { id: "icon", name: "图标", prompt: "icon-oriented composition, centered subject, clean silhouette, readable at small size" },
  { id: "poster", name: "宣传图", prompt: "promotional key visual, cinematic composition, strong atmosphere" },
  { id: "ui", name: "UI", prompt: "UI asset direction, clean hierarchy, production-ready interface component" },
];

function normalizeSettings(raw: Partial<Settings>): Settings {
  const profiles = raw.apiProfiles && raw.apiProfiles.length > 0 ? raw.apiProfiles : [defaultApiProfile];
  const active = profiles.find((p) => p.id === raw.activeApiProfileId)?.id ?? profiles[0].id;
  return {
    ...defaultSettings,
    ...raw,
    apiProfiles: profiles,
    activeApiProfileId: active,
    positivePromptLibrary: raw.positivePromptLibrary ?? [],
    negativePromptLibrary: raw.negativePromptLibrary ?? [],
    history: (raw.history ?? []).slice(0, 10),
  };
}

function createApiProfile(): ApiProfile {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now());
  return { ...defaultApiProfile, id, name: "新 API" };
}

function formatLog(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function removeFragments(source: string, fragments: string[]) {
  return fragments.reduce((acc, frag) => {
    if (!frag) return acc;
    return acc
      .split(frag)
      .join("")
      .replace(/\s*,\s*,+/g, ", ")
      .replace(/^\s*,\s*/, "")
      .replace(/\s*,\s*$/, "")
      .trim();
  }, source.trim());
}

function replaceFragment(source: string, allFragments: string[], next: string) {
  const clean = removeFragments(source, allFragments);
  return [clean, next].filter(Boolean).join(", ");
}

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
  const [logs, setLogs] = useState<string[]>(["等待生成任务..."]);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [history, setHistory] = useState<GenerationResult[]>([]);

  const [generationBusy, setGenerationBusy] = useState(false);
  const [convertBusy, setConvertBusy] = useState(false);
  const generationRunIdRef = useRef(0);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [generationStartedAt, setGenerationStartedAt] = useState<number | null>(null);
  const [convertElapsedSeconds, setConvertElapsedSeconds] = useState(0);
  const [convertStartedAt, setConvertStartedAt] = useState<number | null>(null);

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

  const activeProfile = useMemo(
    () => settings.apiProfiles.find((p) => p.id === settings.activeApiProfileId) ?? settings.apiProfiles[0],
    [settings],
  );

  const editingProfile = useMemo(
    () => draftSettings.apiProfiles.find((p) => p.id === editingProfileId) ?? draftSettings.apiProfiles[0],
    [draftSettings, editingProfileId],
  );

  useEffect(() => {
    invoke<Settings>("load_settings")
      .then((value) => {
        const next = normalizeSettings(value);
        setSettings(next);
        setDraftSettings(next);
        setEditingProfileId(next.activeApiProfileId);
        setHistory(next.history);
      })
      .catch(() => setSettingsOpen(true));
  }, []);

  useEffect(() => {
    if (!generationBusy || generationStartedAt == null) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - generationStartedAt) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [generationBusy, generationStartedAt]);

  useEffect(() => {
    if (!convertBusy || convertStartedAt == null) return;
    const timer = window.setInterval(() => {
      setConvertElapsedSeconds(Math.floor((Date.now() - convertStartedAt) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [convertBusy, convertStartedAt]);

  useEffect(() => {
    if (!saveNotice) return;
    const t = window.setTimeout(() => setSaveNotice(""), 2200);
    return () => window.clearTimeout(t);
  }, [saveNotice]);

  useEffect(() => {
    if (!status) return;
    const t = window.setTimeout(() => setStatus(""), 5000);
    return () => window.clearTimeout(t);
  }, [status]);

  useEffect(() => {
    if (!settings.referenceImagePath) {
      setReferencePreviewSrc("");
      return;
    }
    invoke<string>("read_image_data_url", { path: settings.referenceImagePath })
      .then(setReferencePreviewSrc)
      .catch(() => setReferencePreviewSrc(""));
  }, [settings.referenceImagePath]);

  useEffect(() => {
    if (!settings.maskImagePath) {
      setMaskPreviewSrc("");
      return;
    }
    invoke<string>("read_image_data_url", { path: settings.maskImagePath })
      .then(setMaskPreviewSrc)
      .catch(() => setMaskPreviewSrc(""));
  }, [settings.maskImagePath]);

  function resetSaveButtonState() {
    setSaveButtonState("idle");
  }

  async function saveSettings(next: Settings) {
    await invoke("save_settings", { settings: next });
  }

  async function persistSettings(next: Settings) {
    setSettings(next);
    setDraftSettings(next);
    await saveSettings(next);
  }

  function getSaveDimensions() {
    if (saveSize === "original") return { width: 0, height: 0 };
    const [width, height] =
      saveSize === "custom"
        ? [customWidth, customHeight]
        : saveSize.split("x").map((v) => Number(v));
    return { width, height };
  }

  async function chooseDirectory(title: string) {
    const selected = await open({ directory: true, multiple: false, title });
    return typeof selected === "string" ? selected : "";
  }

  async function onChooseReferenceImage() {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "tga", "bmp"] }],
      title: "选择参考图",
    });
    if (typeof selected === "string") await persistSettings({ ...settings, referenceImagePath: selected });
  }

  async function onChooseMaskImage() {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "tga", "bmp"] }],
      title: "选择蒙版图",
    });
    if (typeof selected === "string") await persistSettings({ ...settings, maskImagePath: selected });
  }

  async function onChooseReferenceLibraryDir() {
    const dir = await chooseDirectory("选择参考图库文件夹");
    if (!dir) return;
    await persistSettings({ ...settings, referenceLibraryDir: dir });
  }

  async function pickReferenceFromLibrary(base: Settings) {
    if (!base.referenceLibraryDir) return base;
    const path = await invoke<string>("pick_random_reference_image", { directory: base.referenceLibraryDir });
    return { ...base, referenceImagePath: path };
  }

  async function saveHistoryResult(result: GenerationResult, baseSettings: Settings = settings) {
    const nextHistory = [result, ...baseSettings.history.filter((item) => item.id !== result.id)].slice(0, 10);
    setHistory(nextHistory);
    await persistSettings({ ...baseSettings, history: nextHistory });
  }

  async function savePromptToLibrary(kind: "positive" | "negative") {
    const prompt = kind === "positive" ? settings.positivePrompt.trim() : settings.negativePrompt.trim();
    if (!prompt) {
      setStatus(kind === "positive" ? "正向提示词为空" : "负向提示词为空");
      return;
    }
    const key = kind === "positive" ? "positivePromptLibrary" : "negativePromptLibrary";
    const current = settings[key];
    if (current.includes(prompt)) {
      setStatus("提示词已在库中");
      return;
    }
    await persistSettings({ ...settings, [key]: [prompt, ...current] });
    setStatus("提示词已保存到本地");
  }

  async function choosePromptFromLibrary(kind: "positive" | "negative", prompt: string) {
    if (!prompt) return;
    const next = kind === "positive" ? { ...settings, positivePrompt: prompt } : { ...settings, negativePrompt: prompt };
    await persistSettings(next);
  }

  async function deletePromptFromLibrary(kind: "positive" | "negative", prompt: string) {
    if (!prompt) return;
    const key = kind === "positive" ? "positivePromptLibrary" : "negativePromptLibrary";
    await persistSettings({ ...settings, [key]: settings[key].filter((item) => item !== prompt) });
    setStatus("历史提示词已删除");
  }

  async function onGenerate() {
    if (generationBusy) {
      generationRunIdRef.current += 1;
      setGenerationBusy(false);
      setStatus("已停止生成");
      setLogs((current) => [...current, "[单图] 已停止，本次返回将忽略"]);
      return;
    }
    if (!activeProfile?.apiKey.trim()) {
      setStatus("请先在设置中填写 API Key");
      setSettingsOpen(true);
      return;
    }
    if (!activeProfile.apiBaseUrl.trim() || !activeProfile.model.trim()) {
      setStatus("请先在设置中填写 API 地址和模型名称");
      setSettingsOpen(true);
      return;
    }
    if (!settings.positivePrompt.trim()) {
      setStatus("请输入正向提示词");
      return;
    }

    if (previewSrc) resetSaveButtonState();

    const startedAt = Date.now();
    const runId = generationRunIdRef.current + 1;
    generationRunIdRef.current = runId;
    setGenerationStartedAt(startedAt);
    setElapsedSeconds(0);
    setGenerationBusy(true);
    setStatus("正在生成...");
    setLogs([`[${new Date().toLocaleString()}] [单图] 开始生成`]);

    try {
      const generationSettings = await pickReferenceFromLibrary(settings);
      if (generationSettings.referenceImagePath !== settings.referenceImagePath) {
        setSettings(generationSettings);
      }
      const result = await invoke<GenerationResult>("generate_image", { settings: generationSettings });
      if (generationRunIdRef.current !== runId) return;
      await saveHistoryResult(result, generationSettings);
      setPreviewSrc(result.outputs[0]?.dataUrl ?? null);
      resetSaveButtonState();
      setStatus("生成完成");
      setLogs((current) => [...current, "[单图] 返回:", formatLog(result.response)]);
    } catch (error) {
      if (generationRunIdRef.current !== runId) return;
      setStatus(String(error));
      setLogs((current) => [...current, "[单图] 错误:", String(error)]);
    } finally {
      if (generationRunIdRef.current !== runId) return;
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
      setGenerationBusy(false);
    }
  }

  async function onSavePreview() {
    if (!previewSrc) return;
    const { width, height } = getSaveDimensions();
    if (saveSize !== "original" && (!width || !height)) {
      setStatus("请输入有效保存尺寸");
      return;
    }
    setStatus("正在保存...");
    setSaveButtonState("saving");
    try {
      const path = await invoke<string>("save_generated_image", {
        request: { settings, dataUrl: previewSrc, width, height },
      });
      setStatus("保存完成");
      setSaveButtonState("saved");
      setSaveNotice("保存成功：" + path);
      setLogs((current) => [...current, "[单图] 保存文件:", path]);
      window.setTimeout(() => {
        setSaveButtonState((s) => (s === "saved" ? "resave" : s));
      }, 900);
    } catch (error) {
      setSaveButtonState("resave");
      setStatus(String(error));
      setLogs((current) => [...current, "[单图] 保存错误:", String(error)]);
    }
  }

  function applyStylePreset(stylePreset: string) {
    const preset = stylePresets.find((item) => item.id === stylePreset) ?? stylePresets[0];
    const nextPrompt = replaceFragment(settings.positivePrompt, stylePresets.map((item) => item.prompt), preset.prompt);
    setSettings({ ...settings, stylePreset, positivePrompt: nextPrompt });
  }

  function applyContentType(contentType: string) {
    const current = contentTypes.find((item) => item.id === contentType) ?? contentTypes[0];
    const nextPrompt = replaceFragment(settings.positivePrompt, contentTypes.map((item) => item.prompt), current.prompt);
    setSettings({ ...settings, contentType, positivePrompt: nextPrompt });
  }

  async function onBatchGenerate() {
    if (generationBusy) {
      generationRunIdRef.current += 1;
      setGenerationBusy(false);
      setStatus("已停止批量生成");
      setLogs((current) => [...current, "[批量] 已停止"]);
      setBatchItems((current) => current.map((item) => (item.status === "生成中" || item.status === "等待" ? { ...item, status: "已停止" } : item)));
      return;
    }
    if (!activeProfile?.apiKey.trim()) {
      setStatus("请先在设置中填写 API Key");
      setSettingsOpen(true);
      return;
    }

    const prompts = batchPromptText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    if (prompts.length === 0) {
      setStatus("请输入批量提示词");
      return;
    }

    const { width, height } = getSaveDimensions();
    if (saveSize !== "original" && (!width || !height)) {
      setStatus("请输入有效保存尺寸");
      return;
    }

    const basePositive = settings.positivePrompt.trim();
    const baseNegative = settings.negativePrompt.trim();
    const items: BatchItem[] = prompts.map((prompt, index) => ({
      id: String(Date.now() + index),
      prompt,
      fullPrompt: [basePositive, prompt].filter(Boolean).join("\n"),
      negativePrompt: baseNegative,
      status: "等待",
    }));
    setBatchItems(items);

    const startedAt = Date.now();
    const runId = generationRunIdRef.current + 1;
    generationRunIdRef.current = runId;
    setGenerationStartedAt(startedAt);
    setElapsedSeconds(0);
    setGenerationBusy(true);
    setStatus("正在批量生成...");
    const concurrency = batchMode === "concurrent" ? Math.max(1, Math.min(20, Math.floor(batchConcurrency) || 1)) : 1;
    setLogs([
      `[${new Date().toLocaleString()}] [批量] 开始，共 ${items.length} 条`,
      `[批量] 执行模式：${batchMode === "concurrent" ? `并发（${concurrency}）` : "队列"}`,
      `[批量] 继承负向提示词：${baseNegative || "（空）"}`,
    ]);

    const runOne = async (item: BatchItem) => {
      if (generationRunIdRef.current !== runId) return;
      setBatchItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, status: "生成中" } : entry)));
      setLogs((current) => [...current, `[批量] 开始：${item.prompt}`]);
      try {
        const base = { ...settings, positivePrompt: item.fullPrompt, negativePrompt: item.negativePrompt, n: 1 };
        const result = await invoke<GenerationResult>("generate_image", { settings: base });
        if (generationRunIdRef.current !== runId) return;
        const dataUrl = result.outputs[0]?.dataUrl ?? "";
        let path = "";
        if (dataUrl) {
          path = await invoke<string>("save_generated_image", {
            request: { settings: base, dataUrl, width, height },
          });
        }
        setBatchItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, status: "完成", path } : entry)));
        setLogs((current) => [...current, `[批量] 完成：${path || item.prompt}`]);
      } catch (error) {
        setBatchItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, status: "失败", error: String(error) } : entry)));
        setLogs((current) => [...current, `[批量] 失败：${item.prompt}`, String(error)]);
      }
    };

    try {
      if (concurrency <= 1) {
        for (const item of items) {
          if (generationRunIdRef.current !== runId) break;
          // eslint-disable-next-line no-await-in-loop
          await runOne(item);
        }
      } else {
        let nextIndex = 0;
        const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
          while (generationRunIdRef.current === runId) {
            const item = items[nextIndex];
            nextIndex += 1;
            if (!item) break;
            // eslint-disable-next-line no-await-in-loop
            await runOne(item);
          }
        });
        await Promise.all(workers);
      }
    } finally {
      if (generationRunIdRef.current === runId) {
        setGenerationBusy(false);
        setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
        setStatus("批量生成完成");
      }
    }
  }

  function toggleConvertSourceFormat(ext: string) {
    setConvertSourceFormats((current) => {
      if (current.includes(ext)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== ext);
      }
      return [...current, ext];
    });
  }

  async function onBatchConvert() {
    if (convertBusy) {
      setStatus("请等待当前转换任务完成");
      return;
    }
    if (!convertSourceDir.trim()) {
      setStatus("请先选择源文件夹");
      return;
    }
    if (!convertTargetDir.trim()) {
      setStatus("请先选择目标文件夹");
      return;
    }
    if (convertSourceFormats.length === 0) {
      setStatus("请至少选择一个源格式");
      return;
    }

    setConvertBusy(true);
    setConvertStartedAt(Date.now());
    setConvertElapsedSeconds(0);
    setStatus("正在批量转换...");
    setLogs([
      "[转换] 开始批量转换",
      formatLog({
        sourceDir: convertSourceDir,
        targetDir: convertTargetDir,
        sourceFormats: convertSourceFormats,
        targetFormat: convertTargetFormat,
      }),
    ]);

    try {
      const result = await invoke<BatchConvertResult>("batch_convert_images", {
        request: {
          sourceDir: convertSourceDir,
          targetDir: convertTargetDir,
          sourceFormats: convertSourceFormats,
          targetFormat: convertTargetFormat,
          recursive: convertRecursive,
          keepStructure: convertKeepStructure,
          blpEncoding: "raw1",
          blpAlphaBits: 8,
          blpJpegAlpha: true,
          blpMakeMipmaps: true,
          blpFilter: "nearest",
          alphaMode: "passthrough",
          alphaThreshold: 128,
        },
      });
      const lines = [
        "[转换] 批量转换完成",
        formatLog({ total: result.total, converted: result.converted, failed: result.failed }),
      ];
      if (result.errors.length > 0) lines.push("[转换] 错误详情:", ...result.errors.slice(0, 50));
      setLogs(lines);
      setStatus(`批量转换完成：成功 ${result.converted}，失败 ${result.failed}`);
    } catch (error) {
      setLogs((current) => [...current, `[转换] 失败: ${String(error)}`]);
      setStatus(`批量转换失败：${String(error)}`);
    } finally {
      setConvertBusy(false);
    }
  }

  async function onChooseOutputDir() {
    const selected = await open({ directory: true, multiple: false, title: "选择输出目录" });
    if (typeof selected === "string") {
      setDraftSettings({ ...draftSettings, outputDir: selected });
    }
  }

  function addProfile() {
    const profile = createApiProfile();
    setDraftSettings((current) => ({
      ...current,
      apiProfiles: [...current.apiProfiles, profile],
      activeApiProfileId: profile.id,
    }));
    setEditingProfileId(profile.id);
  }

  function updateEditingProfile(patch: Partial<ApiProfile>) {
    setDraftSettings((current) => ({
      ...current,
      apiProfiles: current.apiProfiles.map((p) => (p.id === editingProfileId ? { ...p, ...patch } : p)),
    }));
  }

  function deleteProfile(profileId: string) {
    setDraftSettings((current) => {
      if (current.apiProfiles.length <= 1) return current;
      const apiProfiles = current.apiProfiles.filter((p) => p.id !== profileId);
      const activeApiProfileId = current.activeApiProfileId === profileId ? apiProfiles[0].id : current.activeApiProfileId;
      setEditingProfileId(activeApiProfileId);
      return { ...current, apiProfiles, activeApiProfileId };
    });
  }

  async function onSaveAllSettings() {
    const next = normalizeSettings(draftSettings);
    await persistSettings(next);
    setEditingProfileId(next.activeApiProfileId);
    setSettingsOpen(false);
    setStatus("设置已保存");
  }

  async function onOpenApiSignup(provider: "pptokens" | "aifast" | "yunwu") {
    try {
      await invoke("open_api_signup_url", { provider });
    } catch (error) {
      setStatus(`打开链接失败：${String(error)}`);
    }
  }

  function onConnectLocalModel() {
    const profile = createApiProfile();
    const nextProfile: ApiProfile = {
      ...profile,
      name: localModelName.trim() || "本地模型",
      apiBaseUrl: localModelBaseUrl.trim() || "http://127.0.0.1:11434/v1",
      model: localModelId.trim() || "llava",
      apiKey: "",
    };

    setDraftSettings((current) => ({
      ...current,
      apiProfiles: [...current.apiProfiles, nextProfile],
      activeApiProfileId: nextProfile.id,
    }));
    setEditingProfileId(nextProfile.id);
    setLocalModelOpen(false);
    setStatus("本地模型已接入，请点击保存设置生效");
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <nav className="topbar-actions">
          <button className="icon-button" onClick={() => setSettingsOpen(true)} title="设置">⚙</button>
          <button className={view === "single" ? "topbar-button active" : "topbar-button"} onClick={() => setView("single")}>单图生成</button>
          <button className={view === "batch" ? "topbar-button active" : "topbar-button"} onClick={() => setView("batch")}>批量生成</button>
          <button className={view === "convert" ? "topbar-button active" : "topbar-button"} onClick={() => setView("convert")}>批量转换</button>
          <button className="qq-group-button" title="加入QQ群免费获取最新版本" onClick={() => invoke("open_qq_group_url")}>
            <img src={qqGroupIcon} alt="加入QQ群免费获取最新版本" />
          </button>
        </nav>
      </header>

      {view === "single" ? (
        <main className="lab-layout">
          <aside className="lab-panel">
            <section className="panel-section">
              <div className="style-library-card">
                <div className="style-type-grid">
                  <label>生成方向
                    <select value={settings.contentType} onChange={(e) => applyContentType(e.target.value)}>
                      {contentTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                    </select>
                  </label>
                  <label>风格预设
                    <select value={settings.stylePreset} onChange={(e) => applyStylePreset(e.target.value)}>
                      {stylePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                    </select>
                  </label>
                </div>
                <label>
                  参考图库
                  <div className="path-picker">
                    <input value={settings.referenceLibraryDir || "未选择参考图库文件夹"} readOnly />
                    <button type="button" className="ghost-button" onClick={onChooseReferenceLibraryDir}>选择文件夹</button>
                  </div>
                </label>
                <div className="style-library-actions">
                  <button
                    type="button"
                    className="ghost-button"
                    disabled={!settings.referenceLibraryDir}
                    onClick={async () => {
                      try {
                        const next = await pickReferenceFromLibrary(settings);
                        await persistSettings(next);
                        setStatus("已随机抽取参考图");
                      } catch (error) {
                        setStatus(`参考图库错误：${String(error)}`);
                      }
                    }}
                  >
                    随机参考图
                  </button>
                  <button type="button" className="ghost-button" disabled={!settings.referenceLibraryDir} onClick={() => persistSettings({ ...settings, referenceLibraryDir: "" })}>
                    清除图库
                  </button>
                </div>
              </div>
            </section>

            <section className="panel-section">
              <h2>图生图（可选）</h2>
              <div className="image-picker-grid">
                <button className={settings.referenceImagePath ? "thumb-box selected" : "thumb-box"} title={settings.referenceImagePath || "点击选择参考图"} onClick={() => (settings.referenceImagePath ? persistSettings({ ...settings, referenceImagePath: "" }) : onChooseReferenceImage())}>
                  {referencePreviewSrc ? <img src={referencePreviewSrc} alt="参考图预览" /> : null}
                  <span>参考图</span>
                  <small>{settings.referenceImagePath ? "已选择，点击清除" : "点击选择"}</small>
                </button>
                <button className={settings.maskImagePath ? "thumb-box selected" : "thumb-box"} title={settings.maskImagePath || "点击选择蒙版图"} onClick={() => (settings.maskImagePath ? persistSettings({ ...settings, maskImagePath: "" }) : onChooseMaskImage())}>
                  {maskPreviewSrc ? <img src={maskPreviewSrc} alt="蒙版预览" /> : null}
                  <span>蒙版</span>
                  <small>{settings.maskImagePath ? "已选择，点击清除" : "点击选择"}</small>
                </button>
              </div>
              <div className="mode-line">当前模式：{settings.referenceImagePath ? "图生图（编辑）" : "文生图"}</div>
            </section>

            <section className="panel-section prompt-section">
              <div className="prompt-field">
                <div className="prompt-toolbar">
                  <span>正向提示词</span>
                  <div className="prompt-library-actions">
                    <select aria-label="选择正向历史提示词" value={settings.positivePromptLibrary.includes(settings.positivePrompt) ? settings.positivePrompt : ""} onChange={(e) => choosePromptFromLibrary("positive", e.target.value)}>
                      <option value="">选择历史提示词</option>
                      {settings.positivePromptLibrary.map((prompt) => <option key={prompt} value={prompt}>{prompt.slice(0, 48)}</option>)}
                    </select>
                    <button type="button" className="mini-button" onClick={() => savePromptToLibrary("positive")}>保存</button>
                    <button type="button" className="mini-button danger-mini" disabled={!settings.positivePromptLibrary.includes(settings.positivePrompt)} onClick={() => deletePromptFromLibrary("positive", settings.positivePrompt)}>删除</button>
                  </div>
                </div>
                <textarea rows={7} value={settings.positivePrompt} placeholder="正向提示词的描述" onChange={(e) => setSettings({ ...settings, positivePrompt: e.target.value })} />
              </div>
              <div className="prompt-field">
                <div className="prompt-toolbar">
                  <span>负向提示词</span>
                  <div className="prompt-library-actions">
                    <select aria-label="选择负向历史提示词" value={settings.negativePromptLibrary.includes(settings.negativePrompt) ? settings.negativePrompt : ""} onChange={(e) => choosePromptFromLibrary("negative", e.target.value)}>
                      <option value="">选择历史提示词</option>
                      {settings.negativePromptLibrary.map((prompt) => <option key={prompt} value={prompt}>{prompt.slice(0, 48)}</option>)}
                    </select>
                    <button type="button" className="mini-button" onClick={() => savePromptToLibrary("negative")}>保存</button>
                    <button type="button" className="mini-button danger-mini" disabled={!settings.negativePromptLibrary.includes(settings.negativePrompt)} onClick={() => deletePromptFromLibrary("negative", settings.negativePrompt)}>删除</button>
                  </div>
                </div>
                <textarea rows={4} value={settings.negativePrompt} placeholder="不希望出现的元素、风格或缺陷..." onChange={(e) => setSettings({ ...settings, negativePrompt: e.target.value })} />
              </div>
            </section>

            <section className="history">
              {history.slice(0, 10).map((item) => (
                <button
                  key={item.id}
                  className="history-item"
                  onClick={() => {
                    const req = (item.request as Record<string, unknown>) ?? {};
                    const positive = typeof req.positive_prompt === "string" ? req.positive_prompt : (typeof req.positivePrompt === "string" ? req.positivePrompt : item.prompt);
                    const negative = typeof req.negative_prompt === "string" ? req.negative_prompt : (typeof req.negativePrompt === "string" ? req.negativePrompt : "");
                    setSettings((current) => ({ ...current, positivePrompt: positive, negativePrompt: negative }));
                    setStatus("已从历史记录填充提示词");
                  }}
                  title={item.prompt}
                >
                  <span>{item.createdAt}</span>
                  <strong>{item.prompt.replace(/\s+/g, " ").slice(0, 80)}</strong>
                  <em>{item.status}</em>
                </button>
              ))}
            </section>
          </aside>

          <section className="lab-workspace">
            <button className={previewSrc ? "preview-stage has-image" : "preview-stage"} disabled={!previewSrc}>
              {previewSrc ? <img src={previewSrc} alt="生成结果预览" /> : <span>等待生成结果...</span>}
            </button>
            <div className="operation-row">
              <div className="bottom-actions">
                <button className={generationBusy ? "stop-action" : "primary-action"} onClick={onGenerate}>
                  {generationBusy ? "停止生成" : previewSrc ? "重新生成" : "生成图片"}
                </button>
                <button className={saveButtonState === "saved" ? "save-action saved" : "save-action"} disabled={!previewSrc || saveButtonState === "saving"} onClick={onSavePreview}>
                  {saveButtonState === "saving" ? "保存中..." : saveButtonState === "saved" ? "保存成功" : saveButtonState === "resave" ? "再次保存" : "保存图片"}
                </button>
              </div>
              <div className="save-size-control">
                <select value={saveSize} onChange={(e) => setSaveSize(e.target.value)}>
                  <option value="original">原始尺寸</option>
                  <option value="64x64">64x64</option>
                  <option value="128x128">128x128</option>
                  <option value="256x256">256x256</option>
                  <option value="512x512">512x512</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
            </div>
            {saveSize === "custom" && (
              <div className="custom-size-row">
                <span>保存尺寸</span>
                <div className="custom-size">
                  <input type="number" min={1} value={customWidth} onChange={(e) => setCustomWidth(Number(e.target.value))} />
                  <span>x</span>
                  <input type="number" min={1} value={customHeight} onChange={(e) => setCustomHeight(Number(e.target.value))} />
                </div>
              </div>
            )}
            <section className="log-panel">
              <div className={generationBusy ? "timer-pill active" : "timer-pill"}>生成耗时: {elapsedSeconds}s</div>
              <pre>{logs.join("\n")}</pre>
            </section>
          </section>
        </main>
      ) : view === "batch" ? (
        <main className="batch-layout">
          <section className="batch-panel">
            <div className="batch-header">
              <div>
                <h2>批量生成</h2>
                <span>每行一个正向提示词，会继承当前单图设置中的正向/负向提示词。</span>
              </div>
              <button className={generationBusy ? "stop-action" : "primary-action"} onClick={onBatchGenerate}>
                {generationBusy ? "停止生成" : "开始批量生成"}
              </button>
            </div>
            <textarea className="batch-input" value={batchPromptText} placeholder={"火焰风暴技能图标\n寒冰护盾技能图标\n暗影突袭技能图标"} onChange={(e) => setBatchPromptText(e.target.value)} />
            <div className="batch-options">
              <label>执行模式
                <select value={batchMode} onChange={(e) => setBatchMode(e.target.value as BatchMode)}>
                  <option value="queue">队列</option>
                  <option value="concurrent">并发</option>
                </select>
              </label>
              {batchMode === "concurrent" && (
                <label>并发数
                  <input type="number" min={1} max={20} value={batchConcurrency} onChange={(e) => setBatchConcurrency(Number(e.target.value))} />
                </label>
              )}
              <label>保存尺寸
                <select value={saveSize} onChange={(e) => setSaveSize(e.target.value)}>
                  <option value="original">原始尺寸</option>
                  <option value="64x64">64x64</option>
                  <option value="128x128">128x128</option>
                  <option value="256x256">256x256</option>
                  <option value="512x512">512x512</option>
                  <option value="custom">自定义</option>
                </select>
              </label>
            </div>
          </section>
          <section className="batch-results">
            <section className="log-panel batch-live-log">
              <div className={generationBusy ? "timer-pill active" : "timer-pill"}>生成耗时: {elapsedSeconds}s</div>
              <pre>{logs.join("\n")}</pre>
            </section>
            <section className="history">
              {batchItems.map((item) => (
                <button
                  key={item.id}
                  className="history-item"
                  title={item.fullPrompt}
                  onClick={() => {
                    setView("single");
                    setSettings((current) => ({
                      ...current,
                      positivePrompt: item.fullPrompt,
                      negativePrompt: item.negativePrompt,
                    }));
                    setStatus("已从批量项回填到单图提示词");
                  }}
                >
                  <span>{item.status}</span>
                  <strong>{item.prompt.replace(/\s+/g, " ")}</strong>
                  <em>{item.path ?? item.error ?? ""}</em>
                </button>
              ))}
            </section>
          </section>
        </main>
      ) : (
        <main className="batch-layout">
          <section className="batch-panel">
            <div className="batch-header">
              <div>
                <h2>批量转换</h2>
                <span>支持 PNG/TGA/BLP 互转，可递归子目录并保持目录结构。</span>
              </div>
              <button className={convertBusy ? "stop-action" : "primary-action"} disabled={convertBusy} onClick={onBatchConvert}>
                {convertBusy ? "转换中..." : "开始转换"}
              </button>
            </div>
            <div className="batch-options">
              <label>源文件夹
                <div className="path-picker">
                  <input value={convertSourceDir} readOnly placeholder="请选择源文件夹" />
                  <button type="button" className="ghost-button" onClick={async () => {
                    const dir = await chooseDirectory("选择源文件夹");
                    if (dir) setConvertSourceDir(dir);
                  }}>选择文件夹</button>
                </div>
              </label>
              <label>目标文件夹
                <div className="path-picker">
                  <input value={convertTargetDir} readOnly placeholder="请选择目标文件夹" />
                  <button type="button" className="ghost-button" onClick={async () => {
                    const dir = await chooseDirectory("选择目标文件夹");
                    if (dir) setConvertTargetDir(dir);
                  }}>选择文件夹</button>
                </div>
              </label>
              <div className="field-group">
                <span className="field-label">源格式</span>
                <div className="format-checks">
                  {["png", "tga", "blp", "jpg", "jpeg", "webp"].map((ext) => (
                    <label key={ext} className="checkbox-row">
                      <input type="checkbox" checked={convertSourceFormats.includes(ext)} onChange={() => toggleConvertSourceFormat(ext)} />
                      <span>{ext.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label>目标格式
                <select value={convertTargetFormat} onChange={(e) => setConvertTargetFormat(e.target.value as ConvertTarget)}>
                  <option value="blp">BLP</option>
                  <option value="png">PNG</option>
                  <option value="tga">TGA</option>
                </select>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={convertRecursive} onChange={(e) => setConvertRecursive(e.target.checked)} />
                <span>解析子文件夹</span>
              </label>
              <label className="checkbox-row">
                <input type="checkbox" checked={convertKeepStructure} onChange={(e) => setConvertKeepStructure(e.target.checked)} />
                <span>保持文件夹结构</span>
              </label>
            </div>
          </section>
          <section className="batch-results">
            <section className="log-panel batch-log-panel">
              <div className={convertBusy ? "timer-pill active" : "timer-pill"}>转换耗时: {convertElapsedSeconds}s</div>
              <pre>{logs.join("\n")}</pre>
            </section>
          </section>
        </main>
      )}

      {settingsOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal wide-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2>设置</h2>
              <button className="ghost-button" onClick={() => setSettingsOpen(false)}>关闭</button>
            </div>
            <div className="api-settings">
              <div className="profile-list">
                <div className="section-title">API 配置</div>
                <div className="profile-scroll">
                  {draftSettings.apiProfiles.map((profile) => (
                    <button key={profile.id} className={profile.id === editingProfileId ? "profile-item active" : "profile-item"} onClick={() => {
                      setEditingProfileId(profile.id);
                      setDraftSettings({ ...draftSettings, activeApiProfileId: profile.id });
                    }}>
                      <strong>{profile.name}</strong>
                      <small>{profile.model}</small>
                    </button>
                  ))}
                </div>
                <button className="ghost-button" onClick={addProfile}>新增 API</button>
              </div>
              <div className="profile-form">
                <label>配置名称<input value={editingProfile?.name ?? ""} onChange={(e) => updateEditingProfile({ name: e.target.value })} /></label>
                <label>API Key<input type="password" value={editingProfile?.apiKey ?? ""} onChange={(e) => updateEditingProfile({ apiKey: e.target.value })} /></label>
                <label>API 地址<input value={editingProfile?.apiBaseUrl ?? ""} onChange={(e) => updateEditingProfile({ apiBaseUrl: e.target.value })} /></label>
                <label>模型名称<input value={editingProfile?.model ?? ""} onChange={(e) => updateEditingProfile({ model: e.target.value })} /></label>
                <button className="danger-button" disabled={draftSettings.apiProfiles.length <= 1} onClick={() => deleteProfile(editingProfile.id)}>删除当前 API</button>
              </div>
            </div>
            <label>
              输出目录
              <div className="path-picker">
                <input value={draftSettings.outputDir} onChange={(e) => setDraftSettings({ ...draftSettings, outputDir: e.target.value })} />
                <button type="button" className="ghost-button" onClick={onChooseOutputDir}>选择文件夹</button>
              </div>
            </label>
            <div className="modal-actions">
              <div className="modal-action-group">
                <button type="button" className="ghost-button" onClick={() => setApiSignupOpen(true)}>获取 API</button>
                <button type="button" className="ghost-button" onClick={() => setReleaseNotesOpen(true)}>更新提示</button>
                <button type="button" className="ghost-button" onClick={() => setAboutOpen(true)}>关于软件</button>
                <button type="button" className="ghost-button" onClick={() => setLocalModelOpen(true)}>接入本地模型</button>
              </div>
              <button onClick={onSaveAllSettings}>保存设置</button>
            </div>
          </div>
        </div>
      )}

      {apiSignupOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal api-signup-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2>获取 API</h2>
              <button className="ghost-button" onClick={() => setApiSignupOpen(false)}>关闭</button>
            </div>
            <div className="api-provider-list">
              <button className="ghost-button" onClick={() => onOpenApiSignup("pptokens")}>
                <strong>PPtokens</strong>
                <span>https://www.pptoken.org/?promo=AFFNV</span>
              </button>
              <button className="ghost-button" onClick={() => onOpenApiSignup("aifast")}>
                <strong>速擎智能</strong>
                <span>https://aifast.site/register?aff=6fbi</span>
              </button>
              <button className="ghost-button" onClick={() => onOpenApiSignup("yunwu")}>
                <strong>云雾</strong>
                <span>https://yunwu.ai/register?aff=3QLV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {releaseNotesOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2>更新提示</h2>
              <button className="ghost-button" onClick={() => setReleaseNotesOpen(false)}>关闭</button>
            </div>
            <div className="about-content">
              <strong>v1.1</strong>
              <p>新增本地模型接口（可在设置中接入本地模型配置）。</p>
              <strong>v1.2</strong>
              <p>保存图片默认尺寸改为原始生图尺寸，可再选择 64x64/128x128/256x256/512x512/自定义。</p>
            </div>
          </div>
        </div>
      )}

      {aboutOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal about-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2>关于软件</h2>
              <button className="ghost-button" onClick={() => setAboutOpen(false)}>关闭</button>
            </div>
            <div className="about-content">
              <strong>Imagen</strong>
              <p>作者：睡不醒</p>
              <p>QQ：329209303</p>
              <p>本软件为免费软件，禁止倒卖、二次收费或用于任何非法用途。</p>
              <p>免责声明：本软件按“现状”提供，不对生成内容的合法性、准确性、适用性作任何明示或暗示担保。用户需自行承担因使用本软件产生的一切风险与责任，并确保其行为符合当地法律法规及第三方平台条款。</p>
            </div>
          </div>
        </div>
      )}

      {localModelOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal local-model-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2>接入本地模型</h2>
              <button className="ghost-button" onClick={() => setLocalModelOpen(false)}>关闭</button>
            </div>
            <div className="local-model-form">
              <label>配置名称
                <input value={localModelName} onChange={(e) => setLocalModelName(e.target.value)} />
              </label>
              <label>本地接口地址
                <input value={localModelBaseUrl} onChange={(e) => setLocalModelBaseUrl(e.target.value)} placeholder="例如：http://127.0.0.1:11434/v1" />
              </label>
              <label>模型名称
                <input value={localModelId} onChange={(e) => setLocalModelId(e.target.value)} placeholder="例如：llava" />
              </label>
              <p>说明：接入后会新增一条 API 配置，保存设置后在生成时自动使用当前选中的配置。</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="ghost-button" onClick={() => setLocalModelOpen(false)}>取消</button>
              <button type="button" onClick={onConnectLocalModel}>确认接入</button>
            </div>
          </div>
        </div>
      )}

      {saveNotice && (
        <div className="save-toast" role="status">
          <strong>保存成功</strong>
          <span>{saveNotice.replace(/^保存成功：/, "")}</span>
        </div>
      )}

      <footer className="status-line">{status}</footer>
    </div>
  );
}
