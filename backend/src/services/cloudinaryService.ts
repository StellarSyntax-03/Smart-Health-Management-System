import cloudinary from "../config/cloudinary.js";

interface UploadResult {
  secureUrl: string;
  publicId: string;
}

export function getResourceType(mimetype: string): "image" | "raw" {
  return mimetype.startsWith("image/") ? "image" : "raw";
}

export async function uploadFile(
  buffer: Buffer,
  folder: string,
  resourceType: "image" | "raw" = "image",
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => {
        if (error || !result) return reject(error || new Error("Upload failed"));
        resolve({ secureUrl: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
}

export async function deleteFile(
  publicId: string,
  resourceType: "image" | "raw" = "image",
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
