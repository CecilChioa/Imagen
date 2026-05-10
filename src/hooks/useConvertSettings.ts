import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type {
  AlphaMode,
  BlpAlphaBits,
  BlpEncoding,
  BlpJpegQuality,
  BlpMipmapCount,
  ConvertFilter,
  ConvertTarget,
  PngCompression,
  PngFilter,
  Settings,
  TgaBits,
} from "../types/app";

type UseConvertSettingsReturn = {
  convertSourceDir: string;
  setConvertSourceDir: (value: string) => void;
  convertTargetDir: string;
  setConvertTargetDir: (value: string) => void;
  convertSourceFormats: string[];
  setConvertSourceFormats: Dispatch<SetStateAction<string[]>>;
  convertTargetFormat: ConvertTarget;
  setConvertTargetFormat: (value: ConvertTarget) => void;
  convertRecursive: boolean;
  setConvertRecursive: (value: boolean) => void;
  convertKeepStructure: boolean;
  setConvertKeepStructure: (value: boolean) => void;
  convertTgaBits: TgaBits;
  setConvertTgaBits: (value: TgaBits) => void;
  convertTgaRle: boolean;
  setConvertTgaRle: (value: boolean) => void;
  convertBlpEncoding: BlpEncoding;
  setConvertBlpEncoding: (value: BlpEncoding) => void;
  convertBlpAlphaBits: BlpAlphaBits;
  setConvertBlpAlphaBits: (value: BlpAlphaBits) => void;
  convertBlpJpegQuality: BlpJpegQuality;
  setConvertBlpJpegQuality: (value: BlpJpegQuality) => void;
  convertBlpMipmapCount: BlpMipmapCount;
  setConvertBlpMipmapCount: (value: BlpMipmapCount) => void;
  convertBlpFilter: ConvertFilter;
  setConvertBlpFilter: (value: ConvertFilter) => void;
  convertAlphaMode: AlphaMode;
  setConvertAlphaMode: (value: AlphaMode) => void;
  convertAlphaThreshold: number;
  setConvertAlphaThreshold: (value: number) => void;
  convertPngCompression: PngCompression;
  setConvertPngCompression: (value: PngCompression) => void;
  convertPngFilter: PngFilter;
  setConvertPngFilter: (value: PngFilter) => void;
  applyConvertSettings: (next: Settings) => void;
  currentConvertSettings: (base: Settings) => Settings;
  toggleConvertSourceFormat: (ext: string) => void;
};

export function useConvertSettings(defaultSettings: Settings): UseConvertSettingsReturn {
  const [convertSourceDir, setConvertSourceDir] = useState(defaultSettings.convertSourceDir);
  const [convertTargetDir, setConvertTargetDir] = useState(defaultSettings.convertTargetDir);
  const [convertSourceFormats, setConvertSourceFormats] = useState<string[]>(defaultSettings.convertSourceFormats);
  const [convertTargetFormat, setConvertTargetFormat] = useState<ConvertTarget>(defaultSettings.convertTargetFormat);
  const [convertRecursive, setConvertRecursive] = useState(defaultSettings.convertRecursive);
  const [convertKeepStructure, setConvertKeepStructure] = useState(defaultSettings.convertKeepStructure);
  const [convertTgaBits, setConvertTgaBits] = useState<TgaBits>(defaultSettings.convertTgaBits);
  const [convertTgaRle, setConvertTgaRle] = useState(defaultSettings.convertTgaRle);
  const [convertBlpEncoding, setConvertBlpEncoding] = useState<BlpEncoding>(defaultSettings.convertBlpEncoding);
  const [convertBlpAlphaBits, setConvertBlpAlphaBits] = useState<BlpAlphaBits>(defaultSettings.convertBlpAlphaBits);
  const [convertBlpJpegQuality, setConvertBlpJpegQuality] = useState(defaultSettings.convertBlpJpegQuality);
  const [convertBlpMipmapCount, setConvertBlpMipmapCount] = useState(defaultSettings.convertBlpMipmapCount);
  const [convertBlpFilter, setConvertBlpFilter] = useState<ConvertFilter>(defaultSettings.convertBlpFilter);
  const [convertAlphaMode, setConvertAlphaMode] = useState<AlphaMode>(defaultSettings.convertAlphaMode);
  const [convertAlphaThreshold, setConvertAlphaThreshold] = useState(defaultSettings.convertAlphaThreshold);
  const [convertPngCompression, setConvertPngCompression] = useState<PngCompression>(defaultSettings.convertPngCompression);
  const [convertPngFilter, setConvertPngFilter] = useState<PngFilter>(defaultSettings.convertPngFilter);

  const applyConvertSettings = (next: Settings) => {
    setConvertSourceDir(next.convertSourceDir);
    setConvertTargetDir(next.convertTargetDir);
    setConvertSourceFormats(next.convertSourceFormats);
    setConvertTargetFormat(next.convertTargetFormat);
    setConvertRecursive(next.convertRecursive);
    setConvertKeepStructure(next.convertKeepStructure);
    setConvertTgaBits(next.convertTgaBits);
    setConvertTgaRle(next.convertTgaRle);
    setConvertBlpEncoding(next.convertBlpEncoding);
    setConvertBlpAlphaBits(next.convertBlpAlphaBits);
    setConvertBlpJpegQuality(next.convertBlpJpegQuality);
    setConvertBlpMipmapCount(next.convertBlpMipmapCount);
    setConvertBlpFilter(next.convertBlpFilter);
    setConvertAlphaMode(next.convertAlphaMode);
    setConvertAlphaThreshold(next.convertAlphaThreshold);
    setConvertPngCompression(next.convertPngCompression);
    setConvertPngFilter(next.convertPngFilter);
  };

  const currentConvertSettings = (base: Settings): Settings => ({
    ...base,
    convertSourceDir,
    convertTargetDir,
    convertSourceFormats,
    convertTargetFormat,
    convertRecursive,
    convertKeepStructure,
    convertTgaBits,
    convertTgaRle,
    convertBlpEncoding,
    convertBlpAlphaBits,
    convertBlpJpegQuality,
    convertBlpMipmapCount,
    convertBlpFilter,
    convertAlphaMode,
    convertAlphaThreshold,
    convertPngCompression,
    convertPngFilter,
  });

  const toggleConvertSourceFormat = (ext: string) => {
    setConvertSourceFormats((current) =>
      current.includes(ext) ? current.filter((item) => item !== ext) : [...current, ext],
    );
  };

  return {
    convertSourceDir,
    setConvertSourceDir,
    convertTargetDir,
    setConvertTargetDir,
    convertSourceFormats,
    setConvertSourceFormats,
    convertTargetFormat,
    setConvertTargetFormat,
    convertRecursive,
    setConvertRecursive,
    convertKeepStructure,
    setConvertKeepStructure,
    convertTgaBits,
    setConvertTgaBits,
    convertTgaRle,
    setConvertTgaRle,
    convertBlpEncoding,
    setConvertBlpEncoding,
    convertBlpAlphaBits,
    setConvertBlpAlphaBits,
    convertBlpJpegQuality,
    setConvertBlpJpegQuality,
    convertBlpMipmapCount,
    setConvertBlpMipmapCount,
    convertBlpFilter,
    setConvertBlpFilter,
    convertAlphaMode,
    setConvertAlphaMode,
    convertAlphaThreshold,
    setConvertAlphaThreshold,
    convertPngCompression,
    setConvertPngCompression,
    convertPngFilter,
    setConvertPngFilter,
    applyConvertSettings,
    currentConvertSettings,
    toggleConvertSourceFormat,
  };
}