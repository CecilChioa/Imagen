import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { commandErrorMessage, invokeCommand } from "../lib/tauri";
import type { GenerationResult, Settings, StatusMessage } from "../types/app";

type Params = {
  settings: Settings;
  saveNotice: string;
  status: StatusMessage | null;
  setSettings: Dispatch<SetStateAction<Settings>>;
  setDraftSettings: Dispatch<SetStateAction<Settings>>;
  setEditingProfileId: (id: string) => void;
  setHistory: (value: GenerationResult[]) => void;
  setSettingsOpen: (open: boolean) => void;
  setSaveNotice: (value: string) => void;
  setStatus: (value: StatusMessage | null) => void;
  setReferencePreviewSrc: (value: string) => void;
  setMaskPreviewSrc: (value: string) => void;
  applyConvertSettings: (next: Settings) => void;
  normalizeSettings: (raw: Partial<Settings>) => Settings;
};

type PersistSettingsOptions = {
  debounceMs?: number;
};

type ReturnValue = {
  persistSettings: (next: Settings, options?: PersistSettingsOptions) => Promise<void>;
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
    invokeCommand<Settings>("load_settings")
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
    invokeCommand<string>("read_image_data_url", { path: settings.referenceImagePath })
      .then(setReferencePreviewSrc)
      .catch(() => setReferencePreviewSrc(""));
  }, [settings.referenceImagePath]);

  useEffect(() => {
    if (!settings.maskImagePath) {
      setMaskPreviewSrc("");
      return;
    }
    invokeCommand<string>("read_image_data_url", { path: settings.maskImagePath })
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
    const timer = window.setTimeout(() => setStatus(null), 5000);
    return () => window.clearTimeout(timer);
  }, [status]);

  const persistTimerRef = useRef<number | null>(null);

  const persistSettings = async (next: Settings, options?: PersistSettingsOptions) => {
    setSettings(next);
    setDraftSettings(next);

    const debounceMs = options?.debounceMs ?? 0;
    if (persistTimerRef.current != null) {
      window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }

    if (debounceMs <= 0) {
      await invokeCommand("save_settings", { settings: next });
      return;
    }

    await new Promise<void>((resolve) => {
      persistTimerRef.current = window.setTimeout(() => {
        invokeCommand("save_settings", { settings: next })
          .catch((error) => setStatus({ tone: "warning", raw: commandErrorMessage(error) }))
          .finally(() => {
            persistTimerRef.current = null;
            resolve();
          });
      }, debounceMs);
    });
  };

  return { persistSettings };
}