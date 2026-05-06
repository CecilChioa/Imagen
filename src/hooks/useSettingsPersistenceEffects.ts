import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Dispatch, SetStateAction } from "react";
import type { GenerationResult, Settings } from "../types/app";

type Params = {
  settings: Settings;
  saveNotice: string;
  status: string;
  setSettings: Dispatch<SetStateAction<Settings>>;
  setDraftSettings: Dispatch<SetStateAction<Settings>>;
  setEditingProfileId: (id: string) => void;
  setHistory: (value: GenerationResult[]) => void;
  setSettingsOpen: (open: boolean) => void;
  setSaveNotice: (value: string) => void;
  setStatus: (value: string) => void;
  setReferencePreviewSrc: (value: string) => void;
  setMaskPreviewSrc: (value: string) => void;
  applyConvertSettings: (next: Settings) => void;
  normalizeSettings: (raw: Partial<Settings>) => Settings;
};

type ReturnValue = {
  persistSettings: (next: Settings) => Promise<void>;
  persistSettingsDebounced: (next: Settings, delay?: number) => void;
};

export function useSettingsPersistenceEffects(params: Params): ReturnValue {
  const {
    settings,
    saveNotice,
    status,
    setSettings,
    setDraftSettings,
    setEditingProfileId,
    setHistory,
    setSettingsOpen,
    setSaveNotice,
    setStatus,
    setReferencePreviewSrc,
    setMaskPreviewSrc,
    applyConvertSettings,
    normalizeSettings,
  } = params;

  useEffect(() => {
    invoke<Settings>("load_settings")
      .then((value) => {
        const next = normalizeSettings(value);
        setSettings(next);
        setDraftSettings(next);
        setEditingProfileId(next.activeApiProfileId);
        setHistory(next.history);
        applyConvertSettings(next);
      })
      .catch(() => setSettingsOpen(true));
  }, []);

  useEffect(() => {
    if (!settings.referenceImagePath) {
      setReferencePreviewSrc("");
      return;
    }
    invoke<string>("read_image_data_url", { path: settings.referenceImagePath })
      .then(setReferencePreviewSrc)
      .catch(() => setReferencePreviewSrc(""));
  }, [settings.referenceImagePath]);

  useEffect(() => {
    if (!settings.maskImagePath) {
      setMaskPreviewSrc("");
      return;
    }
    invoke<string>("read_image_data_url", { path: settings.maskImagePath })
      .then(setMaskPreviewSrc)
      .catch(() => setMaskPreviewSrc(""));
  }, [settings.maskImagePath]);

  useEffect(() => {
    if (!saveNotice) return;
    const timer = window.setTimeout(() => setSaveNotice(""), 2200);
    return () => window.clearTimeout(timer);
  }, [saveNotice]);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(""), 5000);
    return () => window.clearTimeout(timer);
  }, [status]);

  const persistSettings = async (next: Settings) => {
    setSettings(next);
    setDraftSettings(next);
    await invoke("save_settings", { settings: next });
  };

  const persistTimerRef = useRef<number | null>(null);
  const persistSettingsDebounced = (next: Settings, delay = 300) => {
    setSettings(next);
    setDraftSettings(next);
    if (persistTimerRef.current != null) {
      window.clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = window.setTimeout(() => {
      invoke("save_settings", { settings: next });
      persistTimerRef.current = null;
    }, delay);
  };

  return { persistSettings, persistSettingsDebounced };
}