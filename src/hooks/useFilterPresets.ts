import { useState, useCallback, useEffect } from 'react';

export interface FilterPreset {
  id: string;
  name: string;
  searchQuery: string;
  statusFilter: string;
  ownerFilter: string;
  colorFilter: string[];
  createdAt: string;
}

interface UseFilterPresetsOptions {
  projectId: string;
}

const STORAGE_KEY_PREFIX = 'gantt_filter_presets_';

export function useFilterPresets({ projectId }: UseFilterPresetsOptions) {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const storageKey = `${STORAGE_KEY_PREFIX}${projectId}`;

  // Load presets from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setPresets(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load filter presets:', error);
    }
  }, [storageKey]);

  // Save presets to localStorage whenever they change
  const saveToStorage = useCallback((newPresets: FilterPreset[]) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(newPresets));
    } catch (error) {
      console.error('Failed to save filter presets:', error);
    }
  }, [storageKey]);

  const savePreset = useCallback((
    name: string,
    filters: {
      searchQuery: string;
      statusFilter: string;
      ownerFilter: string;
      colorFilter: string[];
    }
  ) => {
    const newPreset: FilterPreset = {
      id: crypto.randomUUID(),
      name,
      ...filters,
      createdAt: new Date().toISOString(),
    };
    
    setPresets(prev => {
      const updated = [...prev, newPreset];
      saveToStorage(updated);
      return updated;
    });
    
    return newPreset;
  }, [saveToStorage]);

  const deletePreset = useCallback((presetId: string) => {
    setPresets(prev => {
      const updated = prev.filter(p => p.id !== presetId);
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  const renamePreset = useCallback((presetId: string, newName: string) => {
    setPresets(prev => {
      const updated = prev.map(p => 
        p.id === presetId ? { ...p, name: newName } : p
      );
      saveToStorage(updated);
      return updated;
    });
  }, [saveToStorage]);

  return {
    presets,
    savePreset,
    deletePreset,
    renamePreset,
  };
}
