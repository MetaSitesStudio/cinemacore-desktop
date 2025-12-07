import React from 'react';
import { Navbar } from './Navbar';
import { useSearch } from '@/context/SearchContext';
import { SearchResults } from '@/features/search/SearchResults';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isActive } = useSearch();

  return (
    <div className="min-h-screen bg-background text-text font-sans">
      <Navbar />
      <main>
        {isActive ? <SearchResults /> : children}
      </main>
    </div>
  );
};
