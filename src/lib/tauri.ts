import { invoke } from "@tauri-apps/api/core";

export const CANCELLED_ERROR_CODE = "ERR_CANCELLED";

export const commandErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export const isCancelledError = (error: unknown) =>
  commandErrorMessage(error).includes(CANCELLED_ERROR_CODE);

export async function invokeCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw new Error(commandErrorMessage(error));
  }
}