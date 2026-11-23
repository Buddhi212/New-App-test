export const OCR_TARGET_MAX_WIDTH = 1600;

export interface Dimensions {
  width: number;
  height: number;
}

export interface PreprocessedImageResult {
  blob: Blob;
  previewUrl: string;
  originalWidth: number;
  originalHeight: number;
  processedWidth: number;
  processedHeight: number;
}

export function computeResizedDimensions(
  width: number,
  height: number,
  maxWidth = OCR_TARGET_MAX_WIDTH
): Dimensions {
  if (width <= 0 || height <= 0) {
    return { width: 1, height: 1 };
  }
  if (width <= maxWidth) {
    return { width: Math.round(width), height: Math.round(height) };
  }
  const scale = maxWidth / width;
  return {
    width: Math.round(maxWidth),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function toGrayscalePixels(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    data[i] = lum;
    data[i + 1] = lum;
    data[i + 2] = lum;
  }
}

export async function preprocessImageForOCR(
  file: Blob,
  maxWidth = OCR_TARGET_MAX_WIDTH
): Promise<PreprocessedImageResult> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode the selected image file.'));
      el.src = objectUrl;
    });

    const originalWidth = img.naturalWidth || img.width;
    const originalHeight = img.naturalHeight || img.height;
    const { width, height } = computeResizedDimensions(originalWidth, originalHeight, maxWidth);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Browser canvas 2D context is unavailable.');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    toGrayscalePixels(imageData.data);
    ctx.putImageData(imageData, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result);
          else reject(new Error('Failed to encode preprocessed image.'));
        },
        'image/png',
        0.95
      );
    });

    const previewUrl = canvas.toDataURL('image/png');

    return {
      blob,
      previewUrl,
      originalWidth,
      originalHeight,
      processedWidth: width,
      processedHeight: height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function createSampleReceiptBlob(): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1800;
  canvas.height = 1200;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas unavailable');
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText('NORTHSTAR HARDWARE SUPPLY', 120, 140);

  ctx.font = '34px monospace';
  ctx.fillText('420 Market Street, Suite 200', 120, 210);
  ctx.fillText('Date: 2026-11-22', 120, 290);
  ctx.fillText('Invoice #: INV-2026-8412', 120, 350);

  ctx.fillRect(120, 400, 1560, 4);

  ctx.fillText('2x Thermal Label Roll          45.00', 120, 475);
  ctx.fillText('1x USB-C Barcode Scanner       89.50', 120, 540);
  ctx.fillText('4x Heavy Storage Bin           40.00', 120, 605);

  ctx.fillRect(120, 660, 1560, 4);

  ctx.fillText('Subtotal                      174.50', 120, 740);
  ctx.fillText('Sales Tax                      14.40', 120, 810);
  ctx.font = 'bold 42px monospace';
  ctx.fillText('Grand Total                   188.90', 120, 900);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to generate sample receipt'));
    }, 'image/png');
  });
}
