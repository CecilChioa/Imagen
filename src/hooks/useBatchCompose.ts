import { useEffect, useState } from "react";
import { appendBoundedLogs, CONVERT_LOG_LIMIT, resetBoundedLogs } from "../config/generation";
import i18n from "../i18n";
import { chooseDirectory, chooseImageFile, COMPOSE_IMAGE_EXTENSIONS } from "../lib/filePickers";
import { invokeCommand } from "../lib/tauri";
import type { BatchComposeResult, Settings } from "../types/app";

type Params = {
  settings: Settings;
  persistSettings: (next: Settings) => Promise<void>;
  setStatus: (value: string) => void;
};

const formatLog = (value: unknown) => JSON.stringify(value, null, 2);

export function useBatchCompose(params: Params) {
  const { settings, persistSettings, setStatus } = params;
  const [composeLogs, setComposeLogs] = useState<string[]>([]);
  const [composeBusy, setComposeBusy] = useState(false);
  const [composeBaseDir, setComposeBaseDir] = useState("");
  const [composeLowerOverlayPath, setComposeLowerOverlayPath] = useState("");
  const [composeUpperOverlayPath, setComposeUpperOverlayPath] = useState("");
  const [composeTargetDir, setComposeTargetDir] = useState("");
  const [composeRecursive, setComposeRecursive] = useState(true);
  const [composeKeepStructure, setComposeKeepStructure] = useState(true);

  useEffect(() => {
    setComposeBaseDir(settings.composeBaseDir);
    setComposeTargetDir(settings.composeTargetDir);
  }, [settings.composeBaseDir, settings.composeTargetDir]);

  const onChooseComposeBaseDir = async () => {
    const dir = await chooseDirectory(i18n.t("compose.baseDir"));
    if (!dir) return;
    setComposeBaseDir(dir);
    await persistSettings({
      ...settings,
      composeBaseDir: dir,
      composeTargetDir,
    });
  };

  const onChooseComposeLowerOverlay = async () => {
    const selected = await chooseImageFile(i18n.t("compose.lowerOverlay"), COMPOSE_IMAGE_EXTENSIONS);
    if (!selected) return;
    setComposeLowerOverlayPath(selected);
  };

  const onChooseComposeUpperOverlay = async () => {
    const selected = await chooseImageFile(i18n.t("compose.upperOverlay"), COMPOSE_IMAGE_EXTENSIONS);
    if (!selected) return;
    setComposeUpperOverlayPath(selected);
  };

  const onClearComposeLowerOverlay = () => {
    setComposeLowerOverlayPath("");
  };

  const onClearComposeUpperOverlay = () => {
    setComposeUpperOverlayPath("");
  };

  const onChooseComposeTargetDir = async () => {
    const dir = await chooseDirectory(i18n.t("compose.outputDir"));
    if (!dir) return;
    setComposeTargetDir(dir);
    await persistSettings({
      ...settings,
      composeBaseDir,
      composeTargetDir: dir,
    });
  };

  const onBatchCompose = async () => {
    if (composeBusy) return;
    if (!composeBaseDir.trim() || !composeTargetDir.trim() || (!composeLowerOverlayPath.trim() && !composeUpperOverlayPath.trim())) {
      setStatus("status.composeParamsRequired");
      return;
    }

    setComposeBusy(true);
    setComposeLogs(() =>
      resetBoundedLogs(
        [
          `[${new Date().toLocaleString(i18n.language)}] compose:start`,
          formatLog({
            baseDir: composeBaseDir,
            coverOverlayPath: composeUpperOverlayPath,
            bottomOverlayPath: composeLowerOverlayPath,
            targetDir: composeTargetDir,
            recursive: composeRecursive,
            keepStructure: composeKeepStructure,
          }),
        ],
        CONVERT_LOG_LIMIT,
      ),
    );

    try {
      const result = await invokeCommand<BatchComposeResult>("batch_compose_images", {
        request: {
          baseDir: composeBaseDir,
          lowerOverlayPath: composeLowerOverlayPath,
          upperOverlayPath: composeUpperOverlayPath,
          targetDir: composeTargetDir,
          recursive: composeRecursive,
          keepStructure: composeKeepStructure,
        },
      });

      setComposeLogs((current) =>
        appendBoundedLogs(
          current,
          [`compose:done composed=${result.composed} failed=${result.failed}`, ...result.errors.slice(0, 100)],
          CONVERT_LOG_LIMIT,
        ),
      );
      setStatus("status.composeCompleted");
    } catch (error) {
      setComposeLogs((current) => appendBoundedLogs(current, `compose:error ${String(error)}`, CONVERT_LOG_LIMIT));
      setStatus(String(error));
    } finally {
      setComposeBusy(false);
    }
  };

  return {
    composeLogs,
    composeBusy,
    composeBaseDir,
    composeLowerOverlayPath,
    composeUpperOverlayPath,
    composeTargetDir,
    composeRecursive,
    composeKeepStructure,
    setComposeRecursive,
    setComposeKeepStructure,
    onChooseComposeBaseDir,
    onChooseComposeLowerOverlay,
    onChooseComposeUpperOverlay,
    onClearComposeLowerOverlay,
    onClearComposeUpperOverlay,
    onChooseComposeTargetDir,
    onBatchCompose,
  };
}