import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { ApiProfile, BatchItem, BatchMode, GenerationResult, Settings } from "../types/app";

export type GenerationParams = {
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

export type PickReferenceFromLibrary = (base: Settings) => Promise<Settings>;
export type ComposePositivePrompt = (base: Settings, extraPrompt?: string) => string;
export type SaveHistoryResult = (result: GenerationResult, base?: Settings) => Promise<void>;

export type SingleGenerationOptions = {
  params: GenerationParams;
  generationRunIdRef: MutableRefObject<number>;
  composePositivePrompt: ComposePositivePrompt;
  pickReferenceFromLibrary: PickReferenceFromLibrary;
  saveHistoryResult: SaveHistoryResult;
};

export type BatchGenerationOptions = {
  params: GenerationParams;
  generationRunIdRef: MutableRefObject<number>;
  composePositivePrompt: ComposePositivePrompt;
};
