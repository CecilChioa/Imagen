import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActionIcon, Button, Group, Tooltip } from "@mantine/core";
import qqGroupIcon from "../assets/quniconhigh.png";
import { invokeCommand } from "../lib/tauri";
import { BatchComposePage } from "../pages/BatchComposePage";
import { BatchConvertPage } from "../pages/BatchConvertPage";
import { BatchGeneratePage } from "../pages/BatchGeneratePage";
import { SettingsModal } from "../pages/SettingsModal";
import { SingleGeneratePage } from "../pages/SingleGeneratePage";
import type {
  AlphaMode,
  ApiProfile,
  ApiSignupProvider,
  BatchItem,
  BatchMode,
  BlpAlphaBits,
  BlpEncoding,
  BlpMipmapCount,
  ConvertFilter,
  ConvertTarget,
  GenerationResult,
  PngCompression,
  PngFilter,
  PresetOption,
  SaveButtonState,
  Settings,
  StatusMessage,
  TgaBits,
  ViewMode,
} from "../types/app";

type ShellBaseProps = {
  view: ViewMode;
  setView: (view: ViewMode) => void;
  saveNotice: string;
  status: StatusMessage | null;
};

type SettingsStateProps = {
  settings: Settings;
  setSettings: (settings: Settings) => void;
  draftSettings: Settings;
  setDraftSettings: (settings: Settings) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  editingProfileId: string;
  setEditingProfileId: (id: string) => void;
  editingProfile: ApiProfile | undefined;
  apiSignupOpen: boolean;
  releaseNotesOpen: boolean;
  aboutOpen: boolean;
  localModelOpen: boolean;
  setApiSignupOpen: (open: boolean) => void;
  setReleaseNotesOpen: (open: boolean) => void;
  setAboutOpen: (open: boolean) => void;
  setLocalModelOpen: (open: boolean) => void;
  localModelName: string;
  localModelBaseUrl: string;
  localModelId: string;
  setLocalModelName: (value: string) => void;
  setLocalModelBaseUrl: (value: string) => void;
  setLocalModelId: (value: string) => void;
};

type SingleViewProps = {
  activeProfile?: ApiProfile;
  stylePresets: PresetOption[];
  contentTypes: PresetOption[];
  referencePreviewSrc: string;
  maskPreviewSrc: string;
  history: GenerationResult[];
  previewSrc: string | null;
  previewList: string[];
  generationBusy: boolean;
  saveButtonState: SaveButtonState;
  saveSize: string;
  customWidth: number;
  customHeight: number;
  generateLogs: string[];
  elapsedSeconds: number;
  onSettingsChange: (settings: Settings) => void;
  onApplyContentType: (id: string) => void;
  onApplyStylePreset: (id: string) => void;
  onChooseReferenceLibraryDir: () => Promise<void>;
  onPickReferenceFromLibrary: () => Promise<void>;
  onClearReferenceLibraryDir: () => Promise<void>;
  onChooseReferenceImage: () => Promise<void>;
  onChooseMaskImage: () => Promise<void>;
  onSavePrompt: (kind: "positive" | "negative") => Promise<void>;
  onDeletePrompt: (kind: "positive" | "negative", prompt: string) => Promise<void>;
  onChoosePrompt: (kind: "positive" | "negative", prompt: string) => Promise<void>;
  onApplyHistory: (item: GenerationResult) => void;
  onGenerate: () => Promise<void>;
  onSavePreview: () => Promise<void>;
  onPreviewSelect: (value: string) => void;
  onSaveSizeChange: (value: string) => void;
  onCustomWidthChange: (value: number) => void;
  onCustomHeightChange: (value: number) => void;
};

type BatchViewProps = {
  batchPromptText: string;
  batchMode: BatchMode;
  batchConcurrency: number;
  batchItems: BatchItem[];
  onBatchPromptTextChange: (value: string) => void;
  onBatchModeChange: (value: BatchMode) => void;
  onBatchConcurrencyChange: (value: number) => void;
  onBatchGenerate: () => Promise<void>;
  onBatchItemApply: (item: BatchItem) => void;
};

