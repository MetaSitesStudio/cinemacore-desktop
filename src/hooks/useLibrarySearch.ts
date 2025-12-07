import { useState, useEffect } from 'react';
import { SearchMediaRequest, MediaSearchResult } from '@/types';

export const useLibrarySearch = () => {
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState<"all" | "movie" | "series">('all');
  const [yearFrom, setYearFrom] = useState<number | undefined>();
  const [yearTo, setYearTo] = useState<number | undefined>();
  const [folderId, setFolderId] = useState<string | undefined>();
  
  const [results, setResults] = useState<MediaSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce logic
  useEffect(() => {
    const search = async () => {
      // If no filters are active, clear results
      if (!query && mediaType === 'all' && !yearFrom && !yearTo && !folderId) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const payload: SearchMediaRequest = {
          query,
          mediaType,
          yearFrom,
          yearTo,
          folderId,
          limit: 200
        };
        
        const data = await window.cinemacore.library.searchMedia(payload);
        setResults(data);
      } catch (err) {
        console.error("Search error:", err);
        setError("Failed to search library");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(search, 300);
    return () => clearTimeout(timeoutId);
  }, [query, mediaType, yearFrom, yearTo, folderId]);

  const isActive = Boolean(query || mediaType !== 'all' || yearFrom || yearTo || folderId);

  return {
    query, setQuery,
    mediaType, setMediaType,
    yearFrom, setYearFrom,
    yearTo, setYearTo,
    folderId, setFolderId,
    results,
    isLoading,
    error,
    isActive
  };
};
