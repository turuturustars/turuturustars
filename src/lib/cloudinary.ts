import { supabase } from "@/integrations/supabase/client";

const CLOUDINARY_CLOUD_NAME = "dbl1leamn";

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  resource_type: string;
  bytes: number;
  width?: number;
  height?: number;
}

export async function uploadToCloudinary(
  file: File,
  folder: string = "turuturu-stars",
  resourceType: "image" | "raw" | "auto" = "auto"
): Promise<CloudinaryUploadResult> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error("Not authenticated");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);
  formData.append("resource_type", resourceType);

  const response = await supabase.functions.invoke("cloudinary-upload", {
    body: formData,
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data;
}

export function getCloudinaryUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    format?: string;
  } = {}
): string {
  const transformations: string[] = [];
  
  if (options.width) transformations.push(`w_${options.width}`);
  if (options.height) transformations.push(`h_${options.height}`);
  if (options.crop) transformations.push(`c_${options.crop}`);
  if (options.quality) transformations.push(`q_${options.quality}`);
  if (options.format) transformations.push(`f_${options.format}`);
  
  const transformStr = transformations.length > 0 
    ? transformations.join(",") + "/" 
    : "";
  
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${transformStr}${publicId}`;
}

export function getResponsiveImageUrl(
  publicId: string,
  width: number,
  height: number,
  options: { quality?: string; crop?: string } = {}
): string {
  return getCloudinaryUrl(publicId, {
    width,
    height,
    crop: options.crop || "fill",
    quality: options.quality || "auto",
    format: "auto", // Automatically serves WebP, AVIF, or original
  });
}

export function getAvatarUrl(publicId: string | null, size: number = 100): string {
  if (!publicId) {
    return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/c_fill,w_${size},h_${size},q_auto,f_auto/v1/default-avatar`;
  }
  
  return getCloudinaryUrl(publicId, {
    width: size,
    height: size,
    crop: "fill",
    quality: "auto",
    format: "auto",
  });
}

/**
 * Generate srcset for responsive images
 * Usage: <img srcSet={getImageSrcSet(publicId)} sizes="(max-width: 640px) 100vw, 640px" />
 */
export function getImageSrcSet(
  publicId: string,
  sizes: number[] = [320, 640, 1024, 1280]
): string {
  return sizes
    .map((size) => `${getCloudinaryUrl(publicId, { width: size, quality: "auto", format: "auto" })} ${size}w`)
    .join(", ");
}
