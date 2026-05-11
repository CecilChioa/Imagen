export type Locale = "zh-CN" | "en-US";
export type StatusTone = "info" | "success" | "warning" | "loading";

export type StatusMessage = {
  tone: StatusTone;
  key?: string;
  values?: Record<string, string | number>;
  raw?: string;
};

export type ApiProvider = "openai_compatible" | "gemini_native";
export type ModerationLevel = "auto" | "low";
export type BackgroundMode = "auto" | "transparent" | "opaque";

export type ApiProfile = {
  id: string;
  name: string;
  provider: ApiProvider;
  apiVersion?: string;
  apiKey: string;
  apiBaseUrl: string;
  model: string;
};

export type GeneratedImage = {
  path: string | null;
  format: string;
  dataUrl: string;
};

export type GenerationResult = {
  id: string;
  createdAt: string;
  prompt: string;
  status: string;
  outputs: GeneratedImage[];
  error: string | null;
  request: unknown;
  response: unknown;
};

export type SaveButtonState = "idle" | "saving" | "saved" | "resave";
export type ViewMode = "single" | "batch" | "convert" | "compose";
export type BatchMode = "queue" | "concurrent";
export type ConvertTarget = "png" | "tga" | "blp";
export type TgaBits = 16 | 24 | 32;
export type BlpEncoding = "raw1" | "jpeg";
export type BlpAlphaBits = 0 | 1 | 4 | 8;
export type ConvertFilter = "nearest" | "triangle" | "catmullrom" | "gaussian" | "lanczos3";
export type AlphaMode = "passthrough" | "threshold" | "unpremultiply";
export type PngCompression = "default" | "fast" | "best";
export type PngFilter = "adaptive" | "none" | "sub" | "up" | "avg" | "paeth";

export type BlpJpegQuality = number;
export type BlpMipmapCount = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

export type BatchItemStatus = "pending" | "running" | "done" | "failed" | "cancelled";

export type BatchItem = {
  id: string;
  prompt: string;
  fullPrompt: string;
  negativePrompt: string;
  status: string;
  statusCode?: BatchItemStatus;
  path?: string;
  error?: string;
  previewDataUrl?: string;
};

export type BatchConvertResult = {
  total: number;
  converted: number;
  failed: number;
  errors: string[];
};

export type BatchComposeResult = {
  total: number;
  composed: number;
  failed: number;
  errors: string[];
};

export type Settings = {
  schemaVersion: number;
  language: Locale;
  apiProfiles: ApiProfile[];
  activeApiProfileId: string;
  outputDir: string;
  size: string;
  quality: string;
  outputFormat: string;
  timeoutSec: number;
  outputCompression: number;
  moderation: ModerationLevel;
  background: BackgroundMode;
  removeBackground: boolean;
  n: number;
  positivePrompt: string;
  negativePrompt: string;
  positivePromptLibrary: string[];
  negativePromptLibrary: string[];
  stylePreset: string;
  contentType: string;
  referenceLibraryDir: string;
  referenceImagePath: string;
  maskImagePath: string;
  history: GenerationResult[];
  convertSourceDir: string;
  convertTargetDir: string;
  convertSourceFormats: string[];
  convertTargetFormat: ConvertTarget;
  convertRecursive: boolean;
  convertKeepStructure: boolean;
  convertTgaBits: TgaBits;
  convertTgaRle: boolean;
  convertBlpEncoding: BlpEncoding;
  convertBlpAlphaBits: BlpAlphaBits;
  convertBlpJpegQuality: BlpJpegQuality;
  convertBlpMipmapCount: BlpMipmapCount;
  convertBlpFilter: ConvertFilter;
  convertAlphaMode: AlphaMode;
  convertAlphaThreshold: number;
  convertPngCompression: PngCompression;
  convertPngFilter: PngFilter;
  composeBaseDir: string;
  composeTargetDir: string;
};

export type PromptKind = "positive" | "negative";

export type PresetOption = {
  id: string;
  name: string;
  labelKey?: string;
  prompt: string;
};