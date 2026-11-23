export interface BackgroundPreset {
  id: string;
  name: string;
  color: string;
}

export const DEFAULT_BACKGROUND_COLOR = '#f8fafc';

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { id: 'slate', name: 'Crisp Slate', color: '#f8fafc' },
  { id: 'mint', name: 'Soft Mint', color: '#ecfdf5' },
  { id: 'sky', name: 'Cool Sky', color: '#f0f9ff' },
  { id: 'sand', name: 'Warm Sand', color: '#faf7f2' },
  { id: 'iris', name: 'Pale Iris', color: '#f5f3ff' },
  { id: 'midnight', name: 'Midnight Slate', color: '#0f172a' },
];

export function normalizeHexColor(input: string, fallback = DEFAULT_BACKGROUND_COLOR): string {
  const trimmed = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

export function isDarkBackground(hexColor: string): boolean {
  const hex = normalizeHexColor(hexColor);
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance < 0.35;
}
