import React from 'react';
import { Play, Info } from 'lucide-react';
import { Movie } from '@/types';
import { Button } from '@/components/ui/Button';
import { useServices } from '@/services/ServiceContext';
import { usePlayMedia } from '@/hooks/usePlayMedia';

interface HeroProps {
  movie: Movie;
  onDetailsClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ movie, onDetailsClick }) => {
  const { libraryService } = useServices();
  const { playMedia } = usePlayMedia();

  const handlePlay = async () => {
    const allFiles = await libraryService.getAllFiles();
    const file = allFiles.find(f => f.id === movie.id);
    if (file) {
      playMedia(file);
    }
  };

  return (
    <div className="relative h-[85vh] w-full">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={movie.backdropUrl} 
          alt={movie.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full flex items-center px-4 md:px-12 pt-20">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-5xl md:text-7xl font-bold drop-shadow-lg">
            {movie.title}
          </h1>
          
          <div className="flex items-center gap-4 text-lg text-text/80">
            <span className="text-primary font-bold">{movie.rating} Match</span>
            <span>{movie.year}</span>
            <span>{Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>
            <span className="border border-text/50 px-2 py-0.5 text-sm rounded">HD</span>
          </div>

          <p className="text-lg text-text/70 line-clamp-3 drop-shadow-md">
            {movie.description}
          </p>

          <div className="flex items-center gap-4 pt-4">
            <Button size="lg" className="gap-3" onClick={handlePlay}>
              <Play className="w-6 h-6 fill-current" /> Play
            </Button>
            <Button 
              variant="secondary" 
              size="lg" 
              className="gap-3"
              onClick={onDetailsClick}
            >
              <Info className="w-6 h-6" /> More Info
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
