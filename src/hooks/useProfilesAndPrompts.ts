import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { Dispatch, SetStateAction } from "react";
import type { ApiProfile, Settings } from "../types/app";

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
  setStatus: (value: string) => void;
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
      params.setStatus(`${kind === "positive" ? "正向" : "负向"}提示词为空`);
      return;
    }
    const key = kind === "positive" ? "positivePromptLibrary" : "negativePromptLibrary";
    if (params.settings[key].includes(prompt)) {
      params.setStatus("提示词已在库中");
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
    const selected = await open({ directory: true, multiple: false, title: "选择输出目录" });
    if (typeof selected === "string") {
      params.setDraftSettings({ ...params.draftSettings, outputDir: selected });
    }
  };

  const onSaveAllSettings = async () => {
    const next = params.normalizeSettings(params.draftSettings);
    await params.persistSettings(next);
    params.setEditingProfileId(next.activeApiProfileId);
    params.setSettingsOpen(false);
    params.setStatus("设置已保存");
  };

  const onOpenApiSignup = async (provider: "pptokens" | "aifast" | "yunwu") => {
    try {
      await invoke("open_api_signup_url", { provider });
    } catch (error) {
      params.setStatus(String(error));
    }
  };

  const onConnectLocalModel = () => {
    const profile = params.createApiProfile();
    const next = {
      ...profile,
      name: params.localModelName.trim() || "本地模型",
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
    params.setStatus("本地模型已接入，请保存设置");
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