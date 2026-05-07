import { Button, NumberInput, Select, Textarea } from "@mantine/core";
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
  const batchPromptTotal = props.batchPromptText.split(/\r?\n/).map((text) => text.trim()).filter(Boolean).length;
  const totalCount = props.batchItems.length || batchPromptTotal;
  const generatedCount = props.batchItems.filter((item) => item.status === "完成").length;
  const remainingCount = props.batchItems.length
    ? props.batchItems.filter((item) => item.status === "等待" || item.status === "生成中").length
    : totalCount;

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
          <Button className={props.generationBusy ? "stop-action" : "primary-action"} onClick={props.onBatchGenerate}>
            {props.generationBusy ? "停止生成" : "开始生成"}
          </Button>
        </div>
        <Textarea
          className="batch-prompt-field"
          classNames={{ input: "batch-input" }}
          value={props.batchPromptText}
          placeholder={"火焰风暴技能图标\n寒冰护盾技能图标\n暗影突袭技能图标"}
          minRows={12}
          onChange={(e) => props.onBatchPromptTextChange(e.target.value)}
        />
        <div className="batch-options">
          <Select
            label="执行模式"
            value={props.batchMode}
            data={[
              { value: "queue", label: "队列" },
              { value: "concurrent", label: "并发" },
            ]}
            onChange={(value) => value && props.onBatchModeChange(value as BatchMode)}
            allowDeselect={false}
          />
          {props.batchMode === "concurrent" && (
            <NumberInput
              label="并发数"
              min={1}
              max={20}
              value={props.batchConcurrency}
              allowDecimal={false}
              onChange={(value) => props.onBatchConcurrencyChange(Number(value) || 1)}
            />
          )}
          <Select
            label="保存尺寸"
            value={props.saveSize}
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
      </section>
      <section className="batch-results">
        <section className="batch-result-list batch-generate-results">
          <div className="batch-result-status-row">
            <strong>任务结果</strong>
            <div className="batch-progress-counts" aria-label="批量生成进度">
              <span>共 {totalCount} 个</span>
              <span>已生成 {generatedCount}</span>
              <span>剩余 {remainingCount}</span>
            </div>
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