type ConvertViewProps = {
  convertLogs: string[];
  convertBusy: boolean;
  composeLogs: string[];
  composeBusy: boolean;
  composeBaseDir: string;
  composeLowerOverlayPath: string;
  composeUpperOverlayPath: string;
  composeTargetDir: string;
  composeRecursive: boolean;
  composeKeepStructure: boolean;
  convertSourceDir: string;
  convertTargetDir: string;
  convertSourceFormats: string[];
  convertTargetFormat: ConvertTarget;
  convertRecursive: boolean;
  convertKeepStructure: boolean;
  convertTgaBits: TgaBits;
  convertTgaRle: boolean;
  convertBlpEncoding: BlpEncoding;
  convertBlpAlphaBits: BlpAlphaBits;
  convertBlpJpegQuality: number;
  convertBlpMipmapCount: BlpMipmapCount;
  convertBlpFilter: ConvertFilter;
  convertAlphaMode: AlphaMode;
  convertAlphaThreshold: number;
  convertPngCompression: PngCompression;
  convertPngFilter: PngFilter;
  onChooseConvertSourceDir: () => Promise<void>;
  onChooseConvertTargetDir: () => Promise<void>;
  onChooseComposeBaseDir: () => Promise<void>;
  onChooseComposeLowerOverlay: () => Promise<void>;
  onChooseComposeUpperOverlay: () => Promise<void>;
  onClearComposeLowerOverlay: () => void;
  onClearComposeUpperOverlay: () => void;
  onChooseComposeTargetDir: () => Promise<void>;
  onToggleSourceFormat: (ext: string) => void;
  onTargetFormatChange: (value: ConvertTarget) => void;
  onRecursiveChange: (value: boolean) => void;
  onKeepStructureChange: (value: boolean) => void;
  onTgaBitsChange: (value: TgaBits) => void;
  onTgaRleChange: (value: boolean) => void;
  onBlpEncodingChange: (value: BlpEncoding) => void;
  onBlpAlphaBitsChange: (value: BlpAlphaBits) => void;
  onBlpJpegQualityChange: (value: number) => void;
  onBlpMipmapCountChange: (value: BlpMipmapCount) => void;
  onBlpFilterChange: (value: ConvertFilter) => void;
  onAlphaModeChange: (value: AlphaMode) => void;
  onAlphaThresholdChange: (value: number) => void;
  onPngCompressionChange: (value: PngCompression) => void;
  onPngFilterChange: (value: PngFilter) => void;
  onComposeRecursiveChange: (value: boolean) => void;
  onComposeKeepStructureChange: (value: boolean) => void;
  onBatchConvert: () => Promise<void>;
  onBatchCompose: () => Promise<void>;
};

type SettingsActionProps = {
  onAddProfile: () => void;
  onUpdateEditingProfile: (patch: Partial<ApiProfile>) => void;
  onDeleteProfile: (id: string) => void;
  onChooseOutputDir: () => Promise<void>;
  onSaveAllSettings: () => Promise<void>;
  onOpenApiSignup: (provider: ApiSignupProvider) => Promise<void>;
  onConnectLocalModel: () => void;
};

type AppShellProps = ShellBaseProps &
  SettingsStateProps &
  SingleViewProps &
  BatchViewProps &
  ConvertViewProps &
  SettingsActionProps;

