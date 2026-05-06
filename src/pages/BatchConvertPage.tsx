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
    <main className="batch-layout">
      <section className="batch-panel">
        <div className="batch-header">
          <div>
            <h2>批量转换</h2>
            <span>支持 PNG/TGA/BLP 互转，可递归子目录并保持目录结构。</span>
          </div>
          <button
            className={props.convertBusy ? "stop-action" : "primary-action"}
            disabled={props.convertBusy}
            onClick={props.onBatchConvert}
          >
            {props.convertBusy ? "转换中..." : "开始转换"}
          </button>
        </div>

        <div className="batch-options">
          <label className="batch-path-row">
            源文件夹
            <div className="path-picker">
              <input value={props.convertSourceDir} readOnly placeholder="请选择源文件夹" />
              <button type="button" className="ghost-button" onClick={props.onChooseSourceDir}>
                选择文件夹
              </button>
            </div>
          </label>

          <label className="batch-path-row">
            目标文件夹
            <div className="path-picker">
              <input value={props.convertTargetDir} readOnly placeholder="请选择目标文件夹" />
              <button type="button" className="ghost-button" onClick={props.onChooseTargetDir}>
                选择文件夹
              </button>
            </div>
          </label>

          <div className="field-group">
            <span className="field-label">源格式</span>
            <div className="format-checks">
              {sourceFormats.map((ext) => (
                <label key={ext} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={props.convertSourceFormats.includes(ext)}
                    onChange={() => props.onToggleSourceFormat(ext)}
                  />
                  <span>{ext.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>

          <label>
            <span className="label-title">
              目标格式
              <LabelHelp text="BLP：War3 纹理格式；PNG：通用无损；TGA：兼容传统美术流程。" />
            </span>
            <select
              value={props.convertTargetFormat}
              onChange={(e) => props.onTargetFormatChange(e.target.value as ConvertTarget)}
            >
              <option value="blp">BLP</option>
              <option value="png">PNG</option>
              <option value="tga">TGA</option>
            </select>
          </label>

          {props.convertTargetFormat === "tga" && (
            <div className="field-group tga-options compact-convert-options">
              <span className="field-label compact-options-title">TGA 选项</span>
              <label>
                <span className="label-title">颜色位深</span>
                <select
                  value={String(props.convertTgaBits)}
                  onChange={(e) => props.onTgaBitsChange(Number(e.target.value) as TgaBits)}
                >
                  <option value="24">24 位 RGB</option>
                  <option value="32">32 位 RGBA</option>
                </select>
              </label>
              <label className="checkbox-row compact-inline-check">
                <input
                  type="checkbox"
                  checked={props.convertTgaRle}
                  onChange={(e) => props.onTgaRleChange(e.target.checked)}
                />
                <span>RLE 压缩</span>
              </label>
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
                <select
                  value={props.convertBlpEncoding}
                  onChange={(e) => props.onBlpEncodingChange(e.target.value as BlpEncoding)}
                >
                  <option value="raw1">RAW1 (调色板)</option>
                  <option value="jpeg">JPEG</option>
                </select>
              </label>

              <label className="blp-filter-field">
                <span className="label-title">
                  缩放滤镜
                  <LabelHelp text="Nearest：最快；Triangle：平滑基础；CatmullRom：清晰均衡；Gaussian：更柔和；Lanczos3：细节最好但最慢。" />
                </span>
                <select
                  value={props.convertBlpFilter}
                  onChange={(e) => props.onBlpFilterChange(e.target.value as ConvertFilter)}
                >
                  <option value="nearest">Nearest</option>
                  <option value="triangle">Triangle</option>
                  <option value="catmullrom">CatmullRom</option>
                  <option value="gaussian">Gaussian</option>
                  <option value="lanczos3">Lanczos3</option>
                </select>
              </label>

              {props.convertBlpEncoding === "raw1" ? (
                <label className="blp-alpha-bits-field">
                  <span className="label-title">
                    Alpha 位数
                    <LabelHelp text="0：不保留透明；1/4：低精度透明；8：完整 8bit 透明，质量最好但体积更大。" />
                  </span>
                  <select
                    value={String(props.convertBlpAlphaBits)}
                    onChange={(e) => props.onBlpAlphaBitsChange(Number(e.target.value) as BlpAlphaBits)}
                  >
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="4">4</option>
                    <option value="8">8</option>
                  </select>
                </label>
              ) : (
                <label className="checkbox-row blp-inline-check blp-alpha-bits-field">
                  <input
                    type="checkbox"
                    checked={props.convertBlpJpegAlpha}
                    onChange={(e) => props.onBlpJpegAlphaChange(e.target.checked)}
                  />
                  <span>JPEG 模式保留 Alpha</span>
                </label>
              )}

              <label className="blp-alpha-mode-field">
                <span className="label-title">
                  Alpha 处理模式
                  <LabelHelp text="直通：保留原始 Alpha；阈值：按阈值二值化透明；反预乘：把预乘 Alpha 还原为直通颜色。" />
                </span>
                <div className="alpha-mode-control">
                  <select
                    value={props.convertAlphaMode}
                    onChange={(e) => props.onAlphaModeChange(e.target.value as AlphaMode)}
                  >
                    <option value="passthrough">直通</option>
                    <option value="threshold">阈值</option>
                    <option value="unpremultiply">反预乘</option>
                  </select>
                  {props.convertAlphaMode === "threshold" && (
                    <input
                      className="threshold-input"
                      type="number"
                      min={0}
                      max={255}
                      value={props.convertAlphaThreshold}
                      onChange={(e) => props.onAlphaThresholdChange(Math.max(0, Math.min(255, Number(e.target.value) || 0)))}
                      aria-label="Alpha 阈值"
                    />
                  )}
                </div>
              </label>

              <label className="checkbox-row blp-inline-check blp-mipmap-field">
                <input
                  type="checkbox"
                  checked={props.convertBlpMakeMipmaps}
                  onChange={(e) => props.onBlpMakeMipmapsChange(e.target.checked)}
                />
                <span>生成 Mipmap</span>
              </label>
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
                <select
                  value={props.convertPngCompression}
                  onChange={(e) => props.onPngCompressionChange(e.target.value as PngCompression)}
                >
                  <option value="default">默认</option>
                  <option value="fast">快速</option>
                  <option value="best">最佳</option>
                </select>
              </label>
              <label>
                <span className="label-title">
                  滤波器
                  <LabelHelp text="Adaptive：自动选择；None：不滤波；Sub/Up/Avg/Paeth：不同扫描线预测策略，影响压缩体积与速度。" />
                </span>
                <select
                  value={props.convertPngFilter}
                  onChange={(e) => props.onPngFilterChange(e.target.value as PngFilter)}
                >
                  <option value="adaptive">Adaptive</option>
                  <option value="none">None</option>
                  <option value="sub">Sub</option>
                  <option value="up">Up</option>
                  <option value="avg">Avg</option>
                  <option value="paeth">Paeth</option>
                </select>
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
                  <select
                    value={props.convertAlphaMode}
                    onChange={(e) => props.onAlphaModeChange(e.target.value as AlphaMode)}
                  >
                    <option value="passthrough">直通</option>
                    <option value="threshold">阈值</option>
                    <option value="unpremultiply">反预乘</option>
                  </select>
                  {props.convertAlphaMode === "threshold" && (
                    <input
                      className="threshold-input"
                      type="number"
                      min={0}
                      max={255}
                      value={props.convertAlphaThreshold}
                      onChange={(e) => props.onAlphaThresholdChange(Math.max(0, Math.min(255, Number(e.target.value) || 0)))}
                      aria-label="Alpha 阈值"
                    />
                  )}
                </div>
              </label>
            </div>
          )}

          <label className="checkbox-row convert-flag-row">
            <input
              type="checkbox"
              checked={props.convertRecursive}
              onChange={(e) => props.onRecursiveChange(e.target.checked)}
            />
            <span>解析子文件夹</span>
          </label>

          <label className="checkbox-row convert-flag-row">
            <input
              type="checkbox"
              checked={props.convertKeepStructure}
              onChange={(e) => props.onKeepStructureChange(e.target.checked)}
            />
            <span>保持文件夹结构</span>
          </label>
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
