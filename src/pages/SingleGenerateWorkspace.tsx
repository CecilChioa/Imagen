import { useMemo } from "react";
import { Button, NumberInput, Select } from "@mantine/core";
import { HISTORY_LIMIT } from "../config/generation";
import type { GenerationResult, SaveButtonState } from "../types/app";

type HistoryItem = GenerationResult;
type TranslationFn = (key: string, values?: Record<string, string | number>) => string;

type Props = {
  previewSrc: string | null;
  previewList: string[];
  generationBusy: boolean;
  saveButtonState: SaveButtonState;
  saveSize: string;
  customWidth: number;
  customHeight: number;
  logsText: string;
  elapsedSeconds: number;
  onGenerate: () => Promise<void>;
  onSavePreview: () => Promise<void>;
  onPreviewSelect: (value: string) => void;
  onSaveSizeChange: (value: string) => void;
  onCustomWidthChange: (value: number) => void;
  onCustomHeightChange: (value: number) => void;
  onPreviewOpen: () => void;
  t: TranslationFn;
  history: HistoryItem[];
  onApplyHistory: (item: HistoryItem) => void;
};

export function SingleGenerateWorkspace(props: Props) {
  const multiPreviewItems = useMemo(() => props.previewList.slice(0, 4), [props.previewList]);

  return (
    <section className="lab-workspace">
      <button
        className={props.previewSrc ? "preview-stage has-image" : "preview-stage"}
        disabled={!props.previewSrc}
        onClick={props.onPreviewOpen}
        title={props.previewSrc ? props.t("single.previewTitle") : undefined}
      >
        {props.previewSrc ? (
          <span className="preview-stage-frame">
            <img src={props.previewSrc} alt={props.t("single.previewAlt")} />
          </span>
        ) : <span>{props.t("single.previewPlaceholder")}</span>}
      </button>
      {multiPreviewItems.length > 1 && (
        <div className="preview-strip" role="list" aria-label={props.t("single.previewList")}>
          {multiPreviewItems.map((item, index) => (
            <button
              key={`${item.slice(0, 48)}-${index}`}
              type="button"
              className={item === props.previewSrc ? "preview-strip-item active" : "preview-strip-item"}
              onClick={() => props.onPreviewSelect(item)}
              title={`${props.t("single.previewAlt")} #${index + 1}`}
            >
              <img src={item} alt={`${props.t("single.previewAlt")} #${index + 1}`} />
            </button>
          ))}
        </div>
      )}
      <div className="operation-row">
        <div className="bottom-actions">
          <Button className={props.generationBusy ? "stop-action" : "primary-action"} onClick={props.onGenerate}>
            {props.generationBusy ? props.t("single.stopGenerate") : props.t("single.generate")}
          </Button>
          <Button className={props.saveButtonState === "saved" ? "save-action saved" : "save-action"} disabled={!props.previewSrc || props.saveButtonState === "saving"} onClick={props.onSavePreview}>
            {props.saveButtonState === "saving" ? props.t("single.saving") : props.saveButtonState === "saved" ? props.t("single.saveSuccess") : props.saveButtonState === "resave" ? props.t("single.saveAgain") : props.t("single.saveImage")}
          </Button>
        </div>
        <div className="save-size-control">
          <Select
            value={props.saveSize}
            onChange={(value) => value && props.onSaveSizeChange(value)}
            data={[
              { value: "original", label: props.t("single.originalSize") },
              { value: "64x64", label: "64x64" },
              { value: "128x128", label: "128x128" },
              { value: "256x256", label: "256x256" },
              { value: "512x512", label: "512x512" },
              { value: "custom", label: props.t("single.custom") },
            ]}
            allowDeselect={false}
          />
        </div>
      </div>
      {props.saveSize === "custom" && (
        <div className="custom-size-row">
          <span>{props.t("single.saveSize")}</span>
          <div className="custom-size">
            <NumberInput
              min={1}
              value={props.customWidth}
              onChange={(value) => props.onCustomWidthChange(Number(value) || 1)}
              allowDecimal={false}
            />
            <span>x</span>
            <NumberInput
              min={1}
              value={props.customHeight}
              onChange={(value) => props.onCustomHeightChange(Number(value) || 1)}
              allowDecimal={false}
            />
          </div>
        </div>
      )}
      <section className="log-panel">
        <div className={props.generationBusy ? "timer-pill active" : "timer-pill"}>{props.t("batch.elapsed", { seconds: props.elapsedSeconds })}</div>
        <pre>{props.logsText}</pre>
      </section>
      <section className="history-workspace">
        {props.history.length === 0 ? (
          <div className="history-empty">-</div>
        ) : props.history.slice(0, HISTORY_LIMIT).map((item) => (
          <button key={item.id} className="history-item" onClick={() => props.onApplyHistory(item)} title={item.prompt}>
            <span>{item.createdAt}</span>
            <strong>{item.prompt.replace(/\s+/g, " ").slice(0, 80)}</strong>
            <em>{item.status}</em>
          </button>
        ))}
      </section>
    </section>
  );
}
