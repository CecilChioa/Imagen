import { useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { AppShell } from "./components/AppShell";
import { initI18n } from "./i18n";
import { appendBoundedLogs, CONVERT_LOG_LIMIT, GENERATE_LOG_LIMIT, resetBoundedLogs } from "./config/generation";
import { contentTypes, stylePresets } from "./config/presets";
import { createApiProfile, defaultApiProfile, defaultSettings, normalizeSettings } from "./config/settings";
import { useBatchCompose } from "./hooks/useBatchCompose";
import { useConvertSettings } from "./hooks/useConvertSettings";
import { useGeneration } from "./hooks/useGeneration";
import { useSettingsPersistenceEffects } from "./hooks/useSettingsPersistenceEffects";
import { useProfilesAndPrompts } from "./hooks/useProfilesAndPrompts";
import { chooseDirectory, chooseImageFile } from "./lib/filePickers";
import { invokeCommand } from "./lib/tauri";
import type {
  BatchConvertResult,
  BatchItem,
  BatchMode,
  GenerationResult,
  SaveButtonState,
  Settings,
  ViewMode,
  BlpEncoding,
} from "./types/app";
import "./styles.css";
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

//app
export default function App() {
  const { t } = useTranslation();
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
  const [status, setStatus] = useState("");

  const [generateLogs, setGenerateLogs] = useState<string[]>([]);
  const [convertLogs, setConvertLogs] = useState<string[]>([]);
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
  const onBlpEncodingChange = (value: BlpEncoding) => {
    setConvertBlpEncoding(value);
  };
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
    convertBlpJpegQuality,
    setConvertBlpJpegQuality,
    convertBlpMipmapCount,
    setConvertBlpMipmapCount,
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
  const [localModelName, setLocalModelName] = useState("Ollama");
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

  const {
    composeLogs,
    composeBusy,
    composeBaseDir,
    composeLowerOverlayPath,
    composeUpperOverlayPath,
    composeTargetDir,
    composeRecursive,
    composeKeepStructure,
    setComposeRecursive,
    setComposeKeepStructure,
    onChooseComposeBaseDir,
    onChooseComposeLowerOverlay,
    onChooseComposeUpperOverlay,
    onClearComposeLowerOverlay,
    onClearComposeUpperOverlay,
    onChooseComposeTargetDir,
    onBatchCompose,
  } = useBatchCompose({
    settings,
    persistSettings,
    setStatus,
  });

  useEffect(() => {
    initI18n(settings.language);
  }, [settings.language]);

  useEffect(() => {
    if (!generationBusy || generationStartedAt == null) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - generationStartedAt) / 1000));
    }, 1000);

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

  const onChooseReferenceImage = async () => {
    const selected = await chooseImageFile(t("single.referenceImage"));

    if (typeof selected === "string") {
      persistSettingsDebounced({
        ...settings,
        referenceImagePath: selected,
      });
    }
  };

  const onChooseMaskImage = async () => {
    const selected = await chooseImageFile(t("single.maskImage"));

    if (typeof selected === "string") {
      persistSettingsDebounced({
        ...settings,
        maskImagePath: selected,
      });
    }
  };

  const onChooseReferenceLibraryDir = async () => {
    const dir = await chooseDirectory(t("single.referenceLibrary"));
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
      const path = await invokeCommand<string>("save_generated_image", {
        request: { settings, dataUrl: previewSrc, width, height },
      });

      setSaveButtonState("saved");
      setSaveNotice(path);
      setGenerateLogs((current) => appendBoundedLogs(current, path, GENERATE_LOG_LIMIT));
      setStatus("status.saveCompleted");

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
      setStatus("status.convertParamsRequired");
      return;
    }

    const nextSettings = currentConvertSettings(settings);
    await persistSettings(nextSettings);

    setConvertBusy(true);
    setConvertLogs(() =>
      resetBoundedLogs(
        [
          `batch_convert:start`,
          formatLog({
            sourceDir: convertSourceDir,
            targetDir: convertTargetDir,
            sourceFormats: convertSourceFormats,
            targetFormat: convertTargetFormat,
            tgaBits: convertTgaBits,
            tgaRle: convertTgaRle,
            blpEncoding: convertBlpEncoding,
            blpAlphaBits: convertBlpAlphaBits,
            blpJpegAlpha: true,
            blpJpegQuality: convertBlpJpegQuality,
            blpMipmapCount: convertBlpMipmapCount,
            blpFilter: convertBlpFilter,
            alphaMode: convertAlphaMode,
            alphaThreshold: convertAlphaThreshold,
            pngCompression: convertPngCompression,
            pngFilter: convertPngFilter,
          }),
        ],
        CONVERT_LOG_LIMIT,
      ),
    );

    try {
      const result = await invokeCommand<BatchConvertResult>("batch_convert_images", {
        request: {
          sourceDir: convertSourceDir,
          targetDir: convertTargetDir,
          sourceFormats: convertSourceFormats,
          targetFormat: convertTargetFormat,
          recursive: convertRecursive,
          keepStructure: convertKeepStructure,
          blpEncoding: convertBlpEncoding,
          blpAlphaBits: convertBlpAlphaBits,
          blpJpegAlpha: true,
          blpJpegQuality: convertBlpJpegQuality,
          blpMipmapCount: convertBlpMipmapCount,
          blpFilter: convertBlpFilter,
          alphaMode: convertAlphaMode,
          alphaThreshold: convertAlphaThreshold,
          tgaBits: convertTgaBits,
          tgaRle: convertTgaRle,
          pngCompression: convertPngCompression,
          pngFilter: convertPngFilter,
        },
      });

      setConvertLogs((current) =>
        appendBoundedLogs(
          current,
          [`batch_convert:done converted=${result.converted} failed=${result.failed}`, ...result.errors.slice(0, 100)],
          CONVERT_LOG_LIMIT,
        ),
      );
    } catch (error) {
      setConvertLogs((current) => appendBoundedLogs(current, `error:${String(error)}`, CONVERT_LOG_LIMIT));
      setStatus(String(error));
    } finally {
      setConvertBusy(false);
    }
  };
  const onPickReferenceFromLibrary = async () => {
    const next = await pickReferenceFromLibrary(settings);
    await persistSettings(next);
    setStatus("status.referencePicked");
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
    const dir = await chooseDirectory(t("convert.sourceDir"));
    if (!dir) return;

    setConvertSourceDir(dir);
    await persistSettings({
      ...currentConvertSettings(settings),
      convertSourceDir: dir,
    });
  };

  const onChooseConvertTargetDir = async () => {
    const dir = await chooseDirectory(t("convert.targetDir"));
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
    onSettingsChange: persistSettingsDebounced,
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
    convertBlpJpegQuality,
    convertBlpMipmapCount,
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
    onBlpEncodingChange,
    onBlpAlphaBitsChange: setConvertBlpAlphaBits,
    onBlpJpegQualityChange: setConvertBlpJpegQuality,
    onBlpMipmapCountChange: setConvertBlpMipmapCount,
    onBlpFilterChange: setConvertBlpFilter,
    onAlphaModeChange: setConvertAlphaMode,
    onAlphaThresholdChange: setConvertAlphaThreshold,
    onPngCompressionChange: setConvertPngCompression,
    onPngFilterChange: setConvertPngFilter,
    onBatchConvert,
  };

  const composePageProps = {
    composeBusy,
    composeBaseDir,
    composeLowerOverlayPath,
    composeUpperOverlayPath,
    composeTargetDir,
    composeRecursive,
    composeKeepStructure,
    composeLogs,
    onChooseBaseDir: onChooseComposeBaseDir,
    onChooseLowerOverlay: onChooseComposeLowerOverlay,
    onChooseUpperOverlay: onChooseComposeUpperOverlay,
    onClearLowerOverlay: onClearComposeLowerOverlay,
    onClearUpperOverlay: onClearComposeUpperOverlay,
    onChooseTargetDir: onChooseComposeTargetDir,
    onComposeRecursiveChange: setComposeRecursive,
    onComposeKeepStructureChange: setComposeKeepStructure,
    onBatchCompose,
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
    ...composePageProps,
    generateLogs,
    convertLogs,
    composeLogs,
    onChooseConvertSourceDir,
    onChooseConvertTargetDir,
    onChooseComposeBaseDir,
    onChooseComposeLowerOverlay,
    onChooseComposeUpperOverlay,
    onClearComposeLowerOverlay,
    onClearComposeUpperOverlay,
    onChooseComposeTargetDir,
  } satisfies ComponentProps<typeof AppShell>;

  return <AppShell {...appShellProps} />;
}
