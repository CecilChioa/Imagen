import { invoke } from "@tauri-apps/api/core";
import qqGroupIcon from "../assets/quniconhigh.png";
import { BatchConvertPage } from "../pages/BatchConvertPage";
import { BatchGeneratePage } from "../pages/BatchGeneratePage";
import { SettingsModal } from "../pages/SettingsModal";
import { SingleGeneratePage } from "../pages/SingleGeneratePage";

type ViewMode = "single" | "batch" | "convert";
type BatchMode = "queue" | "concurrent";
type ConvertTarget = "png" | "tga" | "blp";
type TgaBits = 16 | 24 | 32;
type BlpEncoding = "raw1" | "jpeg";
type BlpAlphaBits = 0 | 1 | 4 | 8;
type ConvertFilter = "nearest" | "triangle" | "catmullrom" | "gaussian" | "lanczos3";
type AlphaMode = "passthrough" | "threshold" | "unpremultiply";
type PngCompression = "default" | "fast" | "best";
type PngFilter = "adaptive" | "none" | "sub" | "up" | "avg" | "paeth";
type SaveButtonState = "idle" | "saving" | "saved" | "resave";

type AppShellProps = {
  view: ViewMode;
  setView: (view: ViewMode) => void;
  settings: any;
  setSettings: (settings: any) => void;
  draftSettings: any;
  setDraftSettings: (settings: any) => void;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  editingProfileId: string;
  setEditingProfileId: (id: string) => void;
  editingProfile: any;
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
  stylePresets: any[];
  contentTypes: any[];
  referencePreviewSrc: string;
  maskPreviewSrc: string;
  history: any[];
  previewSrc: string | null;
  generationBusy: boolean;
  saveButtonState: SaveButtonState;
  saveSize: string;
  customWidth: number;
  customHeight: number;
  generateLogs: string[];
  convertLogs: string[];
  elapsedSeconds: number;
  saveNotice: string;
  status: string;
  batchPromptText: string;
  batchMode: BatchMode;
  batchConcurrency: number;
  batchItems: any[];
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
  onSettingsChange: (settings: any) => void;
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
  onApplyHistory: (item: any) => void;
  onGenerate: () => Promise<void>;
  onSavePreview: () => Promise<void>;
  onSaveSizeChange: (value: string) => void;
  onCustomWidthChange: (value: number) => void;
  onCustomHeightChange: (value: number) => void;
  onBatchPromptTextChange: (value: string) => void;
  onBatchModeChange: (value: BatchMode) => void;
  onBatchConcurrencyChange: (value: number) => void;
  onBatchGenerate: () => Promise<void>;
  onBatchItemApply: (item: any) => void;
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
  onAddProfile: () => void;
  onUpdateEditingProfile: (patch: any) => void;
  onDeleteProfile: (id: string) => void;
  onChooseOutputDir: () => Promise<void>;
  onSaveAllSettings: () => Promise<void>;
  onOpenApiSignup: (provider: "pptokens" | "aifast" | "yunwu") => Promise<void>;
  onConnectLocalModel: () => void;
};

