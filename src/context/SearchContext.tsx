import React, { createContext, useContext, ReactNode } from 'react';
import { useLibrarySearch } from '@/hooks/useLibrarySearch';

type UseLibrarySearchReturn = ReturnType<typeof useLibrarySearch>;

const SearchContext = createContext<UseLibrarySearchReturn | null>(null);

export const SearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const search = useLibrarySearch();
  return (
    <SearchContext.Provider value={search}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
