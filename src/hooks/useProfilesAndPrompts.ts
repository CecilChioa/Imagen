import type { Dispatch, SetStateAction } from "react";
import i18n from "../i18n";
import { chooseDirectory } from "../lib/filePickers";
import { invokeCommand } from "../lib/tauri";
import type { ApiProfile, Settings, StatusMessage } from "../types/app";

type Params = {
  settings: Settings;
  draftSettings: Settings;
  editingProfileId: string;
  localModelName: string;
  localModelBaseUrl: string;
  localModelId: string;
  createApiProfile: () => ApiProfile;
  normalizeSettings: (raw: Partial<Settings>) => Settings;
  setDraftSettings: Dispatch<SetStateAction<Settings>>;
  setEditingProfileId: (id: string) => void;
  setSettingsOpen: (open: boolean) => void;
  setLocalModelOpen: (open: boolean) => void;
  setStatus: (value: StatusMessage | null) => void;
  persistSettings: (next: Settings) => Promise<void>;
};

type ReturnValue = {
  savePromptToLibrary: (kind: "positive" | "negative") => Promise<void>;
  choosePromptFromLibrary: (kind: "positive" | "negative", prompt: string) => Promise<void>;
  deletePromptFromLibrary: (kind: "positive" | "negative", prompt: string) => Promise<void>;
  addProfile: () => void;
  updateEditingProfile: (patch: Partial<ApiProfile>) => void;
  deleteProfile: (id: string) => void;
  onChooseOutputDir: () => Promise<void>;
  onSaveAllSettings: () => Promise<void>;
  onOpenApiSignup: (provider: "pptokens" | "aifast" | "yunwu") => Promise<void>;
  onConnectLocalModel: () => void;
};

export function useProfilesAndPrompts(params: Params): ReturnValue {
  const savePromptToLibrary = async (kind: "positive" | "negative") => {
    const prompt = (kind === "positive" ? params.settings.positivePrompt : params.settings.negativePrompt).trim();
    if (!prompt) {
      params.setStatus({
        tone: "warning",
        key: `status.${kind === "positive" ? "promptEmptyPositive" : "promptEmptyNegative"}`,
      });
      return;
    }
    const key = kind === "positive" ? "positivePromptLibrary" : "negativePromptLibrary";
    if (params.settings[key].includes(prompt)) {
      params.setStatus({ tone: "warning", key: "status.promptAlreadyExists" });
      return;
    }
    await params.persistSettings({ ...params.settings, [key]: [prompt, ...params.settings[key]] });
  };

  const choosePromptFromLibrary = async (kind: "positive" | "negative", prompt: string) => {
    if (!prompt) return;
    await params.persistSettings(
      kind === "positive"
        ? { ...params.settings, positivePrompt: prompt }
        : { ...params.settings, negativePrompt: prompt },
    );
  };

  const deletePromptFromLibrary = async (kind: "positive" | "negative", prompt: string) => {
    if (!prompt) return;
    const key = kind === "positive" ? "positivePromptLibrary" : "negativePromptLibrary";
    await params.persistSettings({ ...params.settings, [key]: params.settings[key].filter((item) => item !== prompt) });
  };

  const addProfile = () => {
    const profile = params.createApiProfile();
    params.setDraftSettings((current) => ({
      ...current,
      apiProfiles: [...current.apiProfiles, profile],
      activeApiProfileId: profile.id,
    }));
    params.setEditingProfileId(profile.id);
  };

  const updateEditingProfile = (patch: Partial<ApiProfile>) => {
    params.setDraftSettings((current) => ({
      ...current,
      apiProfiles: current.apiProfiles.map((profile) =>
        profile.id === params.editingProfileId ? { ...profile, ...patch } : profile,
      ),
    }));
  };

  const deleteProfile = (id: string) => {
    params.setDraftSettings((current) => {
      if (current.apiProfiles.length <= 1) return current;
      const apiProfiles = current.apiProfiles.filter((profile) => profile.id !== id);
      const activeApiProfileId = current.activeApiProfileId === id ? apiProfiles[0].id : current.activeApiProfileId;
      params.setEditingProfileId(activeApiProfileId);
      return { ...current, apiProfiles, activeApiProfileId };
    });
  };

  const onChooseOutputDir = async () => {
    const selected = await chooseDirectory(i18n.t("settings.outputDir"));
    if (selected) {
      params.setDraftSettings({ ...params.draftSettings, outputDir: selected });
    }
  };

  const onSaveAllSettings = async () => {
    const next = params.normalizeSettings(params.draftSettings);
    await params.persistSettings(next);
    params.setEditingProfileId(next.activeApiProfileId);
    params.setSettingsOpen(false);
    params.setStatus({ tone: "success", key: "status.settingsSaved" });
  };

  const onOpenApiSignup = async (provider: "pptokens" | "aifast" | "yunwu") => {
    try {
      await invokeCommand("open_api_signup_url", { provider });
    } catch (error) {
      params.setStatus({ tone: "warning", raw: String(error) });
    }
  };

  const onConnectLocalModel = () => {
    const profile = params.createApiProfile();
    const next = {
      ...profile,
      name: params.localModelName.trim() || i18n.t("settings.localModelDefaultName"),
      provider: "openai_compatible" as const,
      apiVersion: "v1",
      apiBaseUrl: params.localModelBaseUrl.trim() || "http://127.0.0.1:11434/v1",
      model: params.localModelId.trim() || "llava",
      apiKey: "",
    };
    params.setDraftSettings((current) => ({
      ...current,
      apiProfiles: [...current.apiProfiles, next],
      activeApiProfileId: next.id,
    }));
    params.setEditingProfileId(next.id);
    params.setLocalModelOpen(false);
    params.setStatus({ tone: "success", key: "status.localModelConnected" });
  };

  return {
    savePromptToLibrary,
    choosePromptFromLibrary,
    deletePromptFromLibrary,
    addProfile,
    updateEditingProfile,
    deleteProfile,
    onChooseOutputDir,
    onSaveAllSettings,
    onOpenApiSignup,
    onConnectLocalModel,
  };
}