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
  posterUrl?: string;
  backdropUrl?: string;
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
  posterUrl: propPosterUrl,
  backdropUrl,
  onDeleteEpisode,
  onEditEpisode,
  onDeleteSeries,
  onEditSeries
}) => {
  const { playMedia } = usePlayMedia();
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
  const [posterError, setPosterError] = useState(false);

  // Reset error state when series changes
  useEffect(() => {
    setPosterError(false);
  }, [seriesTitle]);

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

  const selectedEpisode = sortedEpisodes.find(e => e.id === selectedEpisodeId) || sortedEpisodes[0];
  
  // Determine display info
  // Prefer seriesMetadata if available (passed from parent), otherwise fallback to first episode's metadata
  const displayMetadata = seriesMetadata || sortedEpisodes[0]?.metadata;
  
  const tmdbPosterUrl = useMemo(() => sortedEpisodes.find(e => e.tmdbPosterUrl)?.tmdbPosterUrl, [sortedEpisodes]);
  const tmdbBackdropUrl = useMemo(() => sortedEpisodes.find(e => e.tmdbBackdropUrl)?.tmdbBackdropUrl, [sortedEpisodes]);
  const omdbPosterUrl = displayMetadata?.posterUrl;

  // DEBUG: Log artwork sources
  useEffect(() => {
    if (isOpen) {
      console.log('[SeriesDetailOverlay] Artwork Sources:', {
        seriesTitle,
        tmdbPosterUrl,
        tmdbBackdropUrl,
        omdbPosterUrl,
        propPosterUrl,
        episodesCount: sortedEpisodes.length,
        episodesWithTmdb: sortedEpisodes.filter(e => e.tmdbPosterUrl).length
      });
    }
  }, [isOpen, seriesTitle, tmdbPosterUrl, tmdbBackdropUrl, omdbPosterUrl, propPosterUrl, sortedEpisodes]);

  const posterSrc = useMemo(() => {
    if (!posterError && tmdbPosterUrl) {
      return tmdbPosterUrl;
    }
    // If TMDB failed or missing, try OMDb or prop
    // Avoid using propPosterUrl if it's the same as tmdbPosterUrl and it failed
    if (propPosterUrl && propPosterUrl !== tmdbPosterUrl) return propPosterUrl;
    return omdbPosterUrl;
  }, [tmdbPosterUrl, omdbPosterUrl, propPosterUrl, posterError]);

  const activeBackdrop = tmdbBackdropUrl || backdropUrl || posterSrc;

  const plot = seriesMetadata?.plot || sortedEpisodes[0]?.metadata?.plot || "No description available.";
  const year = seriesMetadata?.year || sortedEpisodes[0]?.metadata?.year || sortedEpisodes[0]?.guessedYear;
  const rating = seriesMetadata?.rating || sortedEpisodes[0]?.metadata?.rating;
  const genres = seriesMetadata?.genres || sortedEpisodes[0]?.metadata?.genres || [];

  if (!isOpen) return null;
  
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

        {/* Top: Backdrop & Hero Info */}
        <div className="relative aspect-video w-full overflow-hidden bg-black flex-shrink-0 max-h-[40vh]">
            {activeBackdrop ? (
              <img 
                src={activeBackdrop} 
                alt={seriesTitle} 
                className="w-full h-full object-cover"
                onError={() => {
                   // Fallback logic if needed
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-background" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
            
            <div className="absolute bottom-6 left-8 right-8">
              <h2 className="text-4xl font-bold mb-4 text-text drop-shadow-lg">{seriesTitle}</h2>
              <div className="flex gap-4">
                <Button className="gap-2" onClick={handlePlay}>
                  <Play className="w-5 h-5 fill-current" /> 
                  {selectedEpisode ? `Play S${selectedEpisode.seasonNumber} E${selectedEpisode.episodeNumber}` : 'Play'}
                </Button>
                {onEditSeries && (
                  <Button variant="secondary" className="gap-2" onClick={onEditSeries}>
                    <Edit2 className="w-5 h-5" /> Edit Series
                  </Button>
                )}
                {onDeleteSeries && (
                  <Button 
                    className="gap-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20" 
                    onClick={onDeleteSeries}
                  >
                    <Trash2 className="w-5 h-5" /> Delete Series
                  </Button>
                )}
              </div>
            </div>
        </div>

        {/* Bottom: Content & Episodes */}
        <div className="flex-1 overflow-y-auto detail-overlay-scroll p-8">
            <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8 mb-8">
                {/* Left: Description */}
                <div className="space-y-6">
                    <div className="flex items-center gap-4 text-sm text-text/60">
                        <span>{year}</span>
                        <span>{seasonCount} Season{seasonCount !== 1 ? 's' : ''}</span>
                        {rating && <span className="border border-text/30 px-1.5 rounded text-xs">{rating}</span>}
                        <span className="border border-text/30 px-1.5 rounded text-xs">HD</span>
                    </div>
                    <p className="text-lg text-text/70 leading-relaxed">
                        {plot}
                    </p>
                </div>

                {/* Right: Metadata */}
                <div className="space-y-4 text-sm text-text/60">
                    <div>
                        <span className="block text-text/50 mb-1">Genres:</span>
                        <span className="text-text">{genres.join(', ')}</span>
                    </div>
                    <div>
                        <span className="block text-text/50 mb-1">Original Language:</span>
                        <span className="text-text">English</span>
                    </div>
                </div>
            </div>

            {/* Episode List */}
            <div className="border-t border-text/10 pt-6">
                <h3 className="font-semibold text-lg mb-4">Episodes</h3>
                <div className="space-y-8">
                  {Array.from(episodesBySeason.entries()).sort((a, b) => a[0] - b[0]).map(([seasonNum, seasonEpisodes]) => (
                    <div key={seasonNum}>
                      <h4 className="text-sm font-bold text-text/50 uppercase tracking-wider mb-3">
                        Season {seasonNum}
                      </h4>
                      <div className="grid grid-cols-1 gap-2">
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