export function AppShell(props: AppShellProps) {
  const { t } = useTranslation();
  const translateStatus = (value: StatusMessage | null) => {
    if (!value) return "";
    if (value.key) return t(value.key, value.values);
    return value.raw ?? "";
  };
  const batchStatusLabel = (statusCode?: BatchItem["statusCode"], fallback = "") => {
    if (statusCode === "pending") return t("batch.pending");
    if (statusCode === "running") return t("batch.running");
    if (statusCode === "done") return t("batch.done");
    if (statusCode === "failed") return t("batch.failed");
    if (statusCode === "cancelled") return t("batch.cancelled");
    return fallback;
  };
  const singlePageProps = {
    settings: props.settings,
    activeProfile: props.activeProfile,
    stylePresets: props.stylePresets,
    contentTypes: props.contentTypes,
    referencePreviewSrc: props.referencePreviewSrc,
    maskPreviewSrc: props.maskPreviewSrc,
    history: props.history,
    previewSrc: props.previewSrc,
    previewList: props.previewList,
    generationBusy: props.generationBusy,
    saveButtonState: props.saveButtonState,
    saveSize: props.saveSize,
    customWidth: props.customWidth,
    customHeight: props.customHeight,
    logs: props.generateLogs,
    elapsedSeconds: props.elapsedSeconds,
    onSettingsChange: props.onSettingsChange,
    onApplyContentType: props.onApplyContentType,
    onApplyStylePreset: props.onApplyStylePreset,
    onChooseReferenceLibraryDir: props.onChooseReferenceLibraryDir,
    onPickReferenceFromLibrary: props.onPickReferenceFromLibrary,
    onClearReferenceLibraryDir: props.onClearReferenceLibraryDir,
    onChooseReferenceImage: props.onChooseReferenceImage,
    onChooseMaskImage: props.onChooseMaskImage,
    onSavePrompt: props.onSavePrompt,
    onDeletePrompt: props.onDeletePrompt,
    onChoosePrompt: props.onChoosePrompt,
    onApplyHistory: props.onApplyHistory,
    onGenerate: props.onGenerate,
    onSavePreview: props.onSavePreview,
    onPreviewSelect: props.onPreviewSelect,
    onSaveSizeChange: props.onSaveSizeChange,
    onCustomWidthChange: props.onCustomWidthChange,
    onCustomHeightChange: props.onCustomHeightChange,
  };

  const batchPageProps = {
    generationBusy: props.generationBusy,
    elapsedSeconds: props.elapsedSeconds,
    batchPromptText: props.batchPromptText,
    batchMode: props.batchMode,
    batchConcurrency: props.batchConcurrency,
    saveSize: props.saveSize,
    logs: props.generateLogs,
    batchItems: props.batchItems.map((item) => ({ ...item, status: batchStatusLabel(item.statusCode, item.status) })),
    onBatchPromptTextChange: props.onBatchPromptTextChange,
    onBatchModeChange: props.onBatchModeChange,
    onBatchConcurrencyChange: props.onBatchConcurrencyChange,
    onSaveSizeChange: props.onSaveSizeChange,
    onBatchGenerate: props.onBatchGenerate,
    onBatchItemApply: props.onBatchItemApply,
  };

  const convertPageProps = {
    convertBusy: props.convertBusy,
    convertSourceDir: props.convertSourceDir,
    convertTargetDir: props.convertTargetDir,
    convertSourceFormats: props.convertSourceFormats,
    convertTargetFormat: props.convertTargetFormat,
    convertRecursive: props.convertRecursive,
    convertKeepStructure: props.convertKeepStructure,
    convertTgaBits: props.convertTgaBits,
    convertTgaRle: props.convertTgaRle,
    convertBlpEncoding: props.convertBlpEncoding,
    convertBlpAlphaBits: props.convertBlpAlphaBits,
    convertBlpJpegQuality: props.convertBlpJpegQuality,
    convertBlpMipmapCount: props.convertBlpMipmapCount,
    convertBlpFilter: props.convertBlpFilter,
    convertAlphaMode: props.convertAlphaMode,
    convertAlphaThreshold: props.convertAlphaThreshold,
    convertPngCompression: props.convertPngCompression,
    convertPngFilter: props.convertPngFilter,
    logs: props.convertLogs,
    onChooseSourceDir: props.onChooseConvertSourceDir,
    onChooseTargetDir: props.onChooseConvertTargetDir,
    onToggleSourceFormat: props.onToggleSourceFormat,
    onTargetFormatChange: props.onTargetFormatChange,
    onRecursiveChange: props.onRecursiveChange,
    onKeepStructureChange: props.onKeepStructureChange,
    onTgaBitsChange: props.onTgaBitsChange,
    onTgaRleChange: props.onTgaRleChange,
    onBlpEncodingChange: props.onBlpEncodingChange,
    onBlpAlphaBitsChange: props.onBlpAlphaBitsChange,
    onBlpJpegQualityChange: props.onBlpJpegQualityChange,
    onBlpMipmapCountChange: props.onBlpMipmapCountChange,
    onBlpFilterChange: props.onBlpFilterChange,
    onAlphaModeChange: props.onAlphaModeChange,
    onAlphaThresholdChange: props.onAlphaThresholdChange,
    onPngCompressionChange: props.onPngCompressionChange,
    onPngFilterChange: props.onPngFilterChange,
    onBatchConvert: props.onBatchConvert,
  };

  const composePageProps = {
    composeBusy: props.composeBusy,
    composeBaseDir: props.composeBaseDir,
    composeLowerOverlayPath: props.composeLowerOverlayPath,
    composeUpperOverlayPath: props.composeUpperOverlayPath,
    composeTargetDir: props.composeTargetDir,
    composeRecursive: props.composeRecursive,
    composeKeepStructure: props.composeKeepStructure,
    composeLogs: props.composeLogs,
    onChooseBaseDir: props.onChooseComposeBaseDir,
    onChooseLowerOverlay: props.onChooseComposeLowerOverlay,
    onChooseUpperOverlay: props.onChooseComposeUpperOverlay,
    onClearLowerOverlay: props.onClearComposeLowerOverlay,
    onClearUpperOverlay: props.onClearComposeUpperOverlay,
    onChooseTargetDir: props.onChooseComposeTargetDir,
    onComposeRecursiveChange: props.onComposeRecursiveChange,
    onComposeKeepStructureChange: props.onComposeKeepStructureChange,
    onBatchCompose: props.onBatchCompose,
  };

  const settingsModalProps = {
    open: props.settingsOpen,
    draftSettings: props.draftSettings,
    editingProfileId: props.editingProfileId,
    editingProfile: props.editingProfile,
    localModelName: props.localModelName,
    localModelBaseUrl: props.localModelBaseUrl,
    localModelId: props.localModelId,
    apiSignupOpen: props.apiSignupOpen,
    releaseNotesOpen: props.releaseNotesOpen,
    aboutOpen: props.aboutOpen,
    localModelOpen: props.localModelOpen,
    onClose: () => props.setSettingsOpen(false),
    onSelectProfile: (id: string) => {
      props.setEditingProfileId(id);
      props.setDraftSettings({ ...props.draftSettings, activeApiProfileId: id });
    },
    onDraftSettingsChange: props.setDraftSettings,
    onAddProfile: props.onAddProfile,
    onUpdateEditingProfile: props.onUpdateEditingProfile,
    onDeleteProfile: props.onDeleteProfile,
    onChooseOutputDir: props.onChooseOutputDir,
    onSaveAllSettings: props.onSaveAllSettings,
    onSetApiSignupOpen: props.setApiSignupOpen,
    onSetReleaseNotesOpen: props.setReleaseNotesOpen,
    onSetAboutOpen: props.setAboutOpen,
    onSetLocalModelOpen: props.setLocalModelOpen,
    onOpenApiSignup: props.onOpenApiSignup,
    onLocalModelNameChange: props.setLocalModelName,
    onLocalModelBaseUrlChange: props.setLocalModelBaseUrl,
    onLocalModelIdChange: props.setLocalModelId,
    onConnectLocalModel: props.onConnectLocalModel,
  };

  const statusTone = useMemo(() => props.status?.tone ?? "info", [props.status]);

  const [statusToastVisible, setStatusToastVisible] = useState(Boolean(props.status));

  useEffect(() => {
    if (!props.status) {
      setStatusToastVisible(false);
      return undefined;
    }

    setStatusToastVisible(true);

    if (statusTone === "loading") {
      return undefined;
    }

    const timer = window.setTimeout(() => setStatusToastVisible(false), 3200);
    return () => window.clearTimeout(timer);
  }, [props.status, statusTone]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <Group className="topbar-actions" gap="xs" wrap="nowrap">
          <Tooltip label={t("topbar.openSettings")} position="bottom" withArrow>
            <ActionIcon
              aria-label={t("topbar.openSettings")}
              className="settings-action"
              size="lg"
              variant="light"
              onClick={() => props.setSettingsOpen(true)}
            >
              ⚙
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t("topbar.qqGroup")} position="bottom" withArrow>
            <ActionIcon
              aria-label={t("topbar.qqGroup")}
              className="qq-group-button"
              size="lg"
              variant="light"
              onClick={() => {
                invokeCommand("open_qq_group_url").catch((error) => console.error(error));
              }}
            >
              <img src={qqGroupIcon} alt={t("topbar.qqGroup")} />
            </ActionIcon>
          </Tooltip>
          <Button.Group className="view-switcher">
            <Button
              variant={props.view === "single" ? "filled" : "subtle"}
              onClick={() => props.setView("single")}
            >
              {t("topbar.single")}
            </Button>
            <Button
              variant={props.view === "batch" ? "filled" : "subtle"}
              onClick={() => props.setView("batch")}
            >
              {t("topbar.batch")}
            </Button>
            <Button
              variant={props.view === "convert" ? "filled" : "subtle"}
              onClick={() => props.setView("convert")}
            >
              {t("topbar.convert")}
            </Button>
            <Button
              variant={props.view === "compose" ? "filled" : "subtle"}
              onClick={() => props.setView("compose")}
            >
              {t("topbar.compose")}
            </Button>
          </Button.Group>
        </Group>
      </header>

      {props.view === "single" ? (
        <SingleGeneratePage {...singlePageProps} />
      ) : props.view === "batch" ? (
        <BatchGeneratePage {...batchPageProps} />
      ) : props.view === "convert" ? (
        <BatchConvertPage {...convertPageProps} />
      ) : (
        <BatchComposePage {...composePageProps} />
      )}

      <SettingsModal {...settingsModalProps} />

      {props.saveNotice && <div className="save-toast" role="status"><strong>{t("saveToast.title")}</strong><span>{props.saveNotice}</span></div>}
      {statusToastVisible && (
        <div className={`status-toast ${statusTone}`} role="status" aria-live="polite">
          <span className="status-toast-dot" />
          <span className="status-toast-text">{translateStatus(props.status)}</span>
        </div>
      )}
    </div>
  );
}
