import {
  clampImageCount,
  clampOutputCompression,
  clampTimeoutSec,
} from "../config/settings";
import type { Settings } from "../types/app";

type TranslationFn = (key: string, values?: Record<string, string | number>) => string;

export type ParamSelectControl = {
  type: "select";
  key: string;
  label: string;
  value: string;
  data: Array<{ value: string; label: string }>;
  visible?: boolean;
  onChange: (value: string) => void;
};

export type ParamNumberControl = {
  type: "number";
  key: string;
  label: string;
  value: number;
  min: number;
  max: number;
  visible?: boolean;
  clamp: (value: unknown) => number;
  onChange: (value: number) => void;
};

export type ParamControl = ParamSelectControl | ParamNumberControl;

type BuildGenerationParamControlsArgs = {
  settings: Settings;
  isGemini: boolean;
  t: TranslationFn;
  onSettingsChange: (next: Settings) => void;
};

export const buildGenerationParamControls = ({
  settings,
  isGemini,
  t,
  onSettingsChange,
}: BuildGenerationParamControlsArgs): ParamControl[] => {
  const outputFormatOptions = [
    { value: "png", label: "png" },
    { value: "jpeg", label: "jpeg" },
    { value: "webp", label: "webp" },
  ];

  return [
    {
      type: "select",
      key: "size",
      label: t("single.size"),
      value: settings.size,
      data: [
        { value: "1024x1024", label: "1024x1024" },
        { value: "1536x1024", label: "1536x1024" },
        { value: "1024x1536", label: "1024x1536" },
        { value: "auto", label: "auto" },
      ],
      onChange: (value) => onSettingsChange({ ...settings, size: value }),
    },
    {
      type: "select",
      key: "quality",
      label: t("single.quality"),
      value: settings.quality,
      data: [
        { value: "auto", label: "auto" },
        { value: "low", label: "low" },
        { value: "medium", label: "medium" },
        { value: "high", label: "high" },
      ],
      onChange: (value) => onSettingsChange({ ...settings, quality: value }),
    },
    {
      type: "select",
      key: "outputFormat",
      label: t("single.outputFormat"),
      value: settings.outputFormat,
      data: outputFormatOptions,
      onChange: (value) => onSettingsChange({ ...settings, outputFormat: value }),
    },
    {
      type: "number",
      key: "outputCompression",
      label: t("single.outputCompression"),
      value: settings.outputCompression,
      min: 0,
      max: 100,
      visible: !isGemini,
      clamp: clampOutputCompression,
      onChange: (value) => onSettingsChange({ ...settings, outputCompression: value }),
    },
    {
      type: "select",
      key: "moderation",
      label: t("single.moderation"),
      value: settings.moderation,
      data: [
        { value: "auto", label: "auto" },
        { value: "low", label: "low" },
      ],
      onChange: (value) => onSettingsChange({ ...settings, moderation: value as Settings["moderation"] }),
    },
    {
      type: "select",
      key: "background",
      label: t("single.background"),
      value: settings.background,
      visible: !isGemini,
      data: [
        { value: "auto", label: t("single.backgroundAuto") },
        { value: "transparent", label: t("single.backgroundTransparent") },
        { value: "opaque", label: t("single.backgroundOpaque") },
      ],
      onChange: (value) => onSettingsChange({ ...settings, background: value as Settings["background"] }),
    },
    {
      type: "number",
      key: "timeoutSec",
      label: t("single.timeoutSec"),
      value: settings.timeoutSec,
      min: 10,
      max: 1200,
      clamp: clampTimeoutSec,
      onChange: (value) => onSettingsChange({ ...settings, timeoutSec: value }),
    },
    {
      type: "number",
      key: "imageCount",
      label: t("single.imageCount"),
      value: settings.n,
      min: 1,
      max: 4,
      clamp: clampImageCount,
      onChange: (value) => onSettingsChange({ ...settings, n: value }),
    },
  ];
};
