import { HISTORY_LIMIT } from "./generation";
import type { ApiProfile, BlpMipmapCount, Locale, Settings } from "../types/app";

export const IMAGE_COUNT_MIN = 1;
export const IMAGE_COUNT_MAX = 4;
export const TIMEOUT_SEC_MIN = 10;
export const OUTPUT_COMPRESSION_MIN = 0;
export const OUTPUT_COMPRESSION_MAX = 100;
export const BATCH_CONCURRENCY_MIN = 1;
export const BATCH_CONCURRENCY_MAX = 20;

export const clampImageCount = (value: unknown) =>
  Math.max(IMAGE_COUNT_MIN, Math.min(IMAGE_COUNT_MAX, Number(value) || IMAGE_COUNT_MIN));

export const clampTimeoutSec = (value: unknown) =>
  Math.max(TIMEOUT_SEC_MIN, Number(value) || TIMEOUT_SEC_MIN);

export const clampOutputCompression = (value: unknown) =>
  Math.max(OUTPUT_COMPRESSION_MIN, Math.min(OUTPUT_COMPRESSION_MAX, Number(value) || OUTPUT_COMPRESSION_MIN));

export const clampBatchConcurrency = (value: unknown) =>
  Math.max(BATCH_CONCURRENCY_MIN, Math.min(BATCH_CONCURRENCY_MAX, Number(value) || BATCH_CONCURRENCY_MIN));

export const defaultApiProfile: ApiProfile = {
  id: "default",
  name: "openai",
  provider: "openai_compatible",
  apiVersion: "v1",
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
  timeoutSec: 300,
  outputCompression: 100,
  moderation: "auto",
  background: "auto",
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
  const profiles = (raw.apiProfiles && raw.apiProfiles.length > 0 ? raw.apiProfiles : [defaultApiProfile]).map((profile): ApiProfile => {
    const provider = profile.provider === "gemini_native" ? "gemini_native" : "openai_compatible";
    return {
      ...defaultApiProfile,
      ...profile,
      provider,
      apiVersion: profile.apiVersion || (provider === "gemini_native" ? "v1beta" : "v1"),
    };
  });
  const active = profiles.find((profile) => profile.id === raw.activeApiProfileId)?.id ?? profiles[0].id;

  return {
    ...defaultSettings,
    ...raw,
    timeoutSec: Ma