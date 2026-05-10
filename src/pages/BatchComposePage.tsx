import { useTranslation } from "react-i18next";
import { Button, Checkbox, TextInput } from "@mantine/core";

type Props = {
  composeBusy: boolean;
  composeBaseDir: string;
  composeLowerOverlayPath: string;
  composeUpperOverlayPath: string;
  composeTargetDir: string;
  composeRecursive: boolean;
  composeKeepStructure: boolean;
  composeLogs: string[];
  onChooseBaseDir: () => Promise<void>;
  onChooseLowerOverlay: () => Promise<void>;
  onChooseUpperOverlay: () => Promise<void>;
  onClearLowerOverlay: () => void;
  onClearUpperOverlay: () => void;
  onChooseTargetDir: () => Promise<void>;
  onComposeRecursiveChange: (value: boolean) => void;
  onComposeKeepStructureChange: (value: boolean) => void;
  onBatchCompose: () => Promise<void>;
};

export function BatchComposePage(props: Props) {
  const { t } = useTranslation();

  return (
    <main className="batch-layout batch-convert-layout">
      <section className="batch-panel batch-convert-panel">
        <div className="batch-header batch-convert-header">
          <div>
            <h2>{t("compose.title")}</h2>
            <span>{t("compose.subtitle")}</span>
          </div>
          <Button
            className={props.composeBusy ? "stop-action batch-convert-action" : "primary-action batch-convert-action"}
            disabled={props.composeBusy}
            onClick={props.onBatchCompose}
          >
            {props.composeBusy ? t("compose.busy") : t("compose.start")}
          </Button>
        </div>

        <div className="batch-options batch-convert-options">
          <label className="batch-path-row">
            {t("compose.baseDir")}
            <div className="path-picker path-picker-mantine">
              <TextInput value={props.composeBaseDir} readOnly placeholder={t("compose.baseDirPlaceholder")} />
              <Button type="button" className="ghost-button" onClick={props.onChooseBaseDir}>
                {t("compose.chooseFolder")}
              </Button>
            </div>
          </label>

          <label className="batch-path-row">
            {t("compose.upperOverlay")}
            <div className="path-picker path-picker-mantine">
              <TextInput value={props.composeUpperOverlayPath} readOnly placeholder={t("compose.upperPlaceholder")} />
              <Button
                type="button"
                className="ghost-button"
                onClick={props.composeUpperOverlayPath ? props.onClearUpperOverlay : props.onChooseUpperOverlay}
              >
                {props.composeUpperOverlayPath ? t("compose.clearImage") : t("compose.chooseImage")}
              </Button>
            </div>
          </label>

          <label className="batch-path-row">
            {t("compose.lowerOverlay")}
            <div className="path-picker path-picker-mantine">
              <TextInput value={props.composeLowerOverlayPath} readOnly placeholder={t("compose.lowerPlaceholder")} />
              <Button
                type="button"
                className="ghost-button"
                onClick={props.composeLowerOverlayPath ? props.onClearLowerOverlay : props.onChooseLowerOverlay}
              >
                {props.composeLowerOverlayPath ? t("compose.clearImage") : t("compose.chooseImage")}
              </Button>
            </div>
          </label>

          <label className="batch-path-row">
            {t("compose.outputDir")}
            <div className="path-picker path-picker-mantine">
              <TextInput value={props.composeTargetDir} readOnly placeholder={t("compose.outputPlaceholder")} />
              <Button type="button" className="ghost-button" onClick={props.onChooseTargetDir}>
                {t("compose.chooseFolder")}
              </Button>
            </div>
          </label>

          <div className="convert-flag-inline-row">
            <Checkbox
              className="convert-flag-row"
              label={t("compose.recursive")}
              checked={props.composeRecursive}
              onChange={(e) => props.onComposeRecursiveChange(e.currentTarget.checked)}
            />

            <Checkbox
              className="convert-flag-row"
              label={t("compose.keepStructure")}
              checked={props.composeKeepStructure}
              onChange={(e) => props.onComposeKeepStructureChange(e.currentTarget.checked)}
            />
          </div>
        </div>
      </section>

      <section className="batch-results">
        <section className="batch-result-list batch-generate-results">
          <div className="batch-result-status-row">
            <strong>{t("compose.logs")}</strong>
          </div>
          {props.composeLogs.length === 0 ? (
            <div className="batch-results-empty">{t("compose.empty")}</div>
          ) : (
            <div className="log-output compact-log-output">
              {props.composeLogs.map((line, index) => (
                <div key={`${index}-${line.slice(0, 24)}`}>{line}</div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}