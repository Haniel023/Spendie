import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themePresets, THEME_ORDER, detectSeasonalTheme } from './themes';
import { spacing, radius, typography, shadow } from './theme';

const STORAGE_KEY = '@spendie_theme';
const SEASONAL_OVERRIDE_KEY = '@spendie_seasonal_enabled';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState('default');
  const [seasonalEnabled, setSeasonalEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(SEASONAL_OVERRIDE_KEY),
    ]).then(([savedTheme, savedSeasonal]) => {
      if (savedTheme && themePresets[savedTheme]) setThemeId(savedTheme);
      if (savedSeasonal !== null) setSeasonalEnabled(savedSeasonal !== 'false');
    }).finally(() => setLoaded(true));
  }, []);

  const selectTheme = async (id) => {
    if (!themePresets[id]) return;
    setThemeId(id);
    await AsyncStorage.setItem(STORAGE_KEY, id);
    // When user explicitly picks a theme, turn off seasonal auto-switch
    // so their choice actually takes effect immediately.
    setSeasonalEnabled(false);
    await AsyncStorage.setItem(SEASONAL_OVERRIDE_KEY, 'false');
  };

  const toggleSeasonalTheme = async (enabled) => {
    setSeasonalEnabled(enabled);
    await AsyncStorage.setItem(SEASONAL_OVERRIDE_KEY, String(enabled));
  };

  // Compute effective theme: seasonal override → user selected
  const effectiveThemeId = useMemo(() => {
    if (seasonalEnabled) {
      const seasonal = detectSeasonalTheme();
      if (seasonal && themePresets[seasonal]) return seasonal;
    }
    return themeId;
  }, [themeId, seasonalEnabled]);

  const value = useMemo(() => ({
    themeId,
    effectiveThemeId,
    selectTheme,
    seasonalEnabled,
    toggleSeasonalTheme,
    colors: themePresets[effectiveThemeId]?.colors ?? themePresets.default.colors,
    spacing,
    radius,
    typography,
    shadow,
    allThemes: THEME_ORDER.map((id) => themePresets[id]),
    currentTheme: themePresets[effectiveThemeId] ?? themePresets.default,
  }), [themeId, effectiveThemeId, seasonalEnabled]);

  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