export function AppShell(props: AppShellProps) {
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
        <SingleGeneratePage
          settings={props.settings} stylePresets={props.stylePresets} contentTypes={props.contentTypes}
          referencePreviewSrc={props.referencePreviewSrc} maskPreviewSrc={props.maskPreviewSrc} history={props.history as any}
          previewSrc={props.previewSrc} generationBusy={props.generationBusy} saveButtonState={props.saveButtonState}
          saveSize={props.saveSize} customWidth={props.customWidth} customHeight={props.customHeight} logs={props.generateLogs} elapsedSeconds={props.elapsedSeconds}
          onSettingsChange={props.onSettingsChange} onApplyContentType={props.onApplyContentType} onApplyStylePreset={props.onApplyStylePreset}
          onChooseReferenceLibraryDir={props.onChooseReferenceLibraryDir}
          onPickReferenceFromLibrary={props.onPickReferenceFromLibrary}
          onClearReferenceLibraryDir={props.onClearReferenceLibraryDir}
          onChooseReferenceImage={props.onChooseReferenceImage} onChooseMaskImage={props.onChooseMaskImage}
          onSavePrompt={props.onSavePrompt} onDeletePrompt={props.onDeletePrompt} onChoosePrompt={props.onChoosePrompt}
          onApplyHistory={props.onApplyHistory}
          onGenerate={props.onGenerate} onSavePreview={props.onSavePreview} onSaveSizeChange={props.onSaveSizeChange}
          onCustomWidthChange={props.onCustomWidthChange} onCustomHeightChange={props.onCustomHeightChange}
        />
      ) : props.view === "batch" ? (
        <BatchGeneratePage
          generationBusy={props.generationBusy} elapsedSeconds={props.elapsedSeconds}
          batchPromptText={props.batchPromptText} batchMode={props.batchMode} batchConcurrency={props.batchConcurrency}
          saveSize={props.saveSize} logs={props.generateLogs} batchItems={props.batchItems as any}
          onBatchPromptTextChange={props.onBatchPromptTextChange} onBatchModeChange={props.onBatchModeChange}
          onBatchConcurrencyChange={props.onBatchConcurrencyChange} onSaveSizeChange={props.onSaveSizeChange}
          onBatchGenerate={props.onBatchGenerate}
          onBatchItemApply={props.onBatchItemApply}
        />
      ) : (
        <BatchConvertPage
          convertBusy={props.convertBusy} convertSourceDir={props.convertSourceDir} convertTargetDir={props.convertTargetDir}
          convertSourceFormats={props.convertSourceFormats} convertTargetFormat={props.convertTargetFormat} convertRecursive={props.convertRecursive}
          convertKeepStructure={props.convertKeepStructure} convertTgaBits={props.convertTgaBits} convertTgaRle={props.convertTgaRle} logs={props.convertLogs}
          convertBlpEncoding={props.convertBlpEncoding}
          convertBlpAlphaBits={props.convertBlpAlphaBits}
          convertBlpJpegAlpha={props.convertBlpJpegAlpha}
          convertBlpMakeMipmaps={props.convertBlpMakeMipmaps}
          convertBlpFilter={props.convertBlpFilter}
          convertAlphaMode={props.convertAlphaMode}
          convertAlphaThreshold={props.convertAlphaThreshold}
          convertPngCompression={props.convertPngCompression}
          convertPngFilter={props.convertPngFilter}
          onChooseSourceDir={props.onChooseConvertSourceDir}
          onChooseTargetDir={props.onChooseConvertTargetDir}
          onToggleSourceFormat={props.onToggleSourceFormat} onTargetFormatChange={props.onTargetFormatChange}
          onRecursiveChange={props.onRecursiveChange} onKeepStructureChange={props.onKeepStructureChange}
          onTgaBitsChange={props.onTgaBitsChange} onTgaRleChange={props.onTgaRleChange}
          onBlpEncodingChange={props.onBlpEncodingChange}
          onBlpAlphaBitsChange={props.onBlpAlphaBitsChange}
          onBlpJpegAlphaChange={props.onBlpJpegAlphaChange}
          onBlpMakeMipmapsChange={props.onBlpMakeMipmapsChange}
          onBlpFilterChange={props.onBlpFilterChange}
          onAlphaModeChange={props.onAlphaModeChange}
          onAlphaThresholdChange={props.onAlphaThresholdChange}
          onPngCompressionChange={props.onPngCompressionChange}
          onPngFilterChange={props.onPngFilterChange}
          onBatchConvert={props.onBatchConvert}
        />
      )}

      <SettingsModal
        open={props.settingsOpen} draftSettings={props.draftSettings as any} editingProfileId={props.editingProfileId}
        editingProfile={props.editingProfile as any} localModelName={props.localModelName} localModelBaseUrl={props.localModelBaseUrl}
        localModelId={props.localModelId} apiSignupOpen={props.apiSignupOpen} releaseNotesOpen={props.releaseNotesOpen}
        aboutOpen={props.aboutOpen} localModelOpen={props.localModelOpen} onClose={() => props.setSettingsOpen(false)}
        onSelectProfile={(id) => { props.setEditingProfileId(id); props.setDraftSettings({ ...props.draftSettings, activeApiProfileId: id }); }}
        onDraftSettingsChange={props.setDraftSettings as any} onAddProfile={props.onAddProfile} onUpdateEditingProfile={props.onUpdateEditingProfile}
        onDeleteProfile={props.onDeleteProfile} onChooseOutputDir={props.onChooseOutputDir} onSaveAllSettings={props.onSaveAllSettings}
        onSetApiSignupOpen={props.setApiSignupOpen} onSetReleaseNotesOpen={props.setReleaseNotesOpen} onSetAboutOpen={props.setAboutOpen}
        onSetLocalModelOpen={props.setLocalModelOpen} onOpenApiSignup={props.onOpenApiSignup}
        onLocalModelNameChange={props.setLocalModelName} onLocalModelBaseUrlChange={props.setLocalModelBaseUrl}
        onLocalModelIdChange={props.setLocalModelId} onConnectLocalModel={props.onConnectLocalModel}
      />

      {props.saveNotice && <div className="save-toast" role="status"><strong>淇濆瓨鎴愬姛</strong><span>{props.saveNotice.replace(/^淇濆瓨鎴愬姛锛?/, "")}</span></div>}
      <footer className="status-line">{props.status}</footer>
    </div>
  );
}
