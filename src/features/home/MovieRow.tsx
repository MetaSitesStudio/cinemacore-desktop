import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie } from '@/types';
import { MovieCard } from './MovieCard';

interface MovieRowProps {
  title: string;
  movies: Movie[];
  onMovieClick: (movie: Movie) => void;
  onEdit?: (movie: Movie) => void;
  onDelete?: (movie: Movie) => void;
  onUpdate?: () => void;
}

export const MovieRow: React.FC<MovieRowProps> = ({ title, movies, onMovieClick, onEdit, onDelete, onUpdate }) => {
  const rowRef = useRef<HTMLDivElement>(null);

  if (!movies || movies.length === 0) return null;

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollTo = direction === 'left' 
        ? scrollLeft - clientWidth 
        : scrollLeft + clientWidth;
      
      rowRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-4 my-8 px-4 md:px-12 group/row">
      <h2 className="text-2xl font-semibold text-text hover:text-text/80 transition-colors cursor-pointer">
        {title}
      </h2>
      
      <div className="relative group">
        <button 
          className="absolute left-0 top-0 bottom-0 z-40 w-12 bg-background/50 hover:bg-background/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="w-8 h-8 text-text" />
        </button>

        <div 
          ref={rowRef}
          className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-4"
        >
          {movies.map((movie) => (
            <div key={movie.id} className="min-w-[200px] w-[200px] md:min-w-[240px] md:w-[240px]">
              <MovieCard 
                movie={movie} 
                onClick={onMovieClick} 
                onEdit={onEdit}
                onDelete={onDelete}
                onUpdate={onUpdate}
              />
            </div>
          ))}
        </div>

        <button 
          className="absolute right-0 top-0 bottom-0 z-40 w-12 bg-background/50 hover:bg-background/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="w-8 h-8 text-text" />
        </button>
      </div>
    </div>
  );
};
