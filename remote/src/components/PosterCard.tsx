import React from 'react';

export interface MediaItem {
  id: string;
  title: string;
  year?: number;
  poster?: string;
  mediaType: 'movie' | 'series';
  genres?: string[] | { id: number; name: string }[];
  cast?: { id: number; name: string; character?: string; profilePath?: string }[] | string[];
}

interface PosterCardProps {
  item: MediaItem;
  onClick: () => void;
}

export const PosterCard: React.FC<PosterCardProps> = ({ item, onClick }) => (
  <div 
    onClick={onClick}
    className="relative aspect-[2/3] bg-surface rounded-lg overflow-hidden cursor-pointer group ring-1 ring-white/5 hover:ring-primary/50 transition-all"
  >
    {item.poster ? (
      <img src={item.poster} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
    ) : (
      <div className="w-full h-full flex items-center justify-center p-4 text-center bg-surface">
        <span className="text-sm font-medium text-gray-400">{item.title}</span>
      </div>
    )}
    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-60 group-hover:opacity-80" />
    <div className="absolute bottom-0 left-0 right-0 p-3">
      {/* Title removed as it is already on the poster */}
      {item.year && <p className="text-xs text-gray-400 mt-1">{item.year}</p>}
    </div>
  </div>
);
