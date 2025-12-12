import React from 'react';
import { Navbar } from './Navbar';
import { useTheme } from '@/context/ThemeContext';
import { ChristmasSnowOverlay } from '@/components/ChristmasSnowOverlay';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-text font-sans relative overflow-x-hidden">
      <ChristmasSnowOverlay active={currentTheme === 'christmas'} />
      <Navbar />
      <main>
        {children}
      </main>
    </div>
  );
};
