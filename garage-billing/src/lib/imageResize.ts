"use client";

/**
 * Resizes/compresses an image file in the browser before upload, so vehicle
 * photos stay small (cheap on Blob storage, fast on a mechanic's mobile
 * data). Caps the longest edge at maxDimension and re-encodes as JPEG.
 */
export async function resizeImageForUpload(
  file: File,
  maxDimension = 1024,
  quality = 0.7
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Failed to encode image");
  return blob;
}
