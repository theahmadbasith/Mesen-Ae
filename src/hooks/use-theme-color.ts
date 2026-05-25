import { useEffect } from 'react';
import { useDbQuery, dbUpdate } from '@/hooks/db-hooks';
import { db } from '@/lib/db';

// Predefined theme color options with HSL values
export const THEME_COLORS = [
  { name: 'Oranye', hue: '25', saturation: '95%', lightness: '53%' },
  { name: 'Biru', hue: '217', saturation: '91%', lightness: '60%' },
  { name: 'Hijau', hue: '142', saturation: '71%', lightness: '45%' },
  { name: 'Ungu', hue: '262', saturation: '83%', lightness: '58%' },
  { name: 'Merah', hue: '0', saturation: '84%', lightness: '60%' },
  { name: 'Pink', hue: '330', saturation: '81%', lightness: '60%' },
  { name: 'Teal', hue: '172', saturation: '66%', lightness: '50%' },
  { name: 'Kuning', hue: '45', saturation: '93%', lightness: '47%' },
] as const;

export function getThemeHSL(hue: string) {
  const preset = THEME_COLORS.find(c => c.hue === hue);
  if (preset) return `${preset.hue} ${preset.saturation} ${preset.lightness}`;
  return `${hue} 91% 60%`;
}

export function applyThemeColor(hue: string) {
  const hsl = getThemeHSL(hue);
  document.documentElement.style.setProperty('--primary', hsl);
  document.documentElement.style.setProperty('--ring', hsl);
  // Update meta theme-color for PWA
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', `hsl(${hsl})`);
}

export function useThemeColor() {
  const storeSettings = useDbQuery<any>('storeSettings')?.[0];

  useEffect(() => {
    if (storeSettings?.themeColor) {
      applyThemeColor(storeSettings.themeColor);
    } else {
      // Default fallback if no setting
      applyThemeColor('217');
    }
  }, [storeSettings?.themeColor]);

  return storeSettings?.themeColor ?? '217';
}

export async function setThemeColor(hue: string) {
  applyThemeColor(hue);
  const { data: settings } = await db.from('store_settings').select('*').single();
  if (settings?.id) {
    await dbUpdate('store_settings', settings.id, { themeColor: hue });
  }
}
