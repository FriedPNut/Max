"use client";

import { photoThumbPath } from "@/lib/photo";

export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

type LoadedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

async function loadImageSource(file: Blob): Promise<LoadedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });

      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Fall back to an image element for formats the browser can render.
    }
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Couldn't decode photo."));
      image.src = objectUrl;
    });

    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error("Photo has no size.");
    }

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

export async function resizeImageFile(
  file: Blob,
  maxDimension: number,
  quality: number
) {
  const loaded = await loadImageSource(file);

  try {
    const scale = Math.min(
      1,
      maxDimension / Math.max(loaded.width, loaded.height)
    );
    const width = Math.max(1, Math.round(loaded.width * scale));
    const height = Math.max(1, Math.round(loaded.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Couldn't prepare photo.");
    }

    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(loaded.source, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });

    if (!blob) {
      throw new Error("Couldn't prepare photo.");
    }

    return blob;
  } finally {
    loaded.cleanup();
  }
}

export async function resizeImageToWidth(
  file: Blob,
  width: number,
  quality: number
) {
  const loaded = await loadImageSource(file);

  try {
    const scale = Math.min(1, width / loaded.width);
    const outputWidth = Math.max(1, Math.round(loaded.width * scale));
    const outputHeight = Math.max(1, Math.round(loaded.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Couldn't prepare photo.");
    }

    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, outputWidth, outputHeight);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(loaded.source, 0, 0, outputWidth, outputHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });

    if (!blob) {
      throw new Error("Couldn't prepare photo.");
    }

    return blob;
  } finally {
    loaded.cleanup();
  }
}

export async function resizeImageSquare(
  file: Blob,
  size: number,
  quality: number
) {
  const loaded = await loadImageSource(file);

  try {
    const sourceSize = Math.min(loaded.width, loaded.height);
    const sourceX = (loaded.width - sourceSize) / 2;
    const sourceY = (loaded.height - sourceSize) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Couldn't prepare photo.");
    }

    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, size, size);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      loaded.source,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      size,
      size
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", quality);
    });

    if (!blob) {
      throw new Error("Couldn't prepare photo.");
    }

    return blob;
  } finally {
    loaded.cleanup();
  }
}

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

// Original files keep a file extension that matches their real content type.
export function extensionFor(contentType: string) {
  return EXTENSIONS[contentType] ?? "jpg";
}

/**
 * Upload the full JPEG and a 400px thumbnail in parallel. The thumbnail path
 * is derived from the full path, so no database column changes.
 */
export async function uploadPhotoWithThumbnail({
  file,
  bucket,
  path,
  token,
  contentType = "image/jpeg",
  onProgress,
}: {
  file: Blob;
  bucket: string;
  path: string;
  token: string;
  contentType?: string;
  onProgress: (percent: number) => void;
}) {
  let thumbnail: Blob | null = null;

  try {
    thumbnail = await resizeImageToWidth(file, 400, 0.7);
  } catch {
    // Older formats may not decode; the full photo still uploads.
  }

  await Promise.all([
    uploadImageWithProgress({
      file,
      bucket,
      path,
      contentType,
      token,
      onProgress,
    }),
    thumbnail
      ? uploadImageWithProgress({
          file: thumbnail,
          bucket,
          path: photoThumbPath(path),
          contentType: "image/jpeg",
          token,
          onProgress: () => {},
        }).catch(() => {
          // A missing thumbnail silently falls back to the full photo.
        })
      : Promise.resolve(),
  ]);
}

export function uploadImageWithProgress({
  file,
  bucket,
  path,
  contentType = "image/jpeg",
  token,
  onProgress,
}: {
  file: Blob;
  bucket: string;
  path: string;
  contentType?: string;
  token: string;
  onProgress: (percent: number) => void;
}) {
  return new Promise<void>((resolve, reject) => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      reject(new Error("Storage isn't configured."));
      return;
    }

    const encodedPath = path
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    const xhr = new XMLHttpRequest();

    xhr.open(
      "POST",
      `${supabaseUrl}/storage/v1/object/${bucket}/${encodedPath}`
    );
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.timeout = 90_000;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(
          Math.min(100, Math.round((event.loaded / event.total) * 100))
        );
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`Upload failed with ${xhr.status}.`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed."));
    xhr.onabort = () => reject(new Error("Upload stopped."));
    xhr.ontimeout = () => reject(new Error("Upload timed out."));
    xhr.send(file);
  });
}
