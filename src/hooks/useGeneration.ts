import { invoke } from "@tauri-apps/api/core";
import { useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { contentTypes, stylePresets } from "../config/presets";
import type { ApiProfile, BatchItem, BatchMode, GenerationResult, Settings } from "../types/app";

type Params = {
  settings: Settings;
  activeProfile?: ApiProfile;
  batchPromptText: string;
  batchMode: BatchMode;
  batchConcurrency: number;
  generationBusy: boolean;
  setGenerationBusy: (value: boolean) => void;
  setGenerationStartedAt: (value: number | null) => void;
  setElapsedSeconds: (value: number) => void;
  setGenerateLogs: Dispatch<SetStateAction<string[]>>;
  setStatus: (value: string) => void;
  setSettingsOpen: (open: boolean) => void;
  setSettings: Dispatch<SetStateAction<Settings>>;
  setBatchItems: Dispatch<SetStateAction<BatchItem[]>>;
  setPreviewSrc: (value: string | null) => void;
  setSaveButtonState: (value: "idle" | "saving" | "saved" | "resave") => void;
  setHistory: (value: GenerationResult[]) => void;
  persistSettings: (next: Settings) => Promise<void>;
  getSaveDimensions: () => { width: number; height: number };
};

type ReturnValue = {
  onGenerate: () => Promise<void>;
  onBatchGenerate: () => Promise<void>;
  pickReferenceFromLibrary: (base: Settings) => Promise<Settings>;
};

export function useGeneration(params: Params): ReturnValue {
  const generationRunIdRef = useRef(0);

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
      : { ...base, referenceImagePath: await invoke<string>("pick_random_reference_image", { directory: base.referenceLibraryDir }) };

  const saveHistoryResult = async (result: GenerationResult, base: Settings = params.settings) => {
    const next = [result, ...base.history.filter((item) => item.id !== result.id)].slice(0, 10);
    params.setHistory(next);
    await params.persistSettings({ ...base, history: next });
  };

  const onGenerate = async () => {
    if (params.generationBusy) {
      generationRunIdRef.current += 1;
      params.setGenerationBusy(false);
      params.setStatus("已停止生成");
      return;
    }
    if (!params.activeProfile?.apiKey.trim()) {
      params.setStatus("请先在设置中填写 API Key");
      params.setSettingsOpen(true);
      return;
    }
    if (!params.settings.positivePrompt.trim()) {
      params.setStatus("请输入正向提示词");
      return;
    }

    const startedAt = Date.now();
    const runId = generationRunIdRef.current + 1;
    generationRunIdRef.current = runId;
    params.setGenerationStartedAt(startedAt);
    params.setElapsedSeconds(0);
    params.setGenerationBusy(true);
    params.setGenerateLogs([`[${new Date().toLocaleString()}] 开始单图生成`]);

    try {
      const nextSettings = await pickReferenceFromLibrary(params.settings);
      const generationSettings = {
        ...nextSettings,
        positivePrompt: composePositivePrompt(nextSettings),
      };
      if (nextSettings.referenceImagePath !== params.settings.referenceImagePath) {
        params.setSettings(nextSettings);
      }
      const result = await invoke<GenerationResult>("generate_image", { settings: generationSettings });
      if (generationRunIdRef.current !== runId) return;
      await saveHistoryResult(result, nextSettings);
      params.setPreviewSrc(result.outputs[0]?.dataUrl ?? null);
      params.setSaveButtonState("idle");
      params.setGenerateLogs((current) => [...current, JSON.stringify(result.response, null, 2)]);
      params.setStatus("生成完成");
    } catch (error) {
      if (generationRunIdRef.current !== runId) return;
      params.setStatus(String(error));
      params.setGenerateLogs((current) => [...current, String(error)]);
    } finally {
      if (generationRunIdRef.current !== runId) return;
      params.setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
      params.setGenerationBusy(false);
    }
  };

  const onBatchGenerate = async () => {
    if (params.generationBusy) {
      generationRunIdRef.current += 1;
      params.setGenerationBusy(false);
      params.setStatus("已停止批量生成");
      return;
    }

    const prompts = params.batchPromptText.split(/\r?\n/).map((text) => text.trim()).filter(Boolean);
    if (!prompts.length) {
      params.setStatus("请输入批量提示词");
      return;
    }

    const items: BatchItem[] = prompts.map((prompt, index) => ({
      id: String(Date.now() + index),
      prompt,
      fullPrompt: composePositivePrompt(params.settings, prompt),
      negativePrompt: params.settings.negativePrompt.trim(),
      status: "等待",
    }));

    params.setBatchItems(items);
    params.setGenerationBusy(true);
    const startedAt = Date.now();
    params.setGenerationStartedAt(startedAt);
    params.setElapsedSeconds(0);
    params.setGenerateLogs([`批量开始，共 ${items.length} 条`]);

    const runId = generationRunIdRef.current + 1;
    generationRunIdRef.current = runId;
    const concurrency = params.batchMode === "concurrent" ? Math.max(1, Math.min(20, params.batchConcurrency || 1)) : 1;

    const runOne = async (item: BatchItem) => {
      if (generationRunIdRef.current !== runId) return;
      params.setBatchItems((current) => current.map((it) => (it.id === item.id ? { ...it, status: "生成中" } : it)));
      try {
        const base = { ...params.settings, positivePrompt: item.fullPrompt, negativePrompt: item.negativePrompt, n: 1 };
        const result = await invoke<GenerationResult>("generate_image", { settings: base });
        const dataUrl = result.outputs[0]?.dataUrl ?? "";
        let path = "";
        if (dataUrl) {
          const { width, height } = params.getSaveDimensions();
          path = await invoke<string>("save_generated_image", { request: { settings: base, dataUrl, width, height } });
        }
        params.setBatchItems((current) =>
          current.map((it) => (it.id === item.id ? { ...it, status: "完成", path, previewDataUrl: dataUrl || it.previewDataUrl } : it)),
        );
      } catch (error) {
        params.setBatchItems((current) => current.map((it) => (it.id === item.id ? { ...it, status: "失败", error: String(error) } : it)));
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
      if (generationRunIdRef.current === runId) {
        params.setGenerationBusy(false);
        params.setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
        params.setStatus("批量生成完成");
      }
    }
  };

  return { onGenerate, onBatchGenerate, pickReferenceFromLibrary };
}