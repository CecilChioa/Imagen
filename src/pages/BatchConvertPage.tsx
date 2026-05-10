import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Checkbox, Select, TextInput } from "@mantine/core";
import type {
  AlphaMode,
  BlpAlphaBits,
  BlpEncoding,
  BlpMipmapCount,
  ConvertFilter,
  ConvertTarget,
  PngCompression,
  PngFilter,
  TgaBits,
} from "../types/app";

type Props = {
  convertBusy: boolean;
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
  convertBlpJpegQuality: number;
  convertBlpMipmapCount: BlpMipmapCount;
  convertBlpFilter: ConvertFilter;
  convertAlphaMode: AlphaMode;
  convertAlphaThreshold: number;
  convertPngCompression: PngCompression;
  convertPngFilter: PngFilter;
  logs: string[];
  onChooseSourceDir: () => Promise<void>;
  onChooseTargetDir: () => Promise<void>;
  onToggleSourceFormat: (ext: string) => void;
  onTargetFormatChange: (value: ConvertTarget) => void;
  onRecursiveChange: (value: boolean) => void;
  onKeepStructureChange: (value: boolean) => void;
  onTgaBitsChange: (value: TgaBits) => void;
  onTgaRleChange: (value: boolean) => void;
  onBlpEncodingChange: (value: BlpEncoding) => void;
  onBlpAlphaBitsChange: (value: BlpAlphaBits) => void;
  onBlpJpegQualityChange: (value: number) => void;
  onBlpMipmapCountChange: (value: BlpMipmapCount) => void;
  onBlpFilterChange: (value: ConvertFilter) => void;
  onAlphaModeChange: (value: AlphaMode) => void;
  onAlphaThresholdChange: (value: number) => void;
  onPngCompressionChange: (value: PngCompression) => void;
  onPngFilterChange: (value: PngFilter) => void;
  onBatchConvert: () => Promise<void>;
};

const sourceFormats = ["png", "tga", "blp", "jpg", "jpeg", "webp"];

function LabelHelp({ text }: { text: string }) {
  return (
    <span className="label-help" aria-label={text} role="note" tabIndex={0}>
      ?
      <span className="label-help-tooltip">{text}</span>
    </span>
  );
}

