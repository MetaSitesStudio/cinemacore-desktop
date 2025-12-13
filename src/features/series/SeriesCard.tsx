import React from 'react';
import { Series } from '@/types';
import { CardContextMenu } from '@/components/ui/CardContextMenu';

interface SeriesCardProps {
  series: Series;
  onClick: (series: Series) => void;
  onDelete?: (series: Series) => void;
  onEdit?: (series: Series) => void;
}

export const SeriesCard: React.FC<SeriesCardProps> = ({ series, onClick, onDelete, onEdit }) => {
  
  const posterSrc = series.tmdbPosterUrl
    ? series.tmdbPosterUrl
    : series.posterUrl
      ? series.posterUrl
      : '/placeholder-poster.png';

  const handleOpenFileLocation = async () => {
    if (series.fullPath && window.cinemacore) {
      await window.cinemacore.openFileLocation(series.fullPath);
    }
  };

  return (
    <div 
      className="relative group cursor-pointer w-full"
      onClick={() => onClick(series)}
    >
      {/* Card Container with Aspect Ratio */}
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl shadow-lg bg-surface transition-all duration-300 group-hover:shadow-2xl group-hover:scale-[1.02] ring-1 ring-white/5">
        {/* Image */}
        <img 
          src={posterSrc} 
          alt={series.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = '/placeholder-poster.png';
          }}
        />
        
        {/* Gradient Overlay - Always visible at bottom for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
        
        {/* Action Buttons - Top Right */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-10">
          <CardContextMenu 
            onEdit={onEdit ? () => onEdit(series) : undefined}
            onMoveToTrash={onDelete ? () => onDelete(series) : undefined}
            onOpenFileLocation={handleOpenFileLocation}
          />
        </div>
      </div>
    </div>
  );
};
