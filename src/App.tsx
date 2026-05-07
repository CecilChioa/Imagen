import { useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { AppShell } from "./components/AppShell";
import { contentTypes, stylePresets } from "./config/presets";
import { useConvertSettings } from "./hooks/useConvertSettings";
import { useGeneration } from "./hooks/useGeneration";
import { useSettingsPersistenceEffects } from "./hooks/useSettingsPersistenceEffects";
import { useProfilesAndPrompts } from "./hooks/useProfilesAndPrompts";
import type {
  BatchConvertResult,
  BatchItem,
  BatchMode,
  GenerationResult,
  SaveButtonState,
  Settings,
  ViewMode,
  ApiProfile,
} from "./types/app";
import "./styles.css";
const defaultApiProfile: ApiProfile = {
  id: "default",
  name: "PPtokens",
  apiKey: "",
  apiBaseUrl: "https://api.openai.com/v1",
  model: "gpt-image-2",
};

const defaultSettings: Settings = {
  schemaVersion: 1,
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
  convertSourceDir: "",
  convertTargetDir: "",
  convertSourceFormats: ["png"],
  convertTargetFormat: "blp",
  convertRecursive: true,
  convertKeepStructure: true,
  convertTgaBits: 32,
  convertTgaRle: true,
  convertBlpEncoding: "raw1",
  convertBlpAlphaBits: 8,
  convertBlpJpegAlpha: false,
  convertBlpMakeMipmaps: true,
  convertBlpFilter: "nearest",
  convertAlphaMode: "passthrough",
  convertAlphaThreshold: 128,
  convertPngCompression: "default",
  convertPngFilter: "adaptive",
};

const normalizeSettings = (raw: Partial<Settings>): Settings => {
  const profiles =
    raw.apiProfiles && raw.apiProfiles.length > 0
      ? raw.apiProfiles
      : [defaultApiProfile];

  const active =
    profiles.find((profile) => profile.id === raw.activeApiProfileId)?.id ??
    profiles[0].id;

  return {
    ...defaultSettings,
    ...raw,
    apiProfiles: profiles,
    activeApiProfileId: active,
    positivePromptLibrary: raw.positivePromptLibrary ?? [],
    negativePromptLibrary: raw.negativePromptLibrary ?? [],
    history: (raw.history ?? []).slice(0, 10),
  };
};

const createApiProfile = (): ApiProfile => ({
  ...defaultApiProfile,
  id: crypto.randomUUID(),
  name: "新 API",
});

const formatLog = (value: unknown) => JSON.stringify(value, null, 2);

const stripPresetPrompts = (source: string) => {
  const presetPrompts = [...contentTypes, ...stylePresets]
    .map((item) => item.prompt.trim())
    .filter(Boolean);

  return presetPrompts
    .reduce((current, prompt) => current.split(prompt).join(""), source)
    .split(/\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\s*,\s*,+/g, ", ")
    .replace(/^\s*,\s*|\s*,\s*$/g, "")
    .trim();
};

export default function App() {
  // UI 状态
  const [view, setView] = useState<ViewMode>("single");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiSignupOpen, setApiSignupOpen] = useState(false);
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [localModelOpen, setLocalModelOpen] = useState(false);

  // 配置与业务状态
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [draftSettings, setDraftSettings] = useState<Settings>(defaultSettings);
  const [editingProfileId, setEditingProfileId] = useState(defaultApiProfile.id);
  const [status, setStatus] = useState("就绪");

  const [generateLogs, setGenerateLogs] = useState<string[]>(["等待生成任务..."]);
  const [convertLogs, setConvertLogs] = useState<string[]>(["等待转换任务..."]);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [history, setHistory] = useState<GenerationResult[]>([]);

  const [generationBusy, setGenerationBusy] = useState(false);
  const [convertBusy, setConvertBusy] = useState(false);
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
  const {
    convertSourceDir,
    setConvertSourceDir,
    convertTargetDir,
    setConvertTargetDir,
    convertSourceFormats,
    convertTargetFormat,
    setConvertTargetFormat,
    convertRecursive,
    setConvertRecursive,
    convertKeepStructure,
    setConvertKeepStructure,
    convertTgaBits,
    setConvertTgaBits,
    convertTgaRle,
    setConvertTgaRle,
    convertBlpEncoding,
    setConvertBlpEncoding,
    convertBlpAlphaBits,
    setConvertBlpAlphaBits,
    convertBlpJpegAlpha,
    setConvertBlpJpegAlpha,
    convertBlpMakeMipmaps,
    setConvertBlpMakeMipmaps,
    convertBlpFilter,
    setConvertBlpFilter,
    convertAlphaMode,
    setConvertAlphaMode,
    convertAlphaThreshold,
    setConvertAlphaThreshold,
    convertPngCompression,
    setConvertPngCompression,
    convertPngFilter,
    setConvertPngFilter,
    applyConvertSettings,
    currentConvertSettings,
    toggleConvertSourceFormat,
  } = useConvertSettings(defaultSettings);
  const [localModelName, setLocalModelName] = useState("本地模型 - Ollama");
  const [localModelBaseUrl, setLocalModelBaseUrl] = useState("http://127.0.0.1:11434/v1");
  const [localModelId, setLocalModelId] = useState("llava");

  const activeProfile = useMemo(
    () =>
      settings.apiProfiles.find((profile) => profile.id === settings.activeApiProfileId) ??
      settings.apiProfiles[0],
    [settings],
  );

  const editingProfile = useMemo(
    () =>
      draftSettings.apiProfiles.find((profile) => profile.id === editingProfileId) ??
      draftSettings.apiProfiles[0],
    [draftSettings, editingProfileId],
  );

  const { persistSettings, persistSettingsDebounced } = useSettingsPersistenceEffects({
    settings,
    saveNotice,
    status,
    setSettings,
    setDraftSettings,
    setEditingProfileId,
    setHistory,
    setSettingsOpen,
    setSaveNotice,
    setStatus,
    setReferencePreviewSrc,
    setMaskPreviewSrc,
    applyConvertSettings,
    normalizeSettings,
  });

  useEffect(() => {
    if (!generationBusy || generationStartedAt == null) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - generationStartedAt) / 1000));
    }, 250);

    return () => window.clearInterval(timer);
  }, [generationBusy, generationStartedAt]);

  const getSaveDimensions = () => {
    if (saveSize === "original") {
      return { width: 0, height: 0 };
    }

    if (saveSize === "custom") {
      return { width: customWidth, height: customHeight };
    }

    const [width, height] = saveSize.split("x").map(Number);
    return { width, height };
  };

  const chooseDirectory = async (title: string) => {
    const selected = await open({
      directory: true,
      multiple: false,
      title,
    });

    return typeof selected === "string" ? selected : "";
  };

  const onChooseReferenceImage = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "tga", "bmp"] }],
      title: "选择参考图",
    });

    if (typeof selected === "string") {
      persistSettingsDebounced({
        ...settings,
        referenceImagePath: selected,
      });
    }
  };

  const onChooseMaskImage = async () => {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "tga", "bmp"] }],
      title: "选择蒙版图",
    });

    if (typeof selected === "string") {
      persistSettingsDebounced({
        ...settings,
        maskImagePath: selected,
      });
    }
  };

  const onChooseReferenceLibraryDir = async () => {
    const dir = await chooseDirectory("选择参考图库文件夹");
    if (!dir) return;

    persistSettingsDebounced({
      ...settings,
      referenceLibraryDir: dir,
    });
  };

  const { onGenerate, onBatchGenerate, pickReferenceFromLibrary } = useGeneration({
    settings,
    activeProfile,
    batchPromptText,
    batchMode,
    batchConcurrency,
    generationBusy,
    setGenerationBusy,
    setGenerationStartedAt,
    setElapsedSeconds,
    setGenerateLogs,
    setStatus,
    setSettingsOpen,
    setSettings,
    setBatchItems,
    setPreviewSrc,
    setSaveButtonState,
    setHistory,
    persistSettings,
    getSaveDimensions,
  });

  const {
    savePromptToLibrary,
    choosePromptFromLibrary,
    deletePromptFromLibrary,
    addProfile,
    updateEditingProfile,
    deleteProfile,
    onChooseOutputDir,
    onSaveAllSettings,
    onOpenApiSignup,
    onConnectLocalModel,
  } = useProfilesAndPrompts({
    settings,
    draftSettings,
    editingProfileId,
    localModelName,
    localModelBaseUrl,
    localModelId,
    createApiProfile,
    normalizeSettings,
    setDraftSettings,
    setEditingProfileId,
    setSettingsOpen,
    setLocalModelOpen,
    setStatus,
    persistSettings,
  });

  const onSavePreview = async () => {
    if (!previewSrc) return;

    const { width, height } = getSaveDimensions();
    setSaveButtonState("saving");

    try {
      const path = await invoke<string>("save_generated_image", {
        request: { settings, dataUrl: previewSrc, width, height },
      });

      setSaveButtonState("saved");
      setSaveNotice(`保存成功：${path}`);
      setGenerateLogs((current) => [...current, path]);
      setStatus("保存完成");

      window.setTimeout(() => {
        setSaveButtonState((state) => (state === "saved" ? "resave" : state));
      }, 900);
    } catch (error) {
      setSaveButtonState("resave");
      setStatus(String(error));
    }
  };

  const applyStylePreset = (id: string) => {
    setSettings({
      ...settings,
      stylePreset: id,
    });
  };

  const applyContentType = (id: string) => {
    setSettings({
    ...settings,
      contentType: id,
    });
  };

  const onBatchConvert = async () => {
    if (convertBusy) return;

    if (!convertSourceDir.trim() || !convertTargetDir.trim() || convertSourceFormats.length === 0) {
      setStatus("请完善转换参数");
      return;
    }

    const nextSettings = currentConvertSettings(settings);
    await persistSettings(nextSettings);

    setConvertBusy(true);
    setConvertLogs([
      "开始批量转换...",
      formatLog({
        sourceDir: convertSourceDir,
        targetDir: convertTargetDir,
        sourceFormats: convertSourceFormats,
        targetFormat: convertTargetFormat,
        tgaBits: convertTgaBits,
        tgaRle: convertTgaRle,
        blpEncoding: convertBlpEncoding,
        blpAlphaBits: convertBlpAlphaBits,
        blpJpegAlpha: convertBlpJpegAlpha,
        blpMakeMipmaps: convertBlpMakeMipmaps,
        blpFilter: convertBlpFilter,
        alphaMode: convertAlphaMode,
        alphaThreshold: convertAlphaThreshold,
        pngCompression: convertPngCompression,
        pngFilter: convertPngFilter,
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
          blpEncoding: convertBlpEncoding,
          blpAlphaBits: convertBlpAlphaBits,
          blpJpegAlpha: convertBlpJpegAlpha,
          blpMakeMipmaps: convertBlpMakeMipmaps,
          blpFilter: convertBlpFilter,
          alphaMode: convertAlphaMode,
          alphaThreshold: convertAlphaThreshold,
          tgaBits: convertTgaBits,
          tgaRle: convertTgaRle,
          pngCompression: convertPngCompression,
          pngFilter: convertPngFilter,
        },
      });

      setConvertLogs((current) => [
        ...current,
        `完成：成功 ${result.converted} / 失败 ${result.failed}`,
        ...result.errors.slice(0, 100),
      ]);
    } catch (error) {
      setConvertLogs((current) => [...current, `失败：${String(error)}`]);
      setStatus(String(error));
    } finally {
      setConvertBusy(false);
    }
  };
  const onPickReferenceFromLibrary = async () => {
    const next = await pickReferenceFromLibrary(settings);
    await persistSettings(next);
    setStatus("已随机抽取参考图");
  };

  const onClearReferenceLibraryDir = async () => {
    await persistSettings({ ...settings, referenceLibraryDir: "" });
  };

  const onApplyHistory = (item: GenerationResult) => {
    const request = (item.request as Record<string, unknown>) ?? {};

    setSettings((current) => ({
      ...current,
      positivePrompt:
        typeof request.positive_prompt === "string"
          ? stripPresetPrompts(request.positive_prompt)
          : stripPresetPrompts(item.prompt),
      negativePrompt:
        typeof request.negative_prompt === "string"
          ? request.negative_prompt
          : "",
    }));
  };

  const onBatchItemApply = (item: BatchItem) => {
    setView("single");
    setSettings((current) => ({
      ...current,
      positivePrompt: item.prompt,
      negativePrompt: item.negativePrompt,
    }));
  };

  const onChooseConvertSourceDir = async () => {
    const dir = await chooseDirectory("选择源文件夹");
    if (!dir) return;

    setConvertSourceDir(dir);
    await persistSettings({
      ...currentConvertSettings(settings),
      convertSourceDir: dir,
    });
  };

  const onChooseConvertTargetDir = async () => {
    const dir = await chooseDirectory("选择目标文件夹");
    if (!dir) return;

    setConvertTargetDir(dir);
    await persistSettings({
      ...currentConvertSettings(settings),
      convertTargetDir: dir,
    });
  };

  const singlePageProps = {
    settings,
    stylePresets,
    contentTypes,
    referencePreviewSrc,
    maskPreviewSrc,
    history,
    previewSrc,
    generationBusy,
    saveButtonState,
    saveSize,
    customWidth,
    customHeight,
    logs: generateLogs,
    elapsedSeconds,
    onSettingsChange: setSettings,
    onApplyContentType: applyContentType,
    onApplyStylePreset: applyStylePreset,
    onChooseReferenceLibraryDir,
    onPickReferenceFromLibrary,
    onClearReferenceLibraryDir,
    onChooseReferenceImage,
    onChooseMaskImage,
    onSavePrompt: savePromptToLibrary,
    onDeletePrompt: deletePromptFromLibrary,
    onChoosePrompt: choosePromptFromLibrary,
    onApplyHistory,
    onGenerate,
    onSavePreview,
    onSaveSizeChange: setSaveSize,
    onCustomWidthChange: setCustomWidth,
    onCustomHeightChange: setCustomHeight,
  };

  const batchPageProps = {
    generationBusy,
    elapsedSeconds,
    batchPromptText,
    batchMode,
    batchConcurrency,
    saveSize,
    logs: generateLogs,
    batchItems,
    onBatchPromptTextChange: setBatchPromptText,
    onBatchModeChange: setBatchMode,
    onBatchConcurrencyChange: setBatchConcurrency,
    onSaveSizeChange: setSaveSize,
    onBatchGenerate,
    onBatchItemApply,
  };

  const convertPageProps = {
    convertBusy,
    convertSourceDir,
    convertTargetDir,
    convertSourceFormats,
    convertTargetFormat,
    convertRecursive,
    convertKeepStructure,
    convertTgaBits,
    convertTgaRle,
    convertBlpEncoding,
    convertBlpAlphaBits,
    convertBlpJpegAlpha,
    convertBlpMakeMipmaps,
    convertBlpFilter,
    convertAlphaMode,
    convertAlphaThreshold,
    convertPngCompression,
    convertPngFilter,
    logs: convertLogs,
    onChooseSourceDir: onChooseConvertSourceDir,
    onChooseTargetDir: onChooseConvertTargetDir,
    onToggleSourceFormat: toggleConvertSourceFormat,
    onTargetFormatChange: setConvertTargetFormat,
    onRecursiveChange: setConvertRecursive,
    onKeepStructureChange: setConvertKeepStructure,
    onTgaBitsChange: setConvertTgaBits,
    onTgaRleChange: setConvertTgaRle,
    onBlpEncodingChange: setConvertBlpEncoding,
    onBlpAlphaBitsChange: setConvertBlpAlphaBits,
    onBlpJpegAlphaChange: setConvertBlpJpegAlpha,
    onBlpMakeMipmapsChange: setConvertBlpMakeMipmaps,
    onBlpFilterChange: setConvertBlpFilter,
    onAlphaModeChange: setConvertAlphaMode,
    onAlphaThresholdChange: setConvertAlphaThreshold,
    onPngCompressionChange: setConvertPngCompression,
    onPngFilterChange: setConvertPngFilter,
    onBatchConvert,
  };

  const shellBaseProps = {
    view,
    setView,
    settings,
    setSettings,
    draftSettings,
    setDraftSettings,
    editingProfileId,
    setEditingProfileId,
    editingProfile,
    saveNotice,
    status,
  };

  const settingsPanelProps = {
    settingsOpen,
    setSettingsOpen,
    apiSignupOpen,
    releaseNotesOpen,
    aboutOpen,
    localModelOpen,
    setApiSignupOpen,
    setReleaseNotesOpen,
    setAboutOpen,
    setLocalModelOpen,
    localModelName,
    localModelBaseUrl,
    localModelId,
    setLocalModelName,
    setLocalModelBaseUrl,
    setLocalModelId,
    onAddProfile: addProfile,
    onUpdateEditingProfile: updateEditingProfile,
    onDeleteProfile: deleteProfile,
    onChooseOutputDir,
    onSaveAllSettings,
    onOpenApiSignup,
    onConnectLocalModel,
  };

  const appShellProps = {
    ...shellBaseProps,
    ...settingsPanelProps,
    ...singlePageProps,
    ...batchPageProps,
    ...convertPageProps,
    generateLogs,
    convertLogs,
    onChooseConvertSourceDir,
    onChooseConvertTargetDir,
  } satisfies ComponentProps<typeof AppShell>;

  return <AppShell {...appShellProps} />;
}
