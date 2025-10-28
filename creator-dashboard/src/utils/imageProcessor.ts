const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_BATCH_SIZE = 20;

export interface ImageFile {
  file: File;
  preview: string;
  valid: boolean;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid type: ${file.name}. Allowed: JPG, PNG, GIF, WebP`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large: ${file.name}. Max 10MB`,
    };
  }

  return { valid: true };
}

export function validateBatchImages(files: File[]): ValidationResult {
  const errors: string[] = [];

  if (files.length === 0) {
    errors.push('No images selected');
  }

  if (files.length > MAX_BATCH_SIZE) {
    errors.push(`Too many images (${files.length}). Maximum is ${MAX_BATCH_SIZE}`);
  }

  files.forEach((file, index) => {
    const result = validateImageFile(file);
    if (!result.valid && result.error) {
      errors.push(`Image ${index + 1}: ${result.error}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function createImagePreviews(files: File[]): Promise<ImageFile[]> {
  const previews = await Promise.all(
    files.map(async (file) => {
      const validation = validateImageFile(file);
      
      if (!validation.valid) {
        return {
          file,
          preview: '',
          valid: false,
          error: validation.error,
        };
      }

      return new Promise<ImageFile>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            file,
            preview: e.target?.result as string,
            valid: true,
          });
        };
        reader.onerror = () => {
          resolve({
            file,
            preview: '',
            valid: false,
            error: 'Failed to read file',
          });
        };
        reader.readAsDataURL(file);
      });
    })
  );

  return previews;
}

export function getTotalFileSize(files: File[]): number {
  return files.reduce((total, file) => total + file.size, 0);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}