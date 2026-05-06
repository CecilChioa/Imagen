import type { BatchItem, BatchMode } from "../types/app";

type Props = {
  generationBusy: boolean;
  elapsedSeconds: number;
  batchPromptText: string;
  batchMode: BatchMode;
  batchConcurrency: number;
  saveSize: string;
  logs: string[];
  batchItems: BatchItem[];
  onBatchPromptTextChange: (value: string) => void;
  onBatchModeChange: (value: BatchMode) => void;
  onBatchConcurrencyChange: (value: number) => void;
  onSaveSizeChange: (value: string) => void;
  onBatchGenerate: () => Promise<void>;
  onBatchItemApply: (item: BatchItem) => void;
};

export function BatchGeneratePage(props: Props) {
  const filenameOf = (path?: string) => {
    if (!path) return "";
    const normalized = path.replaceAll("\\", "/");
    const idx = normalized.lastIndexOf("/");
    return idx >= 0 ? normalized.slice(idx + 1) : normalized;
  };

  return (
    <main className="batch-layout">
      <section className="batch-panel">
        <div className="batch-header">
          <div>
            <h2>批量生成</h2>
            <span>每行一个正向提示词，会继承当前单图设置中的正向/负向提示词。</span>
          </div>
          <button className={props.generationBusy ? "stop-action" : "primary-action"} onClick={props.onBatchGenerate}>
            {props.generationBusy ? "停止生成" : "开始生成"}
          </button>
        </div>
        <textarea
          className="batch-input"
          value={props.batchPromptText}
          placeholder={"火焰风暴技能图标\n寒冰护盾技能图标\n暗影突袭技能图标"}
          onChange={(e) => props.onBatchPromptTextChange(e.target.value)}
        />
        <div className="batch-options">
          <label>执行模式
            <select value={props.batchMode} onChange={(e) => props.onBatchModeChange(e.target.value as BatchMode)}>
              <option value="queue">队列</option>
              <option value="concurrent">并发</option>
            </select>
          </label>
          {props.batchMode === "concurrent" && (
            <label>并发数
              <input type="number" min={1} max={20} value={props.batchConcurrency} onChange={(e) => props.onBatchConcurrencyChange(Number(e.target.value))} />
            </label>
          )}
          <label>保存尺寸
            <select value={props.saveSize} onChange={(e) => props.onSaveSizeChange(e.target.value)}>
              <option value="original">原始尺寸</option>
              <option value="64x64">64x64</option>
              <option value="128x128">128x128</option>
              <option value="256x256">256x256</option>
              <option value="512x512">512x512</option>
              <option value="custom">自定义</option>
            </select>
          </label>
        </div>
      </section>
      <section className="batch-results">
        <section className="batch-result-list batch-generate-results">
          <div className="batch-result-summary">
            <pre>{props.logs.join("\n") || "批量生成结果会显示在这里。"}</pre>
            <div className={props.generationBusy ? "timer-pill active" : "timer-pill"}>生成耗时: {props.elapsedSeconds}s</div>
          </div>
          {props.batchItems.length === 0 ? (
            <div className="batch-results-empty">生成结果会显示在这里</div>
          ) : props.batchItems.map((item) => (
            <button key={item.id} className="batch-result-line" title={item.path ?? item.error ?? item.fullPrompt} onClick={() => props.onBatchItemApply(item)}>
              <span className="batch-result-status">{item.status}</span>
              <strong className="batch-result-prompt">{item.prompt.replace(/\s+/g, " ")}</strong>
              <em className="batch-result-path">{item.path ? filenameOf(item.path) : (item.error ?? "")}</em>
              <div className="batch-result-thumb">
                {item.previewDataUrl ? <img src={item.previewDataUrl} alt="缩略图" /> : <span>--</span>}
              </div>
            </button>
          ))}
        </section>
      </section>
    </main>
  );
}
