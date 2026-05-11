import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Modal, NumberInput, Select, TextInput, Textarea } from "@mantine/core";
import { HISTORY_LIMIT } from "../config/generation";
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
  const multiPreviewItems = useMemo(() => previewList.slice(0, 4), [previewList]);

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
              <div className="path-picker path-picker-mantine">
                <TextInput
                  label={t("single.referenceLibrary")}
                  value={settings.referenceLibraryDir || t("single.noReferenceLibrary")}
                  readOnly
                />
                <Button type="button" className="ghost-button" onClick={props.onChooseReferenceLibraryDir}>{t("settings.chooseFolder")}</Button>
              </div>
              <div className="style-library-actions">
                <Button type="button" className="ghost-button" disabled={!settings.referenceLibraryDir} onClick={props.onPickReferenceFromLibrary}>
                  {t("single.randomReference")}
                </Button>
                <Button type="button" className="ghost-button" disabled={!settings.referenceLibraryDir} onClick={props.onClearReferenceLibraryDir}>
                  {t("single.clearLibrary")}
                </Button>
              </div>
          </section>

          <section className="panel-section image-to-image-section">
            <div className="panel-subtitle">{t("single.imageToImage")}</div>
            <div className="image-picker-grid">
              <button className={settings.referenceImagePath ? "thumb-box selected" : "thumb-box"} onClick={() => (settings.referenceImagePath ? props.onSettingsChange({ ...settings, referenceImagePath: "" }) : props.onChooseReferenceImage())}>
                {referencePreviewSrc ? <img src={referencePreviewSrc} alt={t("single.referenceImageAlt")} /> : null}
                <span>{t("single.referenceImage")}</span>
                <small>{settings.referenceImagePath ? t("single.selectedClickClear") : t("single.clickToChoose")}</small>
              </button>
              <button className={settings.maskImagePath ? "thumb-box selected" : "thumb-box"} onClick={() => (settings.maskImagePath ? props.onSettingsChange({ ...settings, maskImagePath: "" }) : props.onChooseMaskImage())}>
                {maskPreviewSrc ? <img src={maskPreviewSrc} alt={t("single.maskImageAlt")} /> : null}
                <span>{t("single.maskImage")}</span>
                <small>{settings.maskImagePath ? t("single.selectedClickClear") : t("single.clickToChoose")}</small>
              </button>
            </div>
          </section>

          <section className="panel-section prompt-section">
            <div className="prompt-field">
              <div className="prompt-toolbar">
                <span>{t("single.positivePrompt")}</span>
                <div className="prompt-library-actions">
                  <Select
                    value={settings.positivePromptLibrary.includes(settings.positivePrompt) ? settings.positivePrompt : null}
                    data={[
                      { value: "", label: t("single.chooseHistoryPrompt") },
                      ...settings.positivePromptLibrary.map((prompt: string) => ({ value: prompt, label: prompt.slice(0, 48) })),
                    ]}
                    onChange={(value) => props.onChoosePrompt("positive", value ?? "")}
                    placeholder={t("single.chooseHistoryPrompt")}
                  />
                  <Button type="button" className="mini-button" onClick={() => props.onSavePrompt("positive")}>{t("single.savePrompt")}</Button>
                  <Button type="button" className="mini-button danger-mini" disabled={!settings.positivePromptLibrary.includes(settings.positivePrompt)} onClick={() => props.onDeletePrompt("positive", settings.positivePrompt)}>{t("single.deletePrompt")}</Button>
                </div>
              </div>
              <Textarea
                minRows={7}
                value={settings.positivePrompt}
                placeholder={t("single.positivePlaceholder")}
                onChange={(e) => props.onSettingsChange({ ...settings, positivePrompt: e.target.value })}
              />
            </div>
            <div className="prompt-field">
              <div className="prompt-toolbar">
                <span>{t("single.negativePrompt")}</span>
                <div className="prompt-library-actions">
                  <Select
                    value={settings.negativePromptLibrary.includes(settings.negativePrompt) ? settings.negativePrompt : null}
                    data={[
                      { value: "", label: t("single.chooseHistoryPrompt") },
                      ...settings.negativePromptLibrary.map((prompt: string) => ({ value: prompt, label: prompt.slice(0, 48) })),
                    ]}
                    onChange={(value) => props.onChoosePrompt("negative", value ?? "")}
                    placeholder={t("single.chooseHistoryPrompt")}
                  />
                  <Button type="button" className="mini-button" onClick={() => props.onSavePrompt("negative")}>{t("single.savePrompt")}</Button>
                  <Button type="button" className="mini-button danger-mini" disabled={!settings.negativePromptLibrary.includes(settings.negativePrompt)} onClick={() => props.onDeletePrompt("negative", settings.negativePrompt)}>{t("single.deletePrompt")}</Button>
                </div>
              </div>
              <Textarea
                minRows={4}
                value={settings.negativePrompt}
                placeholder={t("single.negativePlaceholder")}
                onChange={(e) => props.onSettingsChange({ ...settings, negativePrompt: e.target.value })}
              />
            </div>
            <div className="generation-params-grid">
              <Select
                label={t("single.size")}
                value={settings.size}
                data={[
                  { value: "1024x1024", label: "1024x1024" },
                  { value: "1536x1024", label: "1536x1024" },
                  { value: "1024x1536", label: "1024x1536" },
                  { value: "auto", label: "auto" },
                ]}
                onChange={(value) => value && props.onSettingsChange({ ...settings, size: value })}
                allowDeselect={false}
              />
              <Select
                label={t("single.quality")}
                value={settings.quality}
                data={[
                  { value: "auto", label: "auto" },
                  { value: "low", label: "low" },
                  { value: "medium", label: "medium" },
                  { value: "high", label: "high" },
                ]}
                onChange={(value) => value && props.onSettingsChange({ ...settings, quality: value })}
                allowDeselect={false}
              />
              <Select
                label={t("single.outputFormat")}
                value={settings.outputFormat}
                data={isGemini
                  ? [
                      { value: "png", label: "png" },
                      { value: "jpeg", label: "jpeg" },
                      { value: "webp", label: "webp" },
                    ]
                  : [
                      { value: "png", label: "png" },
                      { value: "jpeg", label: "jpeg" },
                      { value: "webp", label: "webp" },
                    ]}
                onChange={(value) => value && props.onSettingsChange({ ...settings, outputFormat: value })}
                allowDeselect={false}
              />
              {!isGemini && (
                <NumberInput
                  label={t("single.outputCompression")}
                  value={settings.outputCompression}
                  min={0}
                  max={100}
                  allowDecimal={false}
                  onChange={(value) => props.onSettingsChange({ ...settings, outputCompression: Math.max(0, Math.min(100, Number(value) || 0)) })}
                />
              )}
              <Select
                label={t("single.moderation")}
                value={settings.moderation}
                data={[
                  { value: "auto", label: "auto" },
                  { value: "low", label: "low" },
                ]}
                onChange={(value) => value && props.onSettingsChange({ ...settings, moderation: value as Settings["moderation"] })}
                allowDeselect={false}
              />
              {!isGemini && (
                <Select
                  label={t("single.background")}
                  value={settings.background}
                  data={[
                    { value: "auto", label: t("single.backgroundAuto") },
                    { value: "transparent", label: t("single.backgroundTransparent") },
                    { value: "opaque", label: t("single.backgroundOpaque") },
                  ]}
                  onChange={(value) => value && props.onSettingsChange({ ...settings, background: value as Settings["background"] })}
                  allowDeselect={false}
                />
              )}
              <NumberInput
                label={t("single.timeoutSec")}
                value={settings.timeoutSec}
                min={10}
                max={1200}
                allowDecimal={false}
                onChange={(value) => props.onSettingsChange({ ...settings, timeoutSec: Math.max(10, Number(value) || 10) })}
              />
              <NumberInput
                label={t("single.imageCount")}
                value={settings.n}
                min={1}
                max={4}
                allowDecimal={false}
                onChange={(value) => props.onSettingsChange({ ...settings, n: Math.max(1, Math.min(4, Number(value) || 1)) })}
              />
            </div>
          </section>
        </aside>

        <section className="lab-workspace">
          <button
            className={previewSrc ? "preview-stage has-image" : "preview-stage"}
            disabled={!previewSrc}
            onClick={() => {
              if (!previewSrc) return;
              resetPreviewZoom();
              setPreviewZoomOpen(true);
            }}
            title={previewSrc ? t("single.previewTitle") : undefined}
          >
            {previewSrc ? (
              <span className="preview-stage-frame">
                <img src={previewSrc} alt={t("single.previewAlt")} />
              </span>
            ) : <span>{t("single.previewPlaceholder")}</span>}
          </button>
          {multiPreviewItems.length > 1 && (
            <div className="preview-strip" role="list" aria-label={t("single.previewList")}>
              {multiPreviewItems.map((item, index) => (
                <button
                  key={`${item.slice(0, 48)}-${index}`}
                  type="button"
                  className={item === previewSrc ? "preview-strip-item active" : "preview-strip-item"}
                  onClick={() => props.onPreviewSelect(item)}
                  title={`${t("single.previewAlt")} #${index + 1}`}
                >
                  <img src={item} alt={`${t("single.previewAlt")} #${index + 1}`} />
                </button>
              ))}
            </div>
          )}
          <div className="operation-row">
            <div className="bottom-actions">
              <Button className={generationBusy ? "stop-action" : "primary-action"} onClick={props.onGenerate}>
                {generationBusy ? t("single.stopGenerate") : t("single.generate")}
              </Button>
              <Button className={saveButtonState === "saved" ? "save-action saved" : "save-action"} disabled={!previewSrc || saveButtonState === "saving"} onClick={props.onSavePreview}>
                {saveButtonState === "saving" ? t("single.saving") : saveButtonState === "saved" ? t("single.saveSuccess") : saveButtonState === "resave" ? t("single.saveAgain") : t("single.saveImage")}
              </Button>
            </div>
            <div className="save-size-control">
              <Select
                value={saveSize}
                onChange={(value) => value && props.onSaveSizeChange(value)}
                data={[
                  { value: "original", label: t("single.originalSize") },
                  { value: "64x64", label: "64x64" },
                  { value: "128x128", label: "128x128" },
                  { value: "256x256", label: "256x256" },
                  { value: "512x512", label: "512x512" },
                  { value: "custom", label: t("single.custom") },
                ]}
                allowDeselect={false}
              />
            </div>
          </div>
          {saveSize === "custom" && (
            <div className="custom-size-row">
              <span>{t("single.saveSize")}</span>
              <div className="custom-size">
                <NumberInput
                  min={1}
                  value={customWidth}
                  onChange={(value) => props.onCustomWidthChange(Number(value) || 1)}
                  allowDecimal={false}
                />
                <span>x</span>
                <NumberInput
                  min={1}
                  value={customHeight}
                  onChange={(value) => props.onCustomHeightChange(Number(value) || 1)}
                  allowDecimal={false}
                />
              </div>
            </div>
          )}
          <section className="log-panel">
            <div className={generationBusy ? "timer-pill active" : "timer-pill"}>{t("batch.elapsed", { seconds: elapsedSeconds })}</div>
            <pre>{logsText}</pre>
          </section>
          <section className="history-workspace">
            {history.length === 0 ? (
              <div className="history-empty">-</div>
            ) : history.slice(0, HISTORY_LIMIT).map((item) => (
              <button key={item.id} className="history-item" onClick={() => props.onApplyHistory(item)} title={item.prompt}>
                <span>{item.createdAt}</span>
                <strong>{item.prompt.replace(/\s+/g, " ").slice(0, 80)}</strong>
                <em>{item.status}</em>
              </button>
            ))}
          </section>
        </section>
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