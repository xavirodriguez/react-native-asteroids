export interface Palette {
  primary: string;
  secondary: string;
  accent: string;
}

export const PALETTES: Record<string, Palette> = {
  palette_default:        { primary: '#FFFFFF', secondary: '#888888', accent: '#FFFF00' },
  palette_amber_crt:      { primary: '#FFB000', secondary: '#7A5000', accent: '#FFF0A0' },
  palette_gameboy:        { primary: '#8BAC0F', secondary: '#306230', accent: '#E0F8D0' },
  palette_neon_green:     { primary: '#39FF14', secondary: '#003300', accent: '#CCFFCC' },
  palette_cosmic_purple:  { primary: '#BF5FFF', secondary: '#4B0082', accent: '#E8CCFF' },
};
