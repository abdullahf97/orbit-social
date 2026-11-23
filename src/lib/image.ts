export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/**
 * Phone cameras produce 4–12 MB files. Vercel caps request bodies at 4.5 MB,
 * so resize large images in the browser before uploading. The server still
 * validates and re-encodes everything with sharp.
 */
export async function prepareImage(file: File): Promise<File> {
  if (file.size <= 1_200_000) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.86),
    );

    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", {
      type: "image/webp",
    });
  } catch {
    // HEIC and other formats the browser cannot decode fall through; the
    // server will reject them with a readable message.
    return file;
  }
}

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Choose an image file.";
  if (file.size > MAX_UPLOAD_BYTES) return "Images must be 4 MB or smaller.";
  return null;
}
