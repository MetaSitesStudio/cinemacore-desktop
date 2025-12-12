import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'summer' | 'christmas' | 'cinematic' | 'sparky';

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as Theme) || 'dark';
  });

  const availableThemes: Theme[] = ['dark', 'light', 'summer', 'christmas', 'cinematic', 'sparky'];

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('theme-light', 'theme-summer', 'theme-christmas', 'theme-cinematic', 'theme-sparky');
    
    if (currentTheme !== 'dark') {
      root.classList.add(`theme-${currentTheme}`);
    }
    
    localStorage.setItem('theme', currentTheme);
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme: setCurrentTheme, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
