export const HISTORY_LIMIT = 10;
export const GENERATE_LOG_LIMIT = 300;
export const CONVERT_LOG_LIMIT = 300;

export const parseBatchPromptLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

export const appendBoundedLogs = (current: string[], incoming: string | string[], limit: number) => {
  const next = Array.isArray(incoming) ? incoming : [incoming];
  return [...current, ...next].slice(-limit);
};

export const resetBoundedLogs = (incoming: string | string[], limit: number) =>
  appendBoundedLogs([], incoming, limit);
