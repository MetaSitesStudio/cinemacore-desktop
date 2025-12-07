import React, { useState, useEffect, useMemo } from 'react';
import { X, Play, Trash2, Edit2 } from 'lucide-react';
import { MovieFile } from '@/types';
import { Button } from '@/components/ui/Button';
import { formatGuessedTitle } from '@/utils/filenameParser';
import { usePlayMedia } from '@/hooks/usePlayMedia';

// Extract the metadata type from MovieFile for reuse
type MovieFileMetadata = NonNullable<MovieFile['metadata']>;

interface SeriesDetailOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  seriesTitle: string;
  episodes: MovieFile[];
  seriesMetadata?: MovieFileMetadata | null;
  onDeleteEpisode?: (file: MovieFile) => void;
  onEditEpisode?: (file: MovieFile) => void;
  onDeleteSeries?: () => void;
  onEditSeries?: () => void;
}

export const SeriesDetailOverlay: React.FC<SeriesDetailOverlayProps> = ({ 
  isOpen, 
  onClose, 
  seriesTitle, 
  episodes,
  seriesMetadata,
  onDeleteEpisode,
  onEditEpisode,
  onDeleteSeries,
  onEditSeries
}) => {
  const { playMedia } = usePlayMedia();
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);

  // Sort episodes: Season asc, Episode asc
  const sortedEpisodes = useMemo(() => {
    return [...episodes].sort((a, b) => {
      const sA = a.seasonNumber || 0;
      const sB = b.seasonNumber || 0;
      if (sA !== sB) return sA - sB;
      return (a.episodeNumber || 0) - (b.episodeNumber || 0);
    });
  }, [episodes]);

  // Group by season
  const episodesBySeason = useMemo(() => {
    const groups = new Map<number, MovieFile[]>();
    sortedEpisodes.forEach(ep => {
      const season = ep.seasonNumber || 0;
      if (!groups.has(season)) {
        groups.set(season, []);
      }
      groups.get(season)!.push(ep);
    });
    return groups;
  }, [sortedEpisodes]);

  // Select first episode by default when opening
  useEffect(() => {
    if (isOpen && sortedEpisodes.length > 0 && !selectedEpisodeId) {
      setSelectedEpisodeId(sortedEpisodes[0].id);
    }
  }, [isOpen, sortedEpisodes, selectedEpisodeId]);

  if (!isOpen) return null;

  const selectedEpisode = sortedEpisodes.find(e => e.id === selectedEpisodeId) || sortedEpisodes[0];
  
  // Determine display info
  // Prefer seriesMetadata if available (passed from parent), otherwise fallback to first episode's metadata
  const displayMetadata = seriesMetadata || sortedEpisodes[0]?.metadata;
  const posterUrl = displayMetadata?.posterUrl;
  const plot = seriesMetadata?.plot || sortedEpisodes[0]?.metadata?.plot || "No description available.";
  const year = seriesMetadata?.year || sortedEpisodes[0]?.metadata?.year || sortedEpisodes[0]?.guessedYear;
  const rating = seriesMetadata?.rating || sortedEpisodes[0]?.metadata?.rating;
  const genres = seriesMetadata?.genres || sortedEpisodes[0]?.metadata?.genres || [];
  
  // Calculate season count
  const seasonCount = episodesBySeason.size;

  const handlePlay = () => {
    if (selectedEpisode) {
      playMedia(selectedEpisode);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8">
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-5xl bg-surface rounded-lg shadow-2xl overflow-hidden h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-background/50 rounded-full hover:bg-text/20 transition-colors"
        >
          <X className="w-6 h-6 text-text" />
        </button>

        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          {/* Left Panel: Series Info */}
          <div className="w-full md:w-1/3 bg-background/30 p-6 flex flex-col overflow-y-auto border-r border-text/10">
            <div className="aspect-[2/3] w-full rounded-lg overflow-hidden shadow-lg mb-6 bg-background/50 relative group">
              {posterUrl ? (
                <img 
                  src={posterUrl} 
                  alt={seriesTitle} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text/30">
                  No Poster
                </div>
              )}

              {/* Series Actions */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                {onEditSeries && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEditSeries(); }}
                    className="p-1.5 bg-background/80 rounded-full text-text/70 hover:text-primary hover:bg-background transition-colors"
                    title="Edit Series Metadata"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                )}
                {onDeleteSeries && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteSeries(); }}
                    className="p-1.5 bg-background/80 rounded-full text-text/70 hover:text-red-500 hover:bg-background transition-colors"
                    title="Delete Series"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <h2 className="text-2xl font-bold mb-2 text-text">{seriesTitle}</h2>
            
            <div className="flex flex-wrap items-center gap-3 text-sm text-text/60 mb-4">
              {year && <span>{year}</span>}
              <span>{seasonCount} Season{seasonCount !== 1 ? 's' : ''}</span>
              {rating && <span className="border border-text/30 px-1.5 rounded text-xs">{rating}</span>}
              <span className="bg-text/10 px-1.5 rounded text-xs">HD</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {genres.map((g: string) => (
                <span key={g} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {g}
                </span>
              ))}
            </div>

            <p className="text-sm text-text/70 leading-relaxed mb-6">
              {plot}
            </p>

            <div className="mt-auto pt-6 border-t border-text/10">
              <Button className="w-full gap-2 mb-3" onClick={handlePlay}>
                <Play className="w-4 h-4 fill-current" /> 
                {selectedEpisode ? `Play S${selectedEpisode.seasonNumber} E${selectedEpisode.episodeNumber}` : 'Play'}
              </Button>
            </div>
          </div>

          {/* Right Panel: Episodes List */}
          <div className="w-full md:w-2/3 bg-surface flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b border-text/10">
              <h3 className="font-semibold text-lg">Episodes</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {Array.from(episodesBySeason.entries()).sort((a, b) => a[0] - b[0]).map(([seasonNum, seasonEpisodes]) => (
                <div key={seasonNum}>
                  <h4 className="text-sm font-bold text-text/50 uppercase tracking-wider mb-3 sticky top-0 bg-surface py-2">
                    Season {seasonNum}
                  </h4>
                  <div className="space-y-2">
                    {seasonEpisodes.sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0)).map(ep => (
                      <div 
                        key={ep.id}
                        onClick={() => setSelectedEpisodeId(ep.id)}
                        className={`
                          group flex items-center gap-4 p-3 rounded-md cursor-pointer transition-all
                          ${selectedEpisodeId === ep.id 
                            ? 'bg-primary/10 border border-primary/20' 
                            : 'hover:bg-background/50 border border-transparent'}
                        `}
                      >
                        <div className="flex-shrink-0 w-8 text-center text-sm font-mono text-text/50">
                          {ep.episodeNumber}
                        </div>
                        
                        <div className="flex-grow min-w-0">
                          <div className={`font-medium text-sm truncate ${selectedEpisodeId === ep.id ? 'text-primary' : 'text-text'}`}>
                            {ep.metadata?.title || ep.episodeTitle || formatGuessedTitle(ep)}
                          </div>
                          <div className="text-xs text-text/50 truncate">
                            {ep.metadata?.plot || `${Math.round((ep.fileSizeBytes || 0) / 1024 / 1024)} MB • ${ep.videoResolution || 'Unknown'}`}
                          </div>
                        </div>

                        {ep.metadata?.rating && (
                          <div className="text-xs text-text/40 hidden group-hover:block">
                            ★ {ep.metadata.rating}
                          </div>
                        )}

                        {/* Episode Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {onEditEpisode && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); onEditEpisode(ep); }}
                              className="p-1.5 rounded-full text-text/50 hover:text-primary hover:bg-primary/10 transition-colors"
                              title="Edit Episode"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                          {onDeleteEpisode && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); onDeleteEpisode(ep); }}
                              className="p-1.5 rounded-full text-text/50 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                              title="Delete Episode"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            playMedia(ep);
                          }}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${selectedEpisodeId === ep.id ? 'bg-primary text-white' : 'bg-background text-text/30 group-hover:text-primary'}`}
                        >
                          <Play className="w-3 h-3 fill-current" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
