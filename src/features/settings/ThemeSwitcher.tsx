import React from 'react';
import { useTheme, Theme } from '@/context/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Moon, Sun, Umbrella } from 'lucide-react';

export const ThemeSwitcher: React.FC = () => {
  const { currentTheme, setTheme, availableThemes } = useTheme();

  const getIcon = (theme: Theme) => {
    switch (theme) {
      case 'dark': return <Moon className="w-4 h-4" />;
      case 'light': return <Sun className="w-4 h-4" />;
      case 'summer': return <Umbrella className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-text">Appearance</h3>
      <div className="flex gap-4">
        {availableThemes.map((theme) => (
          <Button
            key={theme}
            variant={currentTheme === theme ? 'primary' : 'secondary'}
            onClick={() => setTheme(theme)}
            className="capitalize gap-2"
          >
            {getIcon(theme)}
            {theme}
          </Button>
        ))}
      </div>
    </div>
  );
};
