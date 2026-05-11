import { useRef } from "react";
import { HISTORY_LIMIT } from "../config/generation";
import { contentTypes, stylePresets } from "../config/presets";
import { invokeCommand } from "../lib/tauri";
import type { GenerationResult, Settings } from "../types/app";
import { useBatchGeneration } from "./useBatchGeneration";
import { useSingleGeneration } from "./useSingleGeneration";
import type { GenerationParams, PickReferenceFromLibrary } from "./useGenerationTypes";

type ReturnValue = {
  onGenerate: () => Promise<void>;
  onBatchGenerate: () => Promise<void>;
  pickReferenceFromLibrary: PickReferenceFromLibrary;
};

export function useGeneration(params: GenerationParams): ReturnValue {
  const generationRunIdRef = useRef(0);
  const activeCancellationIdRef = useRef<string | null>(null);

  const composePositivePrompt = (base: Settings, extraPrompt = "") => {
    const contentPrompt = contentTypes.find((item) => item.id === base.contentType)?.prompt ?? "";
    const stylePrompt = stylePresets.find((item) => item.id === base.stylePreset)?.prompt ?? "";

    return [contentPrompt, stylePrompt, base.positivePrompt, extraPrompt]
      .map((part) => part.trim())
      .filter(Boolean)
      .join("\n");
  };

  const pickReferenceFromLibrary = async (base: Settings) =>
    !base.referenceLibraryDir
      ? base
      : { ...base, referenceImagePath: await invokeCommand<string>("pick_random_reference_image", { directory: base.referenceLibraryDir }) };

  const saveHistoryResult = async (result: GenerationResult, base: Settings = params.settings) => {
    const next = [result, ...base.history.filter((item) => item.id !== result.id)].slice(0, HISTORY_LIMIT);
    params.setHistory(next);
    await params.persistSettings({ ...base, history: next });
  };

  const { onGenerate } = useSingleGeneration({
    params,
    generationRunIdRef,
    activeCancellationIdRef,
    composePositivePrompt,
    pickReferenceFromLibrary,
    saveHistoryResult,
  });

  const { onBatchGenerate } = useBatchGeneration({
    params,
    generationRunIdRef,
    activeCancellationIdRef,
    composePositivePrompt,
  });

  return { onGenerate, onBatchGenerate, pickReferenceFromLibrary };
}
