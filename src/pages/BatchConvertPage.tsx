type ConvertTarget = "png" | "tga" | "blp";
type TgaBits = 16 | 24 | 32;
type BlpEncoding = "raw1" | "jpeg";
type BlpAlphaBits = 0 | 1 | 4 | 8;
type ConvertFilter = "nearest" | "triangle" | "catmullrom" | "gaussian" | "lanczos3";
type AlphaMode = "passthrough" | "threshold" | "unpremultiply";
type PngCompression = "default" | "fast" | "best";
type PngFilter = "adaptive" | "none" | "sub" | "up" | "avg" | "paeth";

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
const tgaBitsOptions: TgaBits[] = [16, 24, 32];

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
            目标格式
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
            <div className="field-group tga-options">
              <span className="field-label">Targa 选项</span>
              <div className="segmented-options">
                {tgaBitsOptions.map((bits) => (
                  <label key={bits} className="radio-chip">
                    <input
                      type="radio"
                      name="tgaBits"
                      checked={props.convertTgaBits === bits}
                      onChange={() => props.onTgaBitsChange(bits)}
                    />
                    <span>{bits} 位/像素</span>
                  </label>
                ))}
              </div>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={props.convertTgaRle}
                  onChange={(e) => props.onTgaRleChange(e.target.checked)}
                />
                <span>压缩 (RLE)</span>
              </label>
            </div>
          )}

          {props.convertTargetFormat === "blp" && (
            <div className="field-group">
              <span className="field-label">BLP 选项</span>
              <label>
                编码
                <select
                  value={props.convertBlpEncoding}
                  onChange={(e) => props.onBlpEncodingChange(e.target.value as BlpEncoding)}
                >
                  <option value="raw1">RAW1 (调色板)</option>
                  <option value="jpeg">JPEG</option>
                </select>
              </label>

              {props.convertBlpEncoding === "raw1" && (
                <label>
                  Alpha 位数
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
              )}

              {props.convertBlpEncoding === "jpeg" && (
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={props.convertBlpJpegAlpha}
                    onChange={(e) => props.onBlpJpegAlphaChange(e.target.checked)}
                  />
                  <span>JPEG 模式保留 Alpha</span>
                </label>
              )}

              <label>
                缩放滤镜
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

              <label className="checkbox-row">
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
            <div className="field-group">
              <span className="field-label">PNG 选项</span>
              <label>
                压缩级别
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
                滤波器
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

          <div className="field-group">
            <span className="field-label">Alpha 处理</span>
            <label>
              模式
              <select
                value={props.convertAlphaMode}
                onChange={(e) => props.onAlphaModeChange(e.target.value as AlphaMode)}
              >
                <option value="passthrough">直通</option>
                <option value="threshold">阈值</option>
                <option value="unpremultiply">反预乘</option>
              </select>
            </label>
            {props.convertAlphaMode === "threshold" && (
              <label>
                阈值
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={props.convertAlphaThreshold}
                  onChange={(e) => props.onAlphaThresholdChange(Math.max(0, Math.min(255, Number(e.target.value) || 0)))}
                />
              </label>
            )}
          </div>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={props.convertRecursive}
              onChange={(e) => props.onRecursiveChange(e.target.checked)}
            />
            <span>解析子文件夹</span>
          </label>

          <label className="checkbox-row">
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
