// Task color preset definitions

export type TaskColorKey = 
  | 'blue' 
  | 'green' 
  | 'purple' 
  | 'orange' 
  | 'pink' 
  | 'teal' 
  | 'yellow' 
  | 'red' 
  | 'indigo' 
  | 'gray';

export interface TaskColorPreset {
  key: TaskColorKey;
  label: string;
  bgClass: string;
  textClass: string;
  // Hex color for the swatch preview
  swatchColor: string;
}

export const TASK_COLOR_PRESETS: TaskColorPreset[] = [
  { key: 'blue', label: 'Blue', bgClass: 'bg-blue-500', textClass: 'text-white', swatchColor: '#3b82f6' },
  { key: 'green', label: 'Green', bgClass: 'bg-green-500', textClass: 'text-white', swatchColor: '#22c55e' },
  { key: 'purple', label: 'Purple', bgClass: 'bg-purple-500', textClass: 'text-white', swatchColor: '#a855f7' },
  { key: 'orange', label: 'Orange', bgClass: 'bg-orange-500', textClass: 'text-white', swatchColor: '#f97316' },
  { key: 'pink', label: 'Pink', bgClass: 'bg-pink-500', textClass: 'text-white', swatchColor: '#ec4899' },
  { key: 'teal', label: 'Teal', bgClass: 'bg-teal-500', textClass: 'text-white', swatchColor: '#14b8a6' },
  { key: 'yellow', label: 'Yellow', bgClass: 'bg-yellow-500', textClass: 'text-black', swatchColor: '#eab308' },
  { key: 'red', label: 'Red', bgClass: 'bg-red-500', textClass: 'text-white', swatchColor: '#ef4444' },
  { key: 'indigo', label: 'Indigo', bgClass: 'bg-indigo-500', textClass: 'text-white', swatchColor: '#6366f1' },
  { key: 'gray', label: 'Gray', bgClass: 'bg-gray-500', textClass: 'text-white', swatchColor: '#6b7280' },
];

/**
 * Get the color preset for a given key
 */
export function getTaskColorPreset(key: string | null | undefined): TaskColorPreset | null {
  if (!key) return null;
  return TASK_COLOR_PRESETS.find(preset => preset.key === key) ?? null;
}

/**
 * Get the background class for a task color
 * Returns null if no custom color is set
 */
export function getTaskColorBgClass(key: string | null | undefined): string | null {
  const preset = getTaskColorPreset(key);
  return preset?.bgClass ?? null;
}

/**
 * Get the text class for a task color
 * Returns null if no custom color is set
 */
export function getTaskColorTextClass(key: string | null | undefined): string | null {
  const preset = getTaskColorPreset(key);
  return preset?.textClass ?? null;
}
