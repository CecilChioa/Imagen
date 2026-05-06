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

  return (
    <div className="app-shell">
      <header className="topbar">
        <nav className="topbar-actions">
          <button className="icon-button" onClick={() => props.setSettingsOpen(true)} title="设置">⚙</button>
          <button className={props.view === "single" ? "topbar-button active" : "topbar-button"} onClick={() => props.setView("single")}>单图生成</button>
          <button className={props.view === "batch" ? "topbar-button active" : "topbar-button"} onClick={() => props.setView("batch")}>批量生成</button>
          <button className={props.view === "convert" ? "topbar-button active" : "topbar-button"} onClick={() => props.setView("convert")}>批量转换</button>
          <button className="qq-group-button" title="加入QQ群免费获取最新版本" onClick={() => invoke("open_qq_group_url")}><img src={qqGroupIcon} alt="加入QQ群免费获取最新版本" /></button>
        </nav>
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
      <footer className="status-line">{props.status}</footer>
    </div>
  );
}
