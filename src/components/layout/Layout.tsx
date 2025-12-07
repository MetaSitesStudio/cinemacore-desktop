import React from 'react';
import { Navbar } from './Navbar';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background text-text font-sans">
      <Navbar />
      <main>
        {children}
      </main>
    </div>
  );
};
