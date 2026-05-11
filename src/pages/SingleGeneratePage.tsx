import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Modal, NumberInput, Select } from "@mantine/core";
import {
  buildGenerationParamControls,
  type ParamControl,
} from "./singleGenerateParamSchema";
import { SingleGenerateImageToImageSection } from "./SingleGenerateImageToImageSection";
import { SingleGeneratePromptField } from "./SingleGeneratePromptField";
import { SingleGenerateReferenceLibrarySection } from "./SingleGenerateReferenceLibrarySection";
import { SingleGenerateWorkspace } from "./SingleGenerateWorkspace";
import type { ApiProfile, PresetOption, SaveButtonState, Settings, GenerationResult } from "../types/app";

type HistoryItem = GenerationResult;
type OptionItem = PresetOption;

type Props = {
  settings: Settings;
  activeProfile?: ApiProfile;
  stylePresets: OptionItem[];
  contentTypes: OptionItem[];
  referencePreviewSrc: string;
  maskPreviewSrc: string;
  history: HistoryItem[];
  previewSrc: string | null;
  previewList: string[];
  generationBusy: boolean;
  saveButtonState: SaveButtonState;
  saveSize: string;
  customWidth: number;
  customHeight: number;
  logs: string[];
  elapsedSeconds: number;
  onSettingsChange: (next: Settings) => void;
  onApplyContentType: (value: string) => void;
  onApplyStylePreset: (value: string) => void;
  onChooseReferenceLibraryDir: () => Promise<void>;
  onPickReferenceFromLibrary: () => Promise<void>;
  onClearReferenceLibraryDir: () => Promise<void>;
  onChooseReferenceImage: () => Promise<void>;
  onChooseMaskImage: () => Promise<void>;
  onSavePrompt: (kind: "positive" | "negative") => Promise<void>;
  onDeletePrompt: (kind: "positive" | "negative", prompt: string) => Promise<void>;
  onChoosePrompt: (kind: "positive" | "negative", prompt: string) => Promise<void>;
  onApplyHistory: (item: HistoryItem) => void;
  onGenerate: () => Promise<void>;
  onSavePreview: () => Promise<void>;
  onPreviewSelect: (value: string) => void;
  onSaveSizeChange: (value: string) => void;
  onCustomWidthChange: (value: number) => void;
  onCustomHeightChange: (value: number) => void;
};

export function SingleGeneratePage(props: Props) {
  const { t } = useTranslation();
  const {
    settings,
    activeProfile,
    stylePresets,
    contentTypes,
    referencePreviewSrc,
    maskPreviewSrc,
    history,
    previewSrc,
    previewList,
    generationBusy,
    saveButtonState,
    saveSize,
    customWidth,
    customHeight,
    logs,
    elapsedSeconds,
  } = props;
  const [previewZoomOpen, setPreviewZoomOpen] = useState(false);
  const onSettingsChange = props.onSettingsChange;
  const isGemini = activeProfile?.provider === "gemini_native";
  const [previewZoomFullscreen, setPreviewZoomFullscreen] = useState(false);
  const [previewZoomScale, setPreviewZoomScale] = useState(1);
  const [previewImageSize, setPreviewImageSize] = useState({ width: 0, height: 0 });
  const [previewPan, setPreviewPan] = useState({ x: 0, y: 0 });
  const [previewDragStart, setPreviewDragStart] = useState<{
    pointerX: number;
    pointerY: number;
    panX: number;
    panY: number;
  } | null>(null);

  const changePreviewZoom = (delta: number) => {
    setPreviewZoomScale((current) => Math.min(4, Math.max(0.25, Math.round((current + delta) * 100) / 100)));
  };

  const resetPreviewZoom = () => {
    setPreviewZoomScale(1);
    setPreviewPan({ x: 0, y: 0 });
  };

  const fitPreviewZoom = () => {
    if (!previewImageSize.width || !previewImageSize.height) {
      setPreviewZoomScale(1);
      setPreviewPan({ x: 0, y: 0 });
      return;
    }

    const availableWidth = window.innerWidth * (previewZoomFullscreen ? 0.96 : 0.86);
    const availableHeight = window.innerHeight * (previewZoomFullscreen ? 0.82 : 0.68);
    const nextScale = Math.min(1, availableWidth / previewImageSize.width, availableHeight / previewImageSize.height);
    setPreviewZoomScale(Math.max(0.25, Math.round(nextScale * 100) / 100));
    setPreviewPan({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (!previewZoomOpen || !previewImageSize.width || !previewImageSize.height) return;
    fitPreviewZoom();
  }, [previewZoomOpen, previewImageSize.width, previewImageSize.height, previewZoomFullscreen]);

  const zoomedPreviewWidth = previewImageSize.width > 0 ? Math.round(previewImageSize.width * previewZoomScale) : 0;
  const zoomedPreviewHeight = previewImageSize.height > 0 ? Math.round(previewImageSize.height * previewZoomScale) : 0;
  const logsText = useMemo(() => logs.join("\n"), [logs]);
  const generationParamControls = useMemo<ParamControl[]>(
    () => buildGenerationParamControls({
      settings,
      isGemini,
      t,
      onSettingsChange,
    }),
    [isGemini, onSettingsChange, settings, t],
  );

  return (
    <>
      <main className="lab-layout">
        <aside className="lab-panel">
          <section className="panel-section">
              <div className="style-type-grid">
                <Select
                  label={t("single.contentType")}
                  value={settings.contentType}
                  data={contentTypes.map((type) => ({ value: type.id, label: type.labelKey ? t(type.labelKey) : type.name }))}
                  onChange={(value) => value && props.onApplyContentType(value)}
                />
                <Select
                  label={t("single.stylePreset")}
                  value={settings.stylePreset}
                  data={stylePresets.map((preset) => ({ value: preset.id, label: preset.labelKey ? t(preset.labelKey) : preset.name }))}
                  onChange={(value) => value && props.onApplyStylePreset(value)}
                />
              </div>
          </section>

          <SingleGenerateReferenceLibrarySection
            referenceLibraryDir={settings.referenceLibraryDir}
            noReferenceLibraryLabel={t("single.noReferenceLibrary")}
            referenceLibraryLabel={t("single.referenceLibrary")}
            chooseFolderLabel={t("settings.chooseFolder")}
            randomReferenceLabel={t("single.randomReference")}
            clearLibraryLabel={t("single.clearLibrary")}
            onChooseReferenceLibraryDir={props.onChooseReferenceLibraryDir}
            onPickReferenceFromLibrary={props.onPickReferenceFromLibrary}
            onClearReferenceLibraryDir={props.onClearReferenceLibraryDir}
          />

          <SingleGenerateImageToImageSection
            referenceImagePath={settings.referenceImagePath}
            maskImagePath={settings.maskImagePath}
            referencePreviewSrc={referencePreviewSrc}
            maskPreviewSrc={maskPreviewSrc}
            title={t("single.imageToImage")}
            referenceLabel={t("single.referenceImage")}
            referenceAlt={t("single.referenceImageAlt")}
            maskLabel={t("single.maskImage")}
            maskAlt={t("single.maskImageAlt")}
            selectedClickClearLabel={t("single.selectedClickClear")}
            clickToChooseLabel={t("single.clickToChoose")}
            onClearReferenceImage={() => onSettingsChange({ ...settings, referenceImagePath: "" })}
            onClearMaskImage={() => onSettingsChange({ ...settings, maskImagePath: "" })}
            onChooseReferenceImage={props.onChooseReferenceImage}
            onChooseMaskImage={props.onChooseMaskImage}
          />

          <section className="panel-section prompt-section">
            <SingleGeneratePromptField
              kind="positive"
              title={t("single.positivePrompt")}
              value={settings.positivePrompt}
              placeholder={t("single.positivePlaceholder")}
              minRows={7}
              library={settings.positivePromptLibrary}
              chooseHistoryLabel={t("single.chooseHistoryPrompt")}
              saveLabel={t("single.savePrompt")}
              deleteLabel={t("single.deletePrompt")}
              onChange={(value) => onSettingsChange({ ...settings, positivePrompt: value })}
              onChoosePrompt={props.onChoosePrompt}
              onSavePrompt={props.onSavePrompt}
              onDeletePrompt={props.onDeletePrompt}
            />
            <SingleGeneratePromptField
              kind="negative"
              title={t("single.negativePrompt")}
              value={settings.negativePrompt}
              placeholder={t("single.negativePlaceholder")}
              minRows={4}
              library={settings.negativePromptLibrary}
              chooseHistoryLabel={t("single.chooseHistoryPrompt")}
              saveLabel={t("single.savePrompt")}
              deleteLabel={t("single.deletePrompt")}
              onChange={(value) => onSettingsChange({ ...settings, negativePrompt: value })}
              onChoosePrompt={props.onChoosePrompt}
              onSavePrompt={props.onSavePrompt}
              onDeletePrompt={props.onDeletePrompt}
            />
            <div className="generation-params-grid">
              {generationParamControls.map((control) => {
                if (control.visible === false) return null;
                if (control.type === "select") {
                  return (
                    <Select
                      key={control.key}
                      label={control.label}
                      value={control.value}
                      data={control.data}
                      onChange={(value) => value && control.onChange(value)}
                      allowDeselect={false}
                    />
                  );
                }
                return (
                  <NumberInput
                    key={control.key}
                    label={control.label}
                    value={control.value}
                    min={control.min}
                    max={control.max}
                    allowDecimal={false}
                    onChange={(value) => control.onChange(control.clamp(value))}
                  />
                );
              })}
            </div>
          </section>
        </aside>

        <SingleGenerateWorkspace
          previewSrc={previewSrc}
          previewList={previewList}
          generationBusy={generationBusy}
          saveButtonState={saveButtonState}
          saveSize={saveSize}
          customWidth={customWidth}
          customHeight={customHeight}
          logsText={logsText}
          elapsedSeconds={elapsedSeconds}
          onGenerate={props.onGenerate}
          onSavePreview={props.onSavePreview}
          onPreviewSelect={props.onPreviewSelect}
          onSaveSizeChange={props.onSaveSizeChange}
          onCustomWidthChange={props.onCustomWidthChange}
          onCustomHeightChange={props.onCustomHeightChange}
          onPreviewOpen={() => {
            if (!previewSrc) return;
            resetPreviewZoom();
            setPreviewZoomOpen(true);
          }}
          t={t}
          history={history}
          onApplyHistory={props.onApplyHistory}
        />
      </main>
      <Modal
        opened={previewZoomOpen}
        onClose={() => {
          setPreviewZoomOpen(false);
          setPreviewZoomFullscreen(false);
        }}
        title={(
          <div className="preview-zoom-title">
            <span>{t("single.previewTitle")}</span>
            <div className="preview-zoom-controls">
              <Button type="button" className="mini-button" onClick={() => changePreviewZoom(-0.25)}>{t("single.zoomOut")}</Button>
              <span className="preview-zoom-percent">{Math.round(previewZoomScale * 100)}%</span>
              <Button type="button" className="mini-button" onClick={() => changePreviewZoom(0.25)}>{t("single.zoomIn")}</Button>
              <Button type="button" className="mini-button" onClick={resetPreviewZoom}>100%</Button>
              <Button type="button" className="mini-button" onClick={fitPreviewZoom}>{t("single.fitWindow")}</Button>
              <Button
                type="button"
                className="mini-button"
                onClick={() => setPreviewZoomFullscreen((current) => !current)}
              >
                {previewZoomFullscreen ? t("single.restoreWindow") : t("single.fullscreenWindow")}
              </Button>
            </div>
          </div>
        )}
        size={previewZoomFullscreen ? "100%" : "auto"}
        fullScreen={previewZoomFullscreen}
        centered={!previewZoomFullscreen}
        classNames={{
          content: previewZoomFullscreen ? "preview-zoom-modal preview-zoom-modal-fullscreen" : "preview-zoom-modal",
          body: "preview-zoom-body",
        }}
      >
        <div
          className={previewDragStart ? "preview-zoom-scroll dragging" : "preview-zoom-scroll"}
          onWheel={(event) => {
            event.preventDefault();
            changePreviewZoom(event.deltaY > 0 ? -0.1 : 0.1);
          }}
          onMouseDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            setPreviewDragStart({
              pointerX: event.clientX,
              pointerY: event.clientY,
              panX: previewPan.x,
              panY: previewPan.y,
            });
          }}
          onMouseMove={(event) => {
            if (!previewDragStart) return;
            event.preventDefault();
            setPreviewPan({
              x: previewDragStart.panX + event.clientX - previewDragStart.pointerX,
              y: previewDragStart.panY + event.clientY - previewDragStart.pointerY,
            });
          }}
          onMouseUp={() => setPreviewDragStart(null)}
          onMouseLeave={() => setPreviewDragStart(null)}
        >
          {previewSrc ? (
            <div
              className="preview-zoom-canvas"
              style={zoomedPreviewWidth > 0 && zoomedPreviewHeight > 0 ? {
                width: `${zoomedPreviewWidth}px`,
                height: `${zoomedPreviewHeight}px`,
                transform: `translate(${previewPan.x}px, ${previewPan.y}px)`,
              } : {
                transform: `translate(${previewPan.x}px, ${previewPan.y}px)`,
              }}
            >
              <img
                src={previewSrc}
                alt={t("single.previewAlt")}
                className="preview-zoom-image"
                draggable={false}
                onLoad={(event) => {
                  setPreviewImageSize({
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  });
                }}
              />
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}