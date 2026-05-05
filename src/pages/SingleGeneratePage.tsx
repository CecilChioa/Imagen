type HistoryItem = {
  id: string;
  createdAt: string;
  prompt: string;
  status: string;
  request: unknown;
};

type OptionItem = {
  id: string;
  name: string;
  prompt: string;
};

type SaveButtonState = "idle" | "saving" | "saved" | "resave";

type Props = {
  settings: any;
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
  onSettingsChange: (next: any) => void;
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

  return (
    <main className="lab-layout">
      <aside className="lab-panel">
        <section className="panel-section">
          <div className="style-library-card">
            <div className="style-type-grid">
              <label>生成方向
                <select value={settings.contentType} onChange={(e) => props.onApplyContentType(e.target.value)}>
                  {contentTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
              </label>
              <label>风格预设
                <select value={settings.stylePreset} onChange={(e) => props.onApplyStylePreset(e.target.value)}>
                  {stylePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                </select>
              </label>
            </div>
            <label>
              参考图库
              <div className="path-picker">
                <input value={settings.referenceLibraryDir || "未选择参考图库文件夹"} readOnly />
                <button type="button" className="ghost-button" onClick={props.onChooseReferenceLibraryDir}>选择文件夹</button>
              </div>
            </label>
            <div className="style-library-actions">
              <button type="button" className="ghost-button" disabled={!settings.referenceLibraryDir} onClick={props.onPickReferenceFromLibrary}>
                随机参考图
              </button>
              <button type="button" className="ghost-button" disabled={!settings.referenceLibraryDir} onClick={props.onClearReferenceLibraryDir}>
                清除图库
              </button>
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
                <select value={settings.positivePromptLibrary.includes(settings.positivePrompt) ? settings.positivePrompt : ""} onChange={(e) => props.onChoosePrompt("positive", e.target.value)}>
                  <option value="">选择历史提示词</option>
                  {settings.positivePromptLibrary.map((prompt: string) => <option key={prompt} value={prompt}>{prompt.slice(0, 48)}</option>)}
                </select>
                <button type="button" className="mini-button" onClick={() => props.onSavePrompt("positive")}>保存</button>
                <button type="button" className="mini-button danger-mini" disabled={!settings.positivePromptLibrary.includes(settings.positivePrompt)} onClick={() => props.onDeletePrompt("positive", settings.positivePrompt)}>删除</button>
              </div>
            </div>
            <textarea rows={7} value={settings.positivePrompt} placeholder="正向提示词的描述" onChange={(e) => props.onSettingsChange({ ...settings, positivePrompt: e.target.value })} />
          </div>
          <div className="prompt-field">
            <div className="prompt-toolbar">
              <span>负向提示词</span>
              <div className="prompt-library-actions">
                <select value={settings.negativePromptLibrary.includes(settings.negativePrompt) ? settings.negativePrompt : ""} onChange={(e) => props.onChoosePrompt("negative", e.target.value)}>
                  <option value="">选择历史提示词</option>
                  {settings.negativePromptLibrary.map((prompt: string) => <option key={prompt} value={prompt}>{prompt.slice(0, 48)}</option>)}
                </select>
                <button type="button" className="mini-button" onClick={() => props.onSavePrompt("negative")}>保存</button>
                <button type="button" className="mini-button danger-mini" disabled={!settings.negativePromptLibrary.includes(settings.negativePrompt)} onClick={() => props.onDeletePrompt("negative", settings.negativePrompt)}>删除</button>
              </div>
            </div>
            <textarea rows={4} value={settings.negativePrompt} placeholder="不希望出现的元素、风格或缺陷..." onChange={(e) => props.onSettingsChange({ ...settings, negativePrompt: e.target.value })} />
          </div>
        </section>

        <section className="history">
          {history.slice(0, 10).map((item) => (
            <button key={item.id} className="history-item" onClick={() => props.onApplyHistory(item)} title={item.prompt}>
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
            <button className={generationBusy ? "stop-action" : "primary-action"} onClick={props.onGenerate}>
              {generationBusy ? "停止生成" : previewSrc ? "重新生成" : "生成图片"}
            </button>
            <button className={saveButtonState === "saved" ? "save-action saved" : "save-action"} disabled={!previewSrc || saveButtonState === "saving"} onClick={props.onSavePreview}>
              {saveButtonState === "saving" ? "保存中..." : saveButtonState === "saved" ? "保存成功" : saveButtonState === "resave" ? "再次保存" : "保存图片"}
            </button>
          </div>
          <div className="save-size-control">
            <select value={saveSize} onChange={(e) => props.onSaveSizeChange(e.target.value)}>
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
              <input type="number" min={1} value={customWidth} onChange={(e) => props.onCustomWidthChange(Number(e.target.value))} />
              <span>x</span>
              <input type="number" min={1} value={customHeight} onChange={(e) => props.onCustomHeightChange(Number(e.target.value))} />
            </div>
          </div>
        )}
        <section className="log-panel">
          <div className={generationBusy ? "timer-pill active" : "timer-pill"}>生成耗时: {elapsedSeconds}s</div>
          <pre>{logs.join("\n")}</pre>
        </section>
      </section>
    </main>
  );
}

