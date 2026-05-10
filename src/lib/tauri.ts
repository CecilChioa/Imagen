import { invoke } from "@tauri-apps/api/core";

export const commandErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export async function invokeCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    throw new Error(commandErrorMessage(error));
  }
}