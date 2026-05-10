import { open } from "@tauri-apps/plugin-dialog";

export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "tga", "bmp"];
export const COMPOSE_IMAGE_EXTENSIONS = [...IMAGE_EXTENSIONS, "blp"];

export const chooseDirectory = async (title: string) => {
  const selected = await open({
    directory: true,
    multiple: false,
    title,
  });

  return typeof selected === "string" ? selected : "";
};

export const chooseImageFile = async (title: string, extensions = IMAGE_EXTENSIONS) => {
  const selected = await open({
    multiple: false,
    filters: [{ name: "Images", extensions }],
    title,
  });

  return typeof selected === "string" ? selected : "";
};