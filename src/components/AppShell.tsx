import { useEffect, useMemo, useState } from "react";
import { ActionIcon, Badge, Button, Group, Tooltip } from "@mantine/core";
import { invoke } from "@tauri-apps/api/core";
import qqGroupIcon from "../assets/quniconhigh.png";
import { BatchConvertPage } from "../pages/BatchConvertPage";
import { BatchGeneratePage } from "../pages/BatchGeneratePage";
import { SettingsModal } from "../pages/SettingsModal";
import { SingleGeneratePage } from "../pages/SingleGeneratePage";
import type {
  AlphaMode,
  ApiProfile,
  BatchItem,
  BatchMode,
  BlpAlphaBits,
  BlpEncoding,
  ConvertFilter,
  ConvertTarget,
  GenerationResult,
  PngCompression,
  PngFilter,
  PresetOption,
  SaveButtonState,
  Settings,
  TgaBits,
  ViewMode,
} from "../types/app";

type ShellBaseProps = {
  view: ViewMode;
  setView: (view: ViewMode) => void;
  saveNotice: string;
  status: string;
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
  stylePresets: PresetOption[];
  contentTypes: PresetOption[];
  referencePreviewSrc: string;
  maskPreviewSrc: string;
  history: GenerationResult[];
  previewSrc: string | null;
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
  convertBlpJpegAlpha: boolean;
  convertBlpMakeMipmaps: boolean;
  convertBlpFilter: ConvertFilter;
  convertAlphaMode: AlphaMode;
  convertAlphaThreshold: number;
  convertPngCompression: PngCompression;
  convertPngFilter: PngFilter;
  onChooseConvertSourceDir: () => Promise<void>;
  onChooseConvertTargetDir: () => Promise<void>;
  onToggleSourceFormat: (ext: string) => void;
  onTargetFormatChange: (value: ConvertTarget) => void;
  onRecursiveChange: (value: boolean) => void;
  onKeepStructureChange: (value: boolean) => void;
  onTgaBitsChange: (value: TgaBits) => void;
  onTgaRleChange: (value: boolean) => void;
  onBlpEncodingChange: (value: BlpEncoding) => void;
  onBlpAlphaBitsChange: (value: BlpAlphaBits) => void;
  onBlpJpegAlphaChange: (value: boolean) => void;
  onBlpMakeMipmapsChange: (value: boolean) => void;
  onBlpFilterChange: (value: ConvertFilter) => void;
  onAlphaModeChange: (value: AlphaMode) => void;
  onAlphaThresholdChange: (value: number) => void;
  onPngCompressionChange: (value: PngCompression) => void;
  onPngFilterChange: (value: PngFilter) => void;
  onBatchConvert: () => Promise<void>;
};

type SettingsActionProps = {
  onAddProfile: () => void;
  onUpdateEditingProfile: (patch: Partial<ApiProfile>) => void;
  onDeleteProfile: (id: string) => void;
  onChooseOutputDir: () => Promise<void>;
  onSaveAllSettings: () => Promise<void>;
  onOpenApiSignup: (provider: "pptokens" | "aifast" | "yunwu") => Promise<void>;
  onConnectLocalModel: () => void;
};

type AppShellProps = ShellBaseProps &
  SettingsStateProps &
  SingleViewProps &
  BatchViewProps &
  ConvertViewProps &
  SettingsActionProps;

export function AppShell(props: AppShellProps) {
  const singlePageProps = {
    settings: props.settings,
    stylePresets: props.stylePresets,
    contentTypes: props.contentTypes,
    referencePreviewSrc: props.referencePreviewSrc,
    maskPreviewSrc: props.maskPreviewSrc,
    history: props.history,
    previewSrc: props.previewSrc,
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
    batchItems: props.batchItems,
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
    convertBlpJpegAlpha: props.convertBlpJpegAlpha,
    convertBlpMakeMipmaps: props.convertBlpMakeMipmaps,
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
    onBlpJpegAlphaChange: props.onBlpJpegAlphaChange,
    onBlpMakeMipmapsChange: props.onBlpMakeMipmapsChange,
    onBlpFilterChange: props.onBlpFilterChange,
    onAlphaModeChange: props.onAlphaModeChange,
    onAlphaThresholdChange: props.onAlphaThresholdChange,
    onPngCompressionChange: props.onPngCompressionChange,
    onPngFilterChange: props.onPngFilterChange,
    onBatchConvert: props.onBatchConvert,
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

  const statusTone = useMemo(() => {
    if (/失败|错误|中止|停止/.test(props.status)) return "warning";
    if (/成功|完成|已保存/.test(props.status)) return "success";
    if (/生成中|转换中|处理中|保存中/.test(props.status)) return "loading";
    return "info";
  }, [props.status]);

  const [statusToastVisible, setStatusToastVisible] = useState(Boolean(props.status && props.status !== "就绪"));

  useEffect(() => {
    if (!props.status || props.status === "就绪") {
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
          <Tooltip label="打开设置" position="bottom" withArrow>
            <ActionIcon
              aria-label="设置"
              className="settings-action"
              size="lg"
              variant="light"
              onClick={() => props.setSettingsOpen(true)}
            >
              ⚙
            </ActionIcon>
          </Tooltip>
          <Button.Group className="view-switcher">
            <Button
              variant={props.view === "single" ? "filled" : "subtle"}
              onClick={() => props.setView("single")}
            >
              单图生成
            </Button>
            <Button
              variant={props.view === "batch" ? "filled" : "subtle"}
              onClick={() => props.setView("batch")}
            >
              批量生成
            </Button>
            <Button
              variant={props.view === "convert" ? "filled" : "subtle"}
              onClick={() => props.setView("convert")}
            >
              批量转换
            </Button>
          </Button.Group>
          <Badge className="status-badge" variant="light" color="gray">
            {props.status}
          </Badge>
          <Tooltip label="加入QQ群免费获取最新版本" position="bottom" withArrow>
            <ActionIcon
              aria-label="加入QQ群免费获取最新版本"
              className="qq-group-button"
              size="lg"
              variant="light"
              onClick={() => invoke("open_qq_group_url")}
            >
              <img src={qqGroupIcon} alt="加入QQ群免费获取最新版本" />
            </ActionIcon>
          </Tooltip>
        </Group>
      </header>

      {props.view === "single" ? (
        <SingleGeneratePage {...singlePageProps} />
      ) : props.view === "batch" ? (
        <BatchGeneratePage {...batchPageProps} />
      ) : (
        <BatchConvertPage {...convertPageProps} />
      )}

      <SettingsModal {...settingsModalProps} />

      {props.saveNotice && <div className="save-toast" role="status"><strong>保存成功</strong><span>{props.saveNotice.replace(/^保存成功：?/, "")}</span></div>}
      {statusToastVisible && (
        <div className={`status-toast ${statusTone}`} role="status" aria-live="polite">
          <span className="status-toast-dot" />
          <span className="status-toast-text">{props.status}</span>
        </div>
      )}
    </div>
  );
}
