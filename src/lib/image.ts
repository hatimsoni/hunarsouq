export async function compressImage(file: File): Promise<File> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPG, PNG, or WebP image.");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Choose an original image under 10 MB.");
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 40_000_000)
      throw new Error("Choose an image under 40 megapixels.");
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser could not prepare this image.");
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Image compression failed.")),
        "image/webp",
        0.82,
      ),
    );
    if (blob.type !== "image/webp" || blob.size > 2 * 1024 * 1024)
      throw new Error("Try a smaller image or a browser with WebP support.");
    return new File([blob], "profile.webp", { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}
