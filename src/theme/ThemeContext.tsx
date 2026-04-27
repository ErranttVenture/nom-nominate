/**
 * ThemeProvider — resolves the active palette based on system Appearance
 * and exposes it through React context. Components that need theme values
 * call `useTheme()`.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { LIGHT_THEME, DARK_THEME, ThemePalette } from './tokens';

type ThemeContextValue = {
  theme: ThemePalette;
  mode: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: LIGHT_THEME,
  mode: 'light',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [scheme, setScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme() ?? 'light'
  );

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setScheme(colorScheme ?? 'light');
    });
    return () => sub.remove();
  }, []);

  const mode: 'light' | 'dark' = scheme === 'dark' ? 'dark' : 'light';
  const theme = mode === 'dark' ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ theme, mode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemePalette {
  return useContext(ThemeContext).theme;
}

export function useThemeMode(): 'light' | 'dark' {
  return useContext(ThemeContext).mode;
}
