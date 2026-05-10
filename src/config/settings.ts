import { HISTORY_LIMIT } from "./generation";
import type { ApiProfile, BlpMipmapCount, Locale, Settings } from "../types/app";

export const defaultApiProfile: ApiProfile = {
  id: "default",
  name: "openai",
  apiKey: "",
  apiBaseUrl: "https://api.openai.com/v1",
  model: "gpt-image-2",
};

export const defaultSettings: Settings = {
  schemaVersion: 1,
  language: "zh-CN",
  apiProfiles: [defaultApiProfile],
  activeApiProfileId: defaultApiProfile.id,
  outputDir: "outputs",
  size: "1024x1024",
  quality: "medium",
  outputFormat: "png",
  removeBackground: false,
  n: 1,
  positivePrompt: "",
  negativePrompt: "",
  positivePromptLibrary: [],
  negativePromptLibrary: [],
  stylePreset: "none",
  contentType: "icon",
  referenceLibraryDir: "",
  referenceImagePath: "",
  maskImagePath: "",
  history: [],
  convertSourceDir: "",
  convertTargetDir: "",
  convertSourceFormats: ["png"],
  convertTargetFormat: "blp",
  convertRecursive: true,
  convertKeepStructure: true,
  convertTgaBits: 32,
  convertTgaRle: true,
  convertBlpEncoding: "jpeg",
  convertBlpAlphaBits: 8,
  convertBlpJpegQuality: 50,
  convertBlpMipmapCount: 16,
  convertBlpFilter: "nearest",
  convertAlphaMode: "passthrough",
  convertAlphaThreshold: 128,
  convertPngCompression: "default",
  convertPngFilter: "adaptive",
  composeBaseDir: "",
  composeTargetDir: "",
};

const toBlpMipmapCount = (value: unknown): BlpMipmapCount => {
  if (typeof value === "boolean") return value ? 16 : 1;
  const count = Math.max(1, Math.min(16, Number(value) || 1));
  return count as BlpMipmapCount;
};

const toLanguage = (value: unknown): Locale => (value === "en-US" ? "en-US" : "zh-CN");

export const normalizeSettings = (raw: Partial<Settings> & { convertBlpMakeMipmaps?: boolean }): Settings => {
  const profiles = raw.apiProfiles && raw.apiProfiles.length > 0 ? raw.apiProfiles : [defaultApiProfile];
  const active = profiles.find((profile) => profile.id === raw.activeApiProfileId)?.id ?? profiles[0].id;

  return {
    ...defaultSettings,
    ...raw,
    language: toLanguage(raw.language),
    apiProfiles: profiles,
    activeApiProfileId: active,
    positivePromptLibrary: raw.positivePromptLibrary ?? [],
    negativePromptLibrary: raw.negativePromptLibrary ?? [],
    history: (raw.history ?? []).slice(0, HISTORY_LIMIT),
    convertBlpMipmapCount: toBlpMipmapCount(raw.convertBlpMipmapCount ?? raw.convertBlpMakeMipmaps),
  };
};

export const createApiProfile = (): ApiProfile => ({
  ...defaultApiProfile,
  id: crypto.randomUUID(),
  name: "New API",
});