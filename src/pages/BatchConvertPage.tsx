import { Button, Checkbox, Select, TextInput } from "@mantine/core";
import type {
  AlphaMode,
  BlpAlphaBits,
  BlpEncoding,
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
  convertBlpJpegAlpha: boolean;
  convertBlpMakeMipmaps: boolean;
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
  onBlpJpegAlphaChange: (value: boolean) => void;
  onBlpMakeMipmapsChange: (value: boolean) => void;
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
  return (
    <main className="batch-layout batch-convert-layout">
      <section className="batch-panel batch-convert-panel">
        <div className="batch-header batch-convert-header">
          <div>
            <h2>批量转换</h2>
            <span>支持 PNG/TGA/BLP 互转，可递归子目录并保持目录结构。</span>
          </div>
          <Button
            className={props.convertBusy ? "stop-action batch-convert-action" : "primary-action batch-convert-action"}
            disabled={props.convertBusy}
            onClick={props.onBatchConvert}
          >
            {props.convertBusy ? "转换中..." : "开始转换"}
          </Button>
        </div>

        <div className="batch-options batch-convert-options">
          <label className="batch-path-row">
            源文件夹
            <div className="path-picker path-picker-mantine">
              <TextInput value={props.convertSourceDir} readOnly placeholder="请选择源文件夹" />
              <Button type="button" className="ghost-button" onClick={props.onChooseSourceDir}>
                选择文件夹
              </Button>
            </div>
          </label>

          <label className="batch-path-row">
            目标文件夹
            <div className="path-picker path-picker-mantine">
              <TextInput value={props.convertTargetDir} readOnly placeholder="请选择目标文件夹" />
              <Button type="button" className="ghost-button" onClick={props.onChooseTargetDir}>
                选择文件夹
              </Button>
            </div>
          </label>

          <div className="field-group">
            <span className="field-label">源格式</span>
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
              目标格式
              <LabelHelp text="BLP：War3 纹理格式；PNG：通用无损；TGA：兼容传统美术流程。" />
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
              <span className="field-label compact-options-title">TGA 选项</span>
              <label>
                <span className="label-title">颜色位深</span>
                <Select
                  value={String(props.convertTgaBits)}
                  data={[
                    { value: "24", label: "24 位 RGB" },
                    { value: "32", label: "32 位 RGBA" },
                  ]}
                  onChange={(value) => value && props.onTgaBitsChange(Number(value) as TgaBits)}
                  allowDeselect={false}
                />
              </label>
              <Checkbox
                className="compact-inline-check"
                label="RLE 压缩"
                checked={props.convertTgaRle}
                onChange={(e) => props.onTgaRleChange(e.currentTarget.checked)}
              />
            </div>
          )}

          {props.convertTargetFormat === "blp" && (
            <div className="field-group blp-options-grid">
              <span className="field-label blp-options-title">BLP 选项</span>
              <label className="blp-encoding-field">
                <span className="label-title">
                  编码
                  <LabelHelp text="RAW1：调色板编码，体积小、兼容传统贴图；JPEG：有损压缩，适合照片类内容。" />
                </span>
                <Select
                  value={props.convertBlpEncoding}
                  data={[
                    { value: "raw1", label: "RAW1 (调色板)" },
                    { value: "jpeg", label: "JPEG" },
                  ]}
                  onChange={(value) => value && props.onBlpEncodingChange(value as BlpEncoding)}
                  allowDeselect={false}
                />
              </label>

              <label className="blp-filter-field">
                <span className="label-title">
                  缩放滤镜
                  <LabelHelp text="Nearest：最快；Triangle：平滑基础；CatmullRom：清晰均衡；Gaussian：更柔和；Lanczos3：细节最好但最慢。" />
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
                    Alpha 位数
                    <LabelHelp text="0：不保留透明；1/4：低精度透明；8：完整 8bit 透明，质量最好但体积更大。" />
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
                <Checkbox
                  className="blp-inline-check blp-alpha-bits-field"
                  label="JPEG 模式保留 Alpha"
                  checked={props.convertBlpJpegAlpha}
                  onChange={(e) => props.onBlpJpegAlphaChange(e.currentTarget.checked)}
                />
              )}

              <label className="blp-alpha-mode-field">
                <span className="label-title">
                  Alpha 处理模式
                  <LabelHelp text="直通：保留原始 Alpha；阈值：按阈值二值化透明；反预乘：把预乘 Alpha 还原为直通颜色。" />
                </span>
                <div className="alpha-mode-control">
                  <Select
                    value={props.convertAlphaMode}
                    data={[
                      { value: "passthrough", label: "直通" },
                      { value: "threshold", label: "阈值" },
                      { value: "unpremultiply", label: "反预乘" },
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
                      aria-label="Alpha 阈值"
                    />
                  )}
                </div>
              </label>

              <Checkbox
                className="blp-inline-check blp-mipmap-field"
                label="生成 Mipmap"
                checked={props.convertBlpMakeMipmaps}
                onChange={(e) => props.onBlpMakeMipmapsChange(e.currentTarget.checked)}
              />
            </div>
          )}

          {props.convertTargetFormat === "png" && (
            <div className="field-group png-options compact-convert-options">
              <span className="field-label compact-options-title">PNG 选项</span>
              <label>
                <span className="label-title">
                  压缩级别
                  <LabelHelp text="默认：平衡速度与体积；快速：编码更快、体积稍大；最佳：体积最小、耗时更长。" />
                </span>
                <Select
                  value={props.convertPngCompression}
                  data={[
                    { value: "default", label: "默认" },
                    { value: "fast", label: "快速" },
                    { value: "best", label: "最佳" },
                  ]}
                  onChange={(value) => value && props.onPngCompressionChange(value as PngCompression)}
                  allowDeselect={false}
                />
              </label>
              <label>
                <span className="label-title">
                  滤波器
                  <LabelHelp text="Adaptive：自动选择；None：不滤波；Sub/Up/Avg/Paeth：不同扫描线预测策略，影响压缩体积与速度。" />
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
                  Alpha 处理模式
                  <LabelHelp text="直通：保留原始 Alpha；阈值：按阈值二值化透明；反预乘：把预乘 Alpha 还原为直通颜色。" />
                </span>
                <div className="alpha-mode-control">
                  <Select
                    value={props.convertAlphaMode}
                    data={[
                      { value: "passthrough", label: "直通" },
                      { value: "threshold", label: "阈值" },
                      { value: "unpremultiply", label: "反预乘" },
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
                      aria-label="Alpha 阈值"
                    />
                  )}
                </div>
              </label>
            </div>
          )}

          <Checkbox
            className="convert-flag-row"
            label="解析子文件夹"
            checked={props.convertRecursive}
            onChange={(e) => props.onRecursiveChange(e.currentTarget.checked)}
          />

          <Checkbox
            className="convert-flag-row"
            label="保持文件夹结构"
            checked={props.convertKeepStructure}
            onChange={(e) => props.onKeepStructureChange(e.currentTarget.checked)}
          />
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
