import { appendBoundedLogs, GENERATE_LOG_LIMIT, resetBoundedLogs } from "../config/generation";
import { clampImageCount } from "../config/settings";
import i18n from "../i18n";
import { invokeCommand, isCancelledError } from "../lib/tauri";
import type { GenerationResult } from "../types/app";
import type { SingleGenerationOptions } from "./useGenerationTypes";

export const useSingleGeneration = ({
  params,
  generationRunIdRef,
  activeCancellationIdRef,
  composePositivePrompt,
  pickReferenceFromLibrary,
  saveHistoryResult,
}: SingleGenerationOptions) => {
  const onGenerate = async () => {
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
      params.setStatus({ tone: "warning", key: "status.generationStopped" });
      return;
    }
    if (!params.activeProfile?.apiKey.trim()) {
      params.setStatus({ tone: "warning", key: "status.apiKeyRequired" });
      params.setSettingsOpen(true);
      return;
    }
    if (!params.settings.positivePrompt.trim()) {
      params.setStatus({ tone: "warning", key: "status.positivePromptRequired" });
      return;
    }

    const startedAt = Date.now();
    const runId = generationRunIdRef.current + 1;
    const cancellationId = crypto.randomUUID();
    generationRunIdRef.current = runId;
    activeCancellationIdRef.current = cancellationId;
    params.setGenerationStartedAt(startedAt);
    params.setElapsedSeconds(0);
    params.setGenerationBusy(true);
    params.setGenerateLogs(() =>
      resetBoundedLogs(
        `[${new Date().toLocaleString(i18n.language)}] single_generate:start`,
        GENERATE_LOG_LIMIT,
      ),
    );

    try {
      const nextSettings = await pickReferenceFromLibrary(params.settings);
      const generationSettings = {
        ...nextSettings,
        positivePrompt: composePositivePrompt(nextSettings),
      };
      const targetCount = clampImageCount(nextSettings.n);
      if (nextSettings.referenceImagePath !== params.settings.referenceImagePath) {
        params.setSettings(nextSettings);
      }

      const primaryResult = await invokeCommand<GenerationResult>("generate_image", {
        request: {
          settings: { ...generationSettings, n: targetCount },
          cancellationId,
        },
      });
      if (generationRunIdRef.current !== runId) return;

      const outputs: GenerationResult["outputs"] = [...primaryResult.outputs];
      const responses: unknown[] = [primaryResult.response];

      while (outputs.length < targetCount) {
        const fallbackResult = await invokeCommand<GenerationResult>("generate_image", {
          request: {
            settings: { ...generationSettings, n: 1 },
            cancellationId,
          },
        });
        if (generationRunIdRef.current !== runId) return;
        outputs.push(...fallbackResult.outputs);
        responses.push(fallbackResult.response);
      }

      if (outputs.length === 0) {
        throw new Error("No image generated");
      }

      const mergedResult: GenerationResult = {
        ...primaryResult,
        outputs: outputs.slice(0, targetCount),
        response: responses.length > 1
          ? { mode: "n-with-fallback", targetCount, responses }
          : primaryResult.response,
      };

      await saveHistoryResult(mergedResult, nextSettings);
      const nextPreviewList = mergedResult.outputs.map((item) => item.dataUrl).filter(Boolean).slice(0, 4);
      params.setPreviewList(nextPreviewList);
      params.setPreviewSrc(nextPreviewList[0] ?? null);
      params.setSaveButtonState("idle");
      params.setGenerateLogs((current) => appendBoundedLogs(current, JSON.stringify(mergedResult.response, null, 2), GENERATE_LOG_LIMIT));
      params.setStatus({ tone: "success", key: "status.generationCompleted" });
    } catch (error) {
      if (generationRunIdRef.current !== runId) return;
      if (isCancelledError(error)) {
        params.setStatus({ tone: "warning", key: "status.generationStopped" });
      } else {
        params.setStatus({ tone: "warning", raw: String(error) });
        params.setGenerateLogs((current) => appendBoundedLogs(current, String(error), GENERATE_LOG_LIMIT));
      }
    } finally {
      if (activeCancellationIdRef.current === cancellationId) {
        activeCancellationIdRef.current = null;
      }
      if (generationRunIdRef.current !== runId) return;
      params.setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
      params.setGenerationBusy(false);
    }
  };

  return { onGenerate };
};
