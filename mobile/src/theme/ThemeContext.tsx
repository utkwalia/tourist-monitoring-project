import React, { createContext, useCallback, useMemo, useState } from 'react';
import { ThemeColors, ThemeMode } from './colors';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: typeof ThemeColors.dark;
  toggleMode: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  colors: ThemeColors.dark,
  toggleMode: () => undefined,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('dark');

  const toggleMode = useCallback(() => {
    setMode((prev) => (prev === 'dark' ? 'night' : 'dark'));
  }, []);

  const value = useMemo(
    () => ({
      mode,
      colors: ThemeColors[mode],
      toggleMode,
    }),
    [mode, toggleMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
