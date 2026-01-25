/**
 * Profile photo upload validation utilities
 */

export interface PhotoValidationOptions {
  maxSizeInMB?: number;
  allowedFormats?: string[];
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
}

export interface PhotoValidationResult {
  isValid: boolean;
  error?: string;
  file?: File;
  preview?: string;
}

const DEFAULT_OPTIONS: PhotoValidationOptions = {
  maxSizeInMB: 5,
  allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
  maxWidth: 2000,
  maxHeight: 2000,
  minWidth: 100,
  minHeight: 100,
};

/**
 * Validate photo file before upload
 */
export async function validatePhotoFile(
  file: File,
  options: PhotoValidationOptions = {}
): Promise<PhotoValidationResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Check file exists
  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }

  // Check file type
  if (!opts.allowedFormats?.includes(file.type)) {
    return {
      isValid: false,
      error: `Only ${opts.allowedFormats?.join(', ')} formats are allowed`,
    };
  }

  // Check file size
  const fileSizeInMB = file.size / (1024 * 1024);
  if (fileSizeInMB > (opts.maxSizeInMB || 5)) {
    return {
      isValid: false,
      error: `File size must be less than ${opts.maxSizeInMB}MB (current: ${fileSizeInMB.toFixed(
        2
      )}MB)`,
    };
  }

  // Check image dimensions
  try {
    const dimensions = await getImageDimensions(file);

    if (opts.minWidth && dimensions.width < opts.minWidth) {
      return {
        isValid: false,
        error: `Image width must be at least ${opts.minWidth}px (current: ${dimensions.width}px)`,
      };
    }

    if (opts.minHeight && dimensions.height < opts.minHeight) {
      return {
        isValid: false,
        error: `Image height must be at least ${opts.minHeight}px (current: ${dimensions.height}px)`,
      };
    }

    if (opts.maxWidth && dimensions.width > opts.maxWidth) {
      return {
        isValid: false,
        error: `Image width must be less than ${opts.maxWidth}px (current: ${dimensions.width}px)`,
      };
    }

    if (opts.maxHeight && dimensions.height > opts.maxHeight) {
      return {
        isValid: false,
        error: `Image height must be less than ${opts.maxHeight}px (current: ${dimensions.height}px)`,
      };
    }
  } catch (error) {
    return {
      isValid: false,
      error: 'Failed to validate image dimensions',
    };
  }

  // Generate preview
  const preview = await generatePreview(file);

  return { isValid: true, file, preview };
}

/**
 * Get image dimensions
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Generate image preview
 */
function generatePreview(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      resolve(e.target?.result as string);
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Compress image before upload
 */
export async function compressImage(
  file: File,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Set canvas size
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image
        ctx.drawImage(img, 0, 0);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Crop image to square
 */
export async function cropToSquare(
  file: File,
  size: number = 512
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Calculate crop dimensions
        const minDim = Math.min(img.width, img.height);
        const startX = (img.width - minDim) / 2;
        const startY = (img.height - minDim) / 2;

        // Set canvas size
        canvas.width = size;
        canvas.height = size;

        // Draw cropped image
        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const croppedFile = new File([blob], file.name, {
                type: file.type,
              });
              resolve(croppedFile);
            } else {
              reject(new Error('Failed to crop image'));
            }
          },
          file.type,
          0.9
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}
