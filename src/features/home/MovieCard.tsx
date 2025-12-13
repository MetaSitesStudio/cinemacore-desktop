import React, { useState } from 'react';
import { Movie } from '@/types';
import { CardContextMenu } from '@/components/ui/CardContextMenu';

interface MovieCardProps {
  movie: Movie;
  onClick: (movie: Movie) => void;
  onDelete?: (movie: Movie) => void;
  onEdit?: (movie: Movie) => void;
  onUpdate?: () => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onClick, onDelete, onEdit, onUpdate }) => {
  const [broken, setBroken] = useState(false);

  const src = broken 
    ? '/placeholder-poster.png' 
    : (movie.tmdbPosterUrl || movie.posterUrl || '/placeholder-poster.png');

  const handlePlayDefault = async () => {
    if (movie.fullPath && window.cinemacore) {
      await window.cinemacore.media.playWithSystemDefault(movie.fullPath);
    }
  };

  const handlePlayCustom = async () => {
    if (movie.fullPath && window.cinemacore) {
      const settings = await window.cinemacore.settings.getPlaybackSettings();
      if (settings.customPlayerPath) {
        await window.cinemacore.media.playWithCustomPlayer(settings.customPlayerPath, movie.fullPath);
      } else {
        const result = await window.cinemacore.media.selectCustomPlayer();
        if (!result.canceled && result.path) {
           await window.cinemacore.settings.savePlaybackSettings({ ...settings, customPlayerPath: result.path, playbackMode: 'custom' });
           await window.cinemacore.media.playWithCustomPlayer(result.path, movie.fullPath);
        }
      }
    }
  };

  const handleToggleFavorite = async () => {
    if (window.cinemacore) {
      await window.cinemacore.db.toggleFavorite(movie.id);
      onUpdate?.();
    }
  };

  const handleToggleHidden = async () => {
    if (window.cinemacore) {
      await window.cinemacore.db.hideFile(movie.id);
      onUpdate?.();
    }
  };

  const handleOpenFileLocation = async () => {
    console.log('[MovieCard] handleOpenFileLocation', movie.fullPath);
    if (movie.fullPath && window.cinemacore) {
      await window.cinemacore.openFileLocation(movie.fullPath);
    } else {
      console.warn('[MovieCard] Cannot open file location: fullPath is missing or cinemacore API unavailable', { fullPath: movie.fullPath, cinemacore: !!window.cinemacore });
    }
  };

  const handleDeleteFromDb = async () => {
    if (window.cinemacore && confirm(`Are you sure you want to remove "${movie.title}" from the database? The file will remain on disk.`)) {
      await window.cinemacore.library.removeFile(movie.id);
      onUpdate?.();
    }
  };

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
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-10">
          <CardContextMenu 
            onPlayDefault={handlePlayDefault}
            onPlayCustom={handlePlayCustom}
            onOpenFileLocation={handleOpenFileLocation}
            onToggleFavorite={handleToggleFavorite}
            onToggleHidden={handleToggleHidden}
            onDeleteFromDb={handleDeleteFromDb}
            onMoveToTrash={() => onDelete?.(movie)}
            onEdit={onEdit ? () => onEdit(movie) : undefined}
            isFavorite={movie.isFavorite}
            isHidden={movie.isHidden}
          />
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
