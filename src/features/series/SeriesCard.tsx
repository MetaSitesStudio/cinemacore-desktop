import React, { useState } from 'react';
import { Series } from '@/types';
import { Trash2, Edit2 } from 'lucide-react';

interface SeriesCardProps {
  series: Series;
  onClick: (series: Series) => void;
  onDelete?: (series: Series) => void;
  onEdit?: (series: Series) => void;
}

export const SeriesCard: React.FC<SeriesCardProps> = ({ series, onClick, onDelete, onEdit }) => {
  const [broken, setBroken] = useState(false);

  const getPosterSrc = (item: Series) => {
    if (item.tmdbPosterUrl) return item.tmdbPosterUrl;
    if (item.posterUrl) return item.posterUrl;
    return '/placeholder-poster.png';
  };

  const src = broken ? '/placeholder-poster.png' : getPosterSrc(series);

  console.log('[IMG] SeriesCard', {
    title: series.title,
    tmdbPosterUrl: series.tmdbPosterUrl,
    tmdbBackdropUrl: series.tmdbBackdropUrl
  });

  return (
    <div 
      className="relative group cursor-pointer w-full"
      onClick={() => onClick(series)}
    >
      {/* Card Container with Aspect Ratio */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl shadow-lg bg-surface transition-all duration-300 group-hover:shadow-2xl group-hover:scale-[1.02] ring-1 ring-white/5">
        {/* Image */}
        <img 
          src={src} 
          alt={series.title} 
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
              onClick={(e) => { e.stopPropagation(); onEdit(series); }}
              className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white/90 hover:text-primary hover:bg-black/80 transition-colors border border-white/10"
              title="Edit Metadata"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(series); }}
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
            {series.title}
          </h3>
          <div className="flex items-center justify-between text-sm text-gray-300 font-medium">
            <span className="bg-white/10 px-2 py-0.5 rounded text-xs backdrop-blur-sm">
              {series.year}
            </span>
            {/* You could add season count here if available in the future */}
          </div>
        </div>
      </div>
    </div>
  );
};
