import { Button, NumberInput, Select, Textarea } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { parseBatchPromptLines } from "../config/generation";
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
  const { t } = useTranslation();
  const batchPromptTotal = parseBatchPromptLines(props.batchPromptText).length;
  const totalCount = props.batchItems.length || batchPromptTotal;

  let generatedCount = 0;
  let remainingCount = props.batchItems.length === 0 ? totalCount : 0;
  if (props.batchItems.length > 0) {
    for (const item of props.batchItems) {
      if (item.statusCode === "done") generatedCount += 1;
      if (item.statusCode === "pending" || item.statusCode === "running") remainingCount += 1;
    }
  }

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
            <h2>{t("batch.title")}</h2>
            <span>{t("batch.subtitle")}</span>
          </div>
          <Button className={props.generationBusy ? "stop-action" : "primary-action"} onClick={props.onBatchGenerate}>
            {props.generationBusy ? t("batch.stop") : t("batch.start")}
          </Button>
        </div>
        <Textarea
          className="batch-prompt-field"
          classNames={{ input: "batch-input" }}
          value={props.batchPromptText}
          placeholder={t("batch.placeholder")}
          minRows={12}
          onChange={(e) => props.onBatchPromptTextChange(e.target.value)}
        />
        <div className="batch-options">
          <Select
            label={t("batch.executionMode")}
            value={props.batchMode}
            data={[
              { value: "queue", label: t("batch.queue") },
              { value: "concurrent", label: t("batch.concurrent") },
            ]}
            onChange={(value) => value && props.onBatchModeChange(value as BatchMode)}
            allowDeselect={false}
          />
          {props.batchMode === "concurrent" && (
            <NumberInput
              label={t("batch.concurrency")}
              min={1}
              max={20}
              value={props.batchConcurrency}
              allowDecimal={false}
              onChange={(value) => props.onBatchConcurrencyChange(Number(value) || 1)}
            />
          )}
          <Select
            label={t("batch.saveSize")}
            value={props.saveSize}
            onChange={(value) => value && props.onSaveSizeChange(value)}
            data={[
              { value: "original", label: t("common.originalSize") },
              { value: "64x64", label: "64x64" },
              { value: "128x128", label: "128x128" },
              { value: "256x256", label: "256x256" },
              { value: "512x512", label: "512x512" },
              { value: "custom", label: t("common.custom") },
            ]}
            allowDeselect={false}
          />
        </div>
      </section>
      <section className="batch-results">
        <section className="batch-result-list batch-generate-results">
          <div className="batch-result-status-row">
            <strong>{t("batch.results")}</strong>
            <div className="batch-progress-counts" aria-label={t("batch.progressAria")}>
              <span>{t("batch.total", { count: totalCount })}</span>
              <span>{t("batch.generated", { count: generatedCount })}</span>
              <span>{t("batch.remaining", { count: remainingCount })}</span>
            </div>
            <div className={props.generationBusy ? "timer-pill active" : "timer-pill"}>{t("batch.elapsed", { seconds: props.elapsedSeconds })}</div>
          </div>
          {props.batchItems.length === 0 ? (
            <div className="batch-results-empty">{t("batch.empty")}</div>
          ) : props.batchItems.map((item) => (
            <button key={item.id} className="batch-result-line" title={item.path ?? item.error ?? item.fullPrompt} onClick={() => props.onBatchItemApply(item)}>
              <span className="batch-result-status">{item.status}</span>
              <strong className="batch-result-prompt">{item.prompt.replace(/\s+/g, " ")}</strong>
              <em className="batch-result-path">{item.path ? filenameOf(item.path) : (item.error ?? "")}</em>
              <div className="batch-result-thumb">
                {item.previewDataUrl ? <img src={item.previewDataUrl} alt={t("batch.thumbnailAlt")} /> : <span>--</span>}
              </div>
            </button>
          ))}
        </section>
      </section>
    </main>
  );
}
