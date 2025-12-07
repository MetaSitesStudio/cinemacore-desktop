import React, { useState } from 'react';
import { Movie } from '@/types';
import { Trash2, Edit2 } from 'lucide-react';

interface MovieCardProps {
  movie: Movie;
  onClick: (movie: Movie) => void;
  onDelete?: (movie: Movie) => void;
  onEdit?: (movie: Movie) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onClick, onDelete, onEdit }) => {
  const [broken, setBroken] = useState(false);

  console.log('[IMG] MovieCard src data', {
    title: movie.title,
    posterUrl: movie.posterUrl,
    tmdbPosterUrl: movie.tmdbPosterUrl,
    tmdbBackdropUrl: movie.tmdbBackdropUrl,
  });

  const src = broken 
    ? '/placeholder-poster.png' 
    : (movie.tmdbPosterUrl || movie.posterUrl || '/placeholder-poster.png');

  return (
    <div 
      className="relative group cursor-pointer w-full"
      onClick={() => onClick(movie)}
    >
      {/* Card Container with Aspect Ratio */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl shadow-lg bg-surface transition-all duration-300 group-hover:shadow-2xl group-hover:scale-[1.02] ring-1 ring-white/5">
        {/* Image */}
        <img 
          src={src} 
          alt={movie.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          onError={() => !broken && setBroken(true)}
        />
        
        {/* Gradient Overlay - Always visible at bottom for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
        
        {/* Action Buttons - Top Right */}
        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
          {onEdit && (
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(movie); }}
              className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white/90 hover:text-primary hover:bg-black/80 transition-colors border border-white/10"
              title="Edit Metadata"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(movie); }}
              className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white/90 hover:text-red-500 hover:bg-black/80 transition-colors border border-white/10"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content - Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
          <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 mb-1 drop-shadow-md">
            {movie.title}
          </h3>
          <div className="flex items-center justify-between text-sm text-gray-300 font-medium">
            <span className="bg-white/10 px-2 py-0.5 rounded text-xs backdrop-blur-sm">
              {movie.year}
            </span>
            {movie.rating > 0 && (
              <span className="text-yellow-400 text-xs">★ {movie.rating}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
