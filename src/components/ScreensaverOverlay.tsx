import React, { useEffect, useState } from 'react';
import { Movie } from '@/types';

interface ScreensaverOverlayProps {
  movies: Movie[];
  onClose: () => void;
}

export const ScreensaverOverlay: React.FC<ScreensaverOverlayProps> = ({ movies, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Fade in on mount
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (movies.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % movies.length);
    }, 10000); // Change every 10 seconds

    return () => clearInterval(interval);
  }, [movies.length]);

  if (!movies.length) return null;

  const currentMovie = movies[currentIndex];
  const posterUrl = currentMovie.tmdbPosterUrl || currentMovie.posterUrl;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-black transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onClick={onClose}
      onMouseMove={onClose}
      onKeyDown={onClose}
    >
      {/* Background Image with Fade */}
      <div className="absolute inset-0 overflow-hidden">
        {movies.map((movie, index) => {
           const bg = movie.tmdbBackdropUrl || movie.backdropUrl;
           if (!bg) return null;
           
           return (
            <div 
              key={movie.id}
              className={`absolute inset-0 bg-cover bg-center transition-opacity duration-2000 ease-in-out ${index === currentIndex ? 'opacity-40' : 'opacity-0'}`}
              style={{ backgroundImage: `url(${bg})` }}
            />
           );
        })}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center p-12 text-center">
        <div className="max-w-4xl w-full flex flex-col items-center gap-8 animate-fade-in">
          {posterUrl && (
            <div className="relative w-64 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
               {movies.map((movie, index) => {
                 const poster = movie.tmdbPosterUrl || movie.posterUrl;
                 if (!poster) return null;
                 return (
                   <img 
                    key={movie.id}
                    src={poster} 
                    alt={movie.title}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-2000 ${index === currentIndex ? 'opacity-100' : 'opacity-0'}`}
                   />
                 );
               })}
            </div>
          )}
          
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg tracking-tight">
              {currentMovie.title}
            </h1>
            <div className="flex items-center justify-center gap-4 text-xl text-gray-300">
              <span>{currentMovie.year}</span>
              {currentMovie.rating > 0 && (
                <span className="text-yellow-400">★ {currentMovie.rating}</span>
              )}
              {currentMovie.runtime > 0 && (
                <span>{Math.floor(currentMovie.runtime / 60)}h {currentMovie.runtime % 60}m</span>
              )}
            </div>
            {currentMovie.description && (
              <p className="text-lg text-gray-400 max-w-2xl mx-auto line-clamp-3 leading-relaxed">
                {currentMovie.description}
              </p>
            )}
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-8 right-8 text-white/20 text-sm font-mono">
        Press any key to resume
      </div>
    </div>
  );
};
