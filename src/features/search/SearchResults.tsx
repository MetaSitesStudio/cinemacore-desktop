import React from 'react';
import { useSearch } from '@/context/SearchContext';
import { MovieCard } from '@/features/home/MovieCard';
import { Movie } from '@/types';
import { Loader2 } from 'lucide-react';
import { usePlayMedia } from '@/hooks/usePlayMedia';

export const SearchResults: React.FC = () => {
  const { results, isLoading, query, isActive } = useSearch();
  const { playMedia } = usePlayMedia();

  if (!isActive) return null;

  if (isLoading) {
    return (
      <div className="pt-24 flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="pt-24 flex flex-col items-center justify-center h-96 text-text/50">
        <p className="text-xl">No results found for "{query}"</p>
        <p className="text-sm mt-2">Try adjusting your filters</p>
      </div>
    );
  }

  const handleClick = async (result: any) => {
    // For now, direct play for search results as the simplest integration
    // Ideally we would open the respective overlays
    const allFiles = await window.cinemacore.db.getAllFiles();
    const file = allFiles.find((f: any) => f.id === result.id);
    if (file) {
      playMedia(file);
    }
  };

  return (
    <div className="pt-24 px-6 md:px-12 min-h-screen bg-background text-text">
      <h1 className="text-3xl font-bold mb-8">
        Search Results <span className="text-text/50 text-lg font-normal">({results.length} items)</span>
      </h1>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6 md:gap-8 pb-20">
        {results.map(result => {
           const displayTitle = result.mediaType === 'episode' 
             ? `${result.seriesTitle} S${result.seasonNumber}E${result.episodeNumber}`
             : result.title;

           const movie: Movie = {
             id: result.id,
             title: displayTitle,
             year: result.year || 0,
             posterUrl: result.posterUrl || '',
             description: '',
             backdropUrl: '',
             rating: result.rating || 0,
             runtime: 0,
             genres: [],
           };

           return (
             <MovieCard 
               key={result.id} 
               movie={movie} 
               onClick={() => handleClick(result)} 
             />
           );
        })}
      </div>
    </div>
  );
};
