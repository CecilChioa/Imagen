import { useEffect, useState } from "react";
import { Button, Modal, NumberInput, Select, TextInput, Textarea } from "@mantine/core";
import type { PresetOption, SaveButtonState, Settings, GenerationResult } from "../types/app";

type HistoryItem = GenerationResult;
type OptionItem = PresetOption;

type Props = {
  settings: Settings;
  stylePresets: OptionItem[];
  contentTypes: OptionItem[];
  referencePreviewSrc: string;
  maskPreviewSrc: string;
  history: HistoryItem[];
  previewSrc: string | null;
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
  onSaveSizeChange: (value: string) => void;
  onCustomWidthChange: (value: number) => void;
  onCustomHeightChange: (value: number) => void;
};

export function SingleGeneratePage(props: Props) {
  const {
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
    logs,
    elapsedSeconds,
  } = props;
  const [previewZoomOpen, setPreviewZoomOpen] = useState(false);
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

  return (
    <>
      <main className="lab-layout">
        <aside className="lab-panel">
        <section className="panel-section">
          <div className="style-library-card">
            <div className="style-type-grid">
              <Select
                label="生成方向"
                value={settings.contentType}
                data={contentTypes.map((type) => ({ value: type.id, label: type.name }))}
                onChange={(value) => value && props.onApplyContentType(value)}
              />
              <Select
                label="风格预设"
                value={settings.stylePreset}
                data={stylePresets.map((preset) => ({ value: preset.id, label: preset.name }))}
                onChange={(value) => value && props.onApplyStylePreset(value)}
              />
            </div>
            <div className="path-picker path-picker-mantine">
              <TextInput
                label="参考图库"
                value={settings.referenceLibraryDir || "未选择参考图库文件夹"}
                readOnly
              />
              <Button type="button" className="ghost-button" onClick={props.onChooseReferenceLibraryDir}>选择文件夹</Button>
            </div>
            <div className="style-library-actions">
              <Button type="button" className="ghost-button" disabled={!settings.referenceLibraryDir} onClick={props.onPickReferenceFromLibrary}>
                随机参考图
              </Button>
              <Button type="button" className="ghost-button" disabled={!settings.referenceLibraryDir} onClick={props.onClearReferenceLibraryDir}>
                清除图库
              </Button>
            </div>
          </div>
        </section>

        <section className="panel-section">
          <h2>图生图（可选）</h2>
          <div className="image-picker-grid">
            <button className={settings.referenceImagePath ? "thumb-box selected" : "thumb-box"} onClick={() => (settings.referenceImagePath ? props.onSettingsChange({ ...settings, referenceImagePath: "" }) : props.onChooseReferenceImage())}>
              {referencePreviewSrc ? <img src={referencePreviewSrc} alt="参考图预览" /> : null}
              <span>参考图</span>
              <small>{settings.referenceImagePath ? "已选择，点击清除" : "点击选择"}</small>
            </button>
            <button className={settings.maskImagePath ? "thumb-box selected" : "thumb-box"} onClick={() => (settings.maskImagePath ? props.onSettingsChange({ ...settings, maskImagePath: "" }) : props.onChooseMaskImage())}>
              {maskPreviewSrc ? <img src={maskPreviewSrc} alt="蒙版预览" /> : null}
              <span>蒙版</span>
              <small>{settings.maskImagePath ? "已选择，点击清除" : "点击选择"}</small>
            </button>
          </div>
        </section>

        <section className="panel-section prompt-section">
          <div className="prompt-field">
            <div className="prompt-toolbar">
              <span>正向提示词</span>
              <div className="prompt-library-actions">
                <Select
                  value={settings.positivePromptLibrary.includes(settings.positivePrompt) ? settings.positivePrompt : null}
                  data={[
                    { value: "", label: "选择历史提示词" },
                    ...settings.positivePromptLibrary.map((prompt: string) => ({ value: prompt, label: prompt.slice(0, 48) })),
                  ]}
                  onChange={(value) => props.onChoosePrompt("positive", value ?? "")}
                  placeholder="选择历史提示词"
                />
                <Button type="button" className="mini-button" onClick={() => props.onSavePrompt("positive")}>保存</Button>
                <Button type="button" className="mini-button danger-mini" disabled={!settings.positivePromptLibrary.includes(settings.positivePrompt)} onClick={() => props.onDeletePrompt("positive", settings.positivePrompt)}>删除</Button>
              </div>
            </div>
            <Textarea
              minRows={7}
              value={settings.positivePrompt}
              placeholder="正向提示词的描述"
              onChange={(e) => props.onSettingsChange({ ...settings, positivePrompt: e.target.value })}
            />
          </div>
          <div className="prompt-field">
            <div className="prompt-toolbar">
              <span>负向提示词</span>
              <div className="prompt-library-actions">
                <Select
                  value={settings.negativePromptLibrary.includes(settings.negativePrompt) ? settings.negativePrompt : null}
                  data={[
                    { value: "", label: "选择历史提示词" },
                    ...settings.negativePromptLibrary.map((prompt: string) => ({ value: prompt, label: prompt.slice(0, 48) })),
                  ]}
                  onChange={(value) => props.onChoosePrompt("negative", value ?? "")}
                  placeholder="选择历史提示词"
                />
                <Button type="button" className="mini-button" onClick={() => props.onSavePrompt("negative")}>保存</Button>
                <Button type="button" className="mini-button danger-mini" disabled={!settings.negativePromptLibrary.includes(settings.negativePrompt)} onClick={() => props.onDeletePrompt("negative", settings.negativePrompt)}>删除</Button>
              </div>
            </div>
            <Textarea
              minRows={4}
              value={settings.negativePrompt}
              placeholder="不希望出现的元素、风格或缺陷..."
              onChange={(e) => props.onSettingsChange({ ...settings, negativePrompt: e.target.value })}
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
          title={previewSrc ? "点击查看原图" : undefined}
        >
          {previewSrc ? (
            <span className="preview-stage-frame">
              <img src={previewSrc} alt="生成结果预览" />
            </span>
          ) : <span>等待生成结果...</span>}
        </button>
        <div className="operation-row">
          <div className="bottom-actions">
            <Button className={generationBusy ? "stop-action" : "primary-action"} onClick={props.onGenerate}>
              {generationBusy ? "停止生成" : previewSrc ? "重新生成" : "生成图片"}
            </Button>
            <Button className={saveButtonState === "saved" ? "save-action saved" : "save-action"} disabled={!previewSrc || saveButtonState === "saving"} onClick={props.onSavePreview}>
              {saveButtonState === "saving" ? "保存中..." : saveButtonState === "saved" ? "保存成功" : saveButtonState === "resave" ? "再次保存" : "保存图片"}
            </Button>
          </div>
          <div className="save-size-control">
            <Select
              value={saveSize}
              onChange={(value) => value && props.onSaveSizeChange(value)}
              data={[
                { value: "original", label: "原始尺寸" },
                { value: "64x64", label: "64x64" },
                { value: "128x128", label: "128x128" },
                { value: "256x256", label: "256x256" },
                { value: "512x512", label: "512x512" },
                { value: "custom", label: "自定义" },
              ]}
              allowDeselect={false}
            />
          </div>
        </div>
        {saveSize === "custom" && (
          <div className="custom-size-row">
            <span>保存尺寸</span>
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
          <div className={generationBusy ? "timer-pill active" : "timer-pill"}>生成耗时: {elapsedSeconds}s</div>
          <pre>{logs.join("\n")}</pre>
        </section>
        <section className="history-workspace">
          {history.length === 0 ? (
            <div className="history-empty">暂无历史记录</div>
          ) : history.slice(0, 10).map((item) => (
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
            <span>原图预览</span>
            <div className="preview-zoom-controls">
              <Button type="button" className="mini-button" onClick={() => changePreviewZoom(-0.25)}>缩小</Button>
              <span className="preview-zoom-percent">{Math.round(previewZoomScale * 100)}%</span>
              <Button type="button" className="mini-button" onClick={() => changePreviewZoom(0.25)}>放大</Button>
              <Button type="button" className="mini-button" onClick={resetPreviewZoom}>100%</Button>
              <Button type="button" className="mini-button" onClick={fitPreviewZoom}>适配窗口</Button>
              <Button
                type="button"
                className="mini-button"
                onClick={() => setPreviewZoomFullscreen((current) => !current)}
              >
                {previewZoomFullscreen ? "还原窗口" : "窗口全屏"}
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
                alt="生成结果原图"
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

