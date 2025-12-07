import React from 'react';
import { Movie } from '@/types';
import { Trash2, Edit2 } from 'lucide-react';

interface MovieCardProps {
  movie: Movie;
  onClick: (movie: Movie) => void;
  onDelete?: (movie: Movie) => void;
  onEdit?: (movie: Movie) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onClick, onDelete, onEdit }) => {
  return (
    <div 
      className="flex-none w-[200px] aspect-[2/3] relative group cursor-pointer transition-transform duration-300 hover:scale-105 hover:z-10"
      onClick={() => onClick(movie)}
    >
      <img 
        src={movie.posterUrl} 
        alt={movie.title} 
        className="w-full h-full object-cover rounded-md"
      />
      <div className="absolute inset-0 bg-background/0 group-hover:bg-background/40 transition-colors rounded-md" />
      
      {/* Action Buttons */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        {onEdit && (
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(movie); }}
            className="p-1.5 bg-background/80 rounded-full text-text/70 hover:text-primary hover:bg-background transition-colors"
            title="Edit Metadata"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        )}
        {onDelete && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(movie); }}
            className="p-1.5 bg-background/80 rounded-full text-text/70 hover:text-red-500 hover:bg-background transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <h3 className="text-text font-bold text-sm truncate">{movie.title}</h3>
        <div className="flex items-center justify-between text-xs text-text/70 mt-1">
          <span>{movie.year}</span>
          <span className="text-primary">{movie.rating}</span>
        </div>
      </div>
    </div>
  );
};