export function BatchConvertPage(props: Props) {
  const { t } = useTranslation();
  const [jpegQualityInput, setJpegQualityInput] = useState(String(props.convertBlpJpegQuality));

  useEffect(() => {
    setJpegQualityInput(String(props.convertBlpJpegQuality));
  }, [props.convertBlpJpegQuality]);

  const commitJpegQuality = (value: string) => {
    const next = Math.max(1, Math.min(100, Number(value) || 1));
    setJpegQualityInput(String(next));
    props.onBlpJpegQualityChange(next);
  };

  return (
    <main className="batch-layout batch-convert-layout">
      <section className="batch-panel batch-convert-panel">
        <div className="batch-header batch-convert-header">
          <div>
            <h2>{t("convert.title")}</h2>
            <span>{t("convert.subtitle")}</span>
          </div>
          <Button
            className={props.convertBusy ? "stop-action batch-convert-action" : "primary-action batch-convert-action"}
            disabled={props.convertBusy}
            onClick={props.onBatchConvert}
          >
            {props.convertBusy ? t("convert.busy") : t("convert.start")}
          </Button>
        </div>

        <div className="batch-options batch-convert-options">
          <label className="batch-path-row">
            {t("convert.sourceDir")}
            <div className="path-picker path-picker-mantine">
              <TextInput value={props.convertSourceDir} readOnly placeholder={t("convert.sourceDirPlaceholder")} />
              <Button type="button" className="ghost-button" onClick={props.onChooseSourceDir}>
                {t("convert.chooseFolder")}
              </Button>
            </div>
          </label>

          <label className="batch-path-row">
            {t("convert.targetDir")}
            <div className="path-picker path-picker-mantine">
              <TextInput value={props.convertTargetDir} readOnly placeholder={t("convert.targetDirPlaceholder")} />
              <Button type="button" className="ghost-button" onClick={props.onChooseTargetDir}>
                {t("convert.chooseFolder")}
              </Button>
            </div>
          </label>

          <div className="field-group">
            <span className="field-label">{t("convert.sourceFormats")}</span>
            <div className="format-checks format-checks-mantine">
              {sourceFormats.map((ext) => (
                <Checkbox
                  key={ext}
                  className="format-check-item"
                  label={ext.toUpperCase()}
                  checked={props.convertSourceFormats.includes(ext)}
                  onChange={() => props.onToggleSourceFormat(ext)}
                />
              ))}
            </div>
          </div>

          <label>
            <span className="label-title">
              {t("convert.targetFormat")}
              <LabelHelp text={t("convert.targetFormatHelp")} />
            </span>
            <Select
              value={props.convertTargetFormat}
              data={[
                { value: "blp", label: "BLP" },
                { value: "png", label: "PNG" },
                { value: "tga", label: "TGA" },
              ]}
              onChange={(value) => value && props.onTargetFormatChange(value as ConvertTarget)}
              allowDeselect={false}
            />
          </label>

          {props.convertTargetFormat === "tga" && (
            <div className="field-group tga-options compact-convert-options">
              <span className="field-label compact-options-title">{t("convert.tgaOptions")}</span>
              <label>
                <span className="label-title">{t("convert.tgaBits")}</span>
                <Select
                  value={String(props.convertTgaBits)}
                  data={[
                    { value: "24", label: t("convert.tga24") },
                    { value: "32", label: t("convert.tga32") },
                  ]}
                  onChange={(value) => value && props.onTgaBitsChange(Number(value) as TgaBits)}
                  allowDeselect={false}
                />
              </label>
              <Checkbox
                className="compact-inline-check"
                label={t("convert.tgaRle")}
                checked={props.convertTgaRle}
                onChange={(e) => props.onTgaRleChange(e.currentTarget.checked)}
              />
            </div>
          )}

          {props.convertTargetFormat === "blp" && (
            <div className="field-group blp-options-grid">
              <span className="field-label blp-options-title">{t("convert.blpOptions")}</span>
              <label className="blp-encoding-field">
                <span className="label-title">
                  {t("convert.blpEncoding")}
                  <LabelHelp text={t("convert.blpEncodingHelp")} />
                </span>
                <Select
                  value={props.convertBlpEncoding}
                  data={[
                    { value: "raw1", label: t("convert.blpEncodingRaw1") },
                    { value: "jpeg", label: "JPEG" },
                  ]}
                  onChange={(value) => value && props.onBlpEncodingChange(value as BlpEncoding)}
                  allowDeselect={false}
                />
              </label>

              <label className="blp-filter-field">
                <span className="label-title">
                  {t("convert.blpFilter")}
                  <LabelHelp text={t("convert.blpFilterHelp")} />
                </span>
                <Select
                  value={props.convertBlpFilter}
                  data={[
                    { value: "nearest", label: "Nearest" },
                    { value: "triangle", label: "Triangle" },
                    { value: "catmullrom", label: "CatmullRom" },
                    { value: "gaussian", label: "Gaussian" },
                    { value: "lanczos3", label: "Lanczos3" },
                  ]}
                  onChange={(value) => value && props.onBlpFilterChange(value as ConvertFilter)}
                  allowDeselect={false}
                />
              </label>

              {props.convertBlpEncoding === "raw1" ? (
                <label className="blp-alpha-bits-field">
                  <span className="label-title">
                    {t("convert.blpAlphaBits")}
                    <LabelHelp text={t("convert.blpAlphaBitsHelp")} />
                  </span>
                  <Select
                    value={String(props.convertBlpAlphaBits)}
                    data={[
                      { value: "0", label: "0" },
                      { value: "1", label: "1" },
                      { value: "4", label: "4" },
                      { value: "8", label: "8" },
                    ]}
                    onChange={(value) => value && props.onBlpAlphaBitsChange(Number(value) as BlpAlphaBits)}
                    allowDeselect={false}
                  />
                </label>
              ) : (
                <label className="blp-alpha-bits-field">
                  <span className="label-title">
                    {t("convert.blpJpegQuality")}
                    <LabelHelp text={t("convert.blpJpegQualityHelp")} />
                  </span>
                  <TextInput
                    type="number"
                    min={1}
                    max={100}
                    value={jpegQualityInput}
                    onChange={(e) => setJpegQualityInput(e.currentTarget.value)}
                    onBlur={(e) => commitJpegQuality(e.currentTarget.value)}
                    aria-label={t("convert.blpJpegQuality")}
                  />
                </label>
              )}

              <label className="blp-alpha-mode-field">
                <span className="label-title">
                  {t("convert.alphaMode")}
                  <LabelHelp text={t("convert.alphaModeHelp")} />
                </span>
                <div className="alpha-mode-control">
                  <Select
                    value={props.convertAlphaMode}
                    data={[
                      { value: "passthrough", label: t("convert.alphaModePassthrough") },
                      { value: "threshold", label: t("convert.alphaModeThreshold") },
                      { value: "unpremultiply", label: t("convert.alphaModeUnpremultiply") },
                    ]}
                    onChange={(value) => value && props.onAlphaModeChange(value as AlphaMode)}
                    allowDeselect={false}
                  />
                  {props.convertAlphaMode === "threshold" && (
                    <TextInput
                      className="threshold-input"
                      type="number"
                      min={0}
                      max={255}
                      value={String(props.convertAlphaThreshold)}
                      onChange={(e) => props.onAlphaThresholdChange(Math.max(0, Math.min(255, Number(e.currentTarget.value) || 0)))}
                      aria-label={t("convert.alphaThreshold")}
                    />
                  )}
                </div>
              </label>

              <label className="blp-mipmap-field">
                <span className="label-title">
                  {t("convert.blpMipmapCount")}
                  <LabelHelp text={t("convert.blpMipmapCountHelp")} />
                </span>
                <TextInput
                  type="number"
                  min={1}
                  max={16}
                  value={String(props.convertBlpMipmapCount)}
                  onChange={(e) =>
                    props.onBlpMipmapCountChange(Math.max(1, Math.min(16, Number(e.currentTarget.value) || 1)) as BlpMipmapCount)
                  }
                  aria-label={t("convert.blpMipmapCount")}
                />
              </label>
            </div>
          )}

          {props.convertTargetFormat === "png" && (
            <div className="field-group png-options compact-convert-options">
              <span className="field-label compact-options-title">{t("convert.pngOptions")}</span>
              <label>
                <span className="label-title">
                  {t("convert.pngCompression")}
                  <LabelHelp text={t("convert.pngCompressionHelp")} />
                </span>
                <Select
                  value={props.convertPngCompression}
                  data={[
                    { value: "default", label: t("convert.pngCompressionDefault") },
                    { value: "fast", label: t("convert.pngCompressionFast") },
                    { value: "best", label: t("convert.pngCompressionBest") },
                  ]}
                  onChange={(value) => value && props.onPngCompressionChange(value as PngCompression)}
                  allowDeselect={false}
                />
              </label>
              <label>
                <span className="label-title">
                  {t("convert.pngFilter")}
                  <LabelHelp text={t("convert.pngFilterHelp")} />
                </span>
                <Select
                  value={props.convertPngFilter}
                  data={[
                    { value: "adaptive", label: "Adaptive" },
                    { value: "none", label: "None" },
                    { value: "sub", label: "Sub" },
                    { value: "up", label: "Up" },
                    { value: "avg", label: "Avg" },
                    { value: "paeth", label: "Paeth" },
                  ]}
                  onChange={(value) => value && props.onPngFilterChange(value as PngFilter)}
                  allowDeselect={false}
                />
              </label>
            </div>
          )}

          {props.convertTargetFormat !== "blp" && (
            <div className="field-group alpha-options">
              <label>
                <span className="label-title">
                  {t("convert.alphaMode")}
                  <LabelHelp text={t("convert.alphaModeHelp")} />
                </span>
                <div className="alpha-mode-control">
                  <Select
                    value={props.convertAlphaMode}
                    data={[
                      { value: "passthrough", label: t("convert.alphaModePassthrough") },
                      { value: "threshold", label: t("convert.alphaModeThreshold") },
                      { value: "unpremultiply", label: t("convert.alphaModeUnpremultiply") },
                    ]}
                    onChange={(value) => value && props.onAlphaModeChange(value as AlphaMode)}
                    allowDeselect={false}
                  />
                  {props.convertAlphaMode === "threshold" && (
                    <TextInput
                      className="threshold-input"
                      type="number"
                      min={0}
                      max={255}
                      value={String(props.convertAlphaThreshold)}
                      onChange={(e) => props.onAlphaThresholdChange(Math.max(0, Math.min(255, Number(e.currentTarget.value) || 0)))}
                      aria-label={t("convert.alphaThreshold")}
                    />
                  )}
                </div>
              </label>
            </div>
          )}

          <div className="convert-flag-inline-row">
            <Checkbox
              className="convert-flag-row"
              label={t("compose.recursive")}
              checked={props.convertRecursive}
              onChange={(e) => props.onRecursiveChange(e.currentTarget.checked)}
            />

            <Checkbox
              className="convert-flag-row"
              label={t("compose.keepStructure")}
              checked={props.convertKeepStructure}
              onChange={(e) => props.onKeepStructureChange(e.currentTarget.checked)}
            />
          </div>
        </div>
      </section>

      <section className="batch-results">
        <section className="log-panel batch-log-panel">
          <pre>{props.logs.join("\n")}</pre>
        </section>
      </section>
    </main>
  );
}