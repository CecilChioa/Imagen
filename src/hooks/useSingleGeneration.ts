import { appendBoundedLogs, GENERATE_LOG_LIMIT, resetBoundedLogs } from "../config/generation";
import i18n from "../i18n";
import { invokeCommand } from "../lib/tauri";
import type { GenerationResult } from "../types/app";
import type { SingleGenerationOptions } from "./useGenerationTypes";

export const useSingleGeneration = ({
  params,
  generationRunIdRef,
  composePositivePrompt,
  pickReferenceFromLibrary,
  saveHistoryResult,
}: SingleGenerationOptions) => {
  const onGenerate = async () => {
    if (params.generationBusy) {
      generationRunIdRef.current += 1;
      params.setGenerationBusy(false);
      params.setStatus("status.generationStopped");
      return;
    }
    if (!params.activeProfile?.apiKey.trim()) {
      params.setStatus("status.apiKeyRequired");
      params.setSettingsOpen(true);
      return;
    }
    if (!params.settings.positivePrompt.trim()) {
      params.setStatus("status.positivePromptRequired");
      return;
    }

    const startedAt = Date.now();
    const runId = generationRunIdRef.current + 1;
    generationRunIdRef.current = runId;
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
      if (nextSettings.referenceImagePath !== params.settings.referenceImagePath) {
        params.setSettings(nextSettings);
      }
      const result = await invokeCommand<GenerationResult>("generate_image", { settings: generationSettings });
      if (generationRunIdRef.current !== runId) return;
      await saveHistoryResult(result, nextSettings);
      params.setPreviewSrc(result.outputs[0]?.dataUrl ?? null);
      params.setSaveButtonState("idle");
      params.setGenerateLogs((current) => appendBoundedLogs(current, JSON.stringify(result.response, null, 2), GENERATE_LOG_LIMIT));
      params.setStatus("status.generationCompleted");
    } catch (error) {
      if (generationRunIdRef.current !== runId) return;
      params.setStatus(String(error));
      params.setGenerateLogs((current) => appendBoundedLogs(current, String(error), GENERATE_LOG_LIMIT));
    } finally {
      if (generationRunIdRef.current !== runId) return;
      params.setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
      params.setGenerationBusy(false);
    }
  };

  return { onGenerate };
};
