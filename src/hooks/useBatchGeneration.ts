import { GENERATE_LOG_LIMIT, parseBatchPromptLines, resetBoundedLogs } from "../config/generation";
import i18n from "../i18n";
import { invokeCommand, isCancelledError } from "../lib/tauri";
import type { BatchItem, GenerationResult } from "../types/app";
import type { BatchGenerationOptions } from "./useGenerationTypes";

export const useBatchGeneration = ({
  params,
  generationRunIdRef,
  activeCancellationIdRef,
  composePositivePrompt,
}: BatchGenerationOptions) => {
  const onBatchGenerate = async () => {
    if (params.generationBusy) {
      const cancellationId = activeCancellationIdRef.current;
      if (cancellationId) {
        try {
          await invokeCommand("cancel_generation", { cancellationId });
        } catch {
          // ignore cancellation command failure
        }
      }
      activeCancellationIdRef.current = null;
      generationRunIdRef.current += 1;
      params.setGenerationBusy(false);
      params.setBatchItems((current) =>
        current.map((item) =>
          item.statusCode === "done" || item.statusCode === "failed"
            ? item
            : { ...item, status: "", statusCode: "cancelled", error: undefined },
        ),
      );
      params.setStatus({ tone: "warning", key: "status.batchGenerationStopped" });
      return;
    }

    const prompts = parseBatchPromptLines(params.batchPromptText);
    if (!prompts.length) {
      params.setStatus({ tone: "warning", key: "status.batchPromptRequired" });
      return;
    }

    const items: BatchItem[] = prompts.map((prompt, index) => ({
      id: String(Date.now() + index),
      prompt,
      fullPrompt: composePositivePrompt(params.settings, prompt),
      negativePrompt: params.settings.negativePrompt.trim(),
      status: "",
      statusCode: "pending",
    }));

    params.setBatchItems(items);
    params.setGenerationBusy(true);
    const startedAt = Date.now();
    params.setGenerationStartedAt(startedAt);
    params.setElapsedSeconds(0);
    params.setGenerateLogs(() =>
      resetBoundedLogs(
        `[${new Date().toLocaleString(i18n.language)}] batch_generate:start total=${items.length}`,
        GENERATE_LOG_LIMIT,
      ),
    );

    const runId = generationRunIdRef.current + 1;
    const cancellationId = crypto.randomUUID();
    generationRunIdRef.current = runId;
    activeCancellationIdRef.current = cancellationId;
    const concurrency = params.batchMode === "concurrent" ? Math.max(1, Math.min(20, params.batchConcurrency || 1)) : 1;

    const updateBatchItem = (id: string, updater: (item: BatchItem) => BatchItem) => {
      params.setBatchItems((current) => {
        const index = current.findIndex((item) => item.id === id);
        if (index < 0) {
          return current;
        }
        const nextItem = updater(current[index]);
        if (nextItem === current[index]) {
          return current;
        }
        const next = current.slice();
        next[index] = nextItem;
        return next;
      });
    };

    const runOne = async (item: BatchItem) => {
      if (generationRunIdRef.current !== runId) return;
      updateBatchItem(item.id, (currentItem) =>
        currentItem.statusCode === "running" ? currentItem : { ...currentItem, status: "", statusCode: "running", error: undefined },
      );
      try {
        const base = { ...params.settings, positivePrompt: item.fullPrompt, negativePrompt: item.negativePrompt, n: 1 };
        const result = await invokeCommand<GenerationResult>("generate_image", {
          request: {
            settings: base,
            cancellationId,
          },
        });
        const dataUrl = result.outputs[0]?.dataUrl ?? "";
        let path = "";
        if (dataUrl) {
          const { width, height } = params.getSaveDimensions();
          path = await invokeCommand<string>("save_generated_image", { request: { settings: base, dataUrl, width, height } });
        }
        updateBatchItem(item.id, (currentItem) => ({
          ...currentItem,
          status: "",
          statusCode: "done",
          path,
          previewDataUrl: dataUrl || currentItem.previewDataUrl,
          error: undefined,
        }));
      } catch (error) {
        if (isCancelledError(error)) {
          updateBatchItem(item.id, (currentItem) => ({ ...currentItem, status: "", statusCode: "cancelled", error: undefined }));
          return;
        }
        updateBatchItem(item.id, (currentItem) => ({ ...currentItem, status: "", statusCode: "failed", error: String(error) }));
      }
    };

    try {
      if (concurrency <= 1) {
        for (const item of items) {
          if (generationRunIdRef.current !== runId) break;
          await runOne(item);
        }
      } else {
        let next = 0;
        await Promise.all(
          Array.from({ length: Math.min(concurrency, items.length) }, async () => {
            while (generationRunIdRef.current === runId) {
              const item = items[next++];
              if (!item) break;
              await runOne(item);
            }
          }),
        );
      }
    } finally {
      if (activeCancellationIdRef.current === cancellationId) {
        activeCancellationIdRef.current = null;
      }
      if (generationRunIdRef.current === runId) {
        params.setGenerationBusy(false);
        params.setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
        params.setStatus({ tone: "success", key: "status.batchGenerationCompleted" });
      }
    }
  };

  return { onBatchGenerate };
};
