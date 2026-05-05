type ConvertTarget = "png" | "tga" | "blp";

type Props = {
  convertBusy: boolean;
  convertSourceDir: string;
  convertTargetDir: string;
  convertSourceFormats: string[];
  convertTargetFormat: ConvertTarget;
  convertRecursive: boolean;
  convertKeepStructure: boolean;
  logs: string[];
  onChooseSourceDir: () => Promise<void>;
  onChooseTargetDir: () => Promise<void>;
  onToggleSourceFormat: (ext: string) => void;
  onTargetFormatChange: (value: ConvertTarget) => void;
  onRecursiveChange: (value: boolean) => void;
  onKeepStructureChange: (value: boolean) => void;
  onBatchConvert: () => Promise<void>;
};

export function BatchConvertPage(props: Props) {
  return (
    <main className="batch-layout">
      <section className="batch-panel">
        <div className="batch-header">
          <div>
            <h2>批量转换</h2>
            <span>支持 PNG/TGA/BLP 互转，可递归子目录并保持目录结构。</span>
          </div>
          <button className={props.convertBusy ? "stop-action" : "primary-action"} disabled={props.convertBusy} onClick={props.onBatchConvert}>
            {props.convertBusy ? "转换中..." : "开始转换"}
          </button>
        </div>
        <div className="batch-options">
          <label className="batch-path-row">源文件夹
            <div className="path-picker">
              <input value={props.convertSourceDir} readOnly placeholder="请选择源文件夹" />
              <button type="button" className="ghost-button" onClick={props.onChooseSourceDir}>选择文件夹</button>
            </div>
          </label>
          <label className="batch-path-row">目标文件夹
            <div className="path-picker">
              <input value={props.convertTargetDir} readOnly placeholder="请选择目标文件夹" />
              <button type="button" className="ghost-button" onClick={props.onChooseTargetDir}>选择文件夹</button>
            </div>
          </label>
          <div className="field-group">
            <span className="field-label">源格式</span>
            <div className="format-checks">
              {["png", "tga", "blp", "jpg", "jpeg", "webp"].map((ext) => (
                <label key={ext} className="checkbox-row">
                  <input type="checkbox" checked={props.convertSourceFormats.includes(ext)} onChange={() => props.onToggleSourceFormat(ext)} />
                  <span>{ext.toUpperCase()}</span>
                </label>
              ))}
            </div>
          </div>
          <label>目标格式
            <select value={props.convertTargetFormat} onChange={(e) => props.onTargetFormatChange(e.target.value as ConvertTarget)}>
              <option value="blp">BLP</option>
              <option value="png">PNG</option>
              <option value="tga">TGA</option>
            </select>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={props.convertRecursive} onChange={(e) => props.onRecursiveChange(e.target.checked)} />
            <span>解析子文件夹</span>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={props.convertKeepStructure} onChange={(e) => props.onKeepStructureChange(e.target.checked)} />
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
