import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../lib/api';
import { ArrowLeft, Play, Star, Clock, User, Film, X } from 'lucide-react';

interface ItemDetail {
  id: string;
  title: string;
  poster?: string;
  year?: number;
  mediaType: 'movie' | 'episode';
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  fileName?: string;
  metadata?: any;
}

export const DetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [trailerError, setTrailerError] = useState<string | null>(null);
  const [loadingTrailer, setLoadingTrailer] = useState(false);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const res = await authFetch(`/api/item/${id}`);
        if (res.ok) {
          const json = await res.json();
          setItem(json);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const isHtml5Playable = React.useMemo(() => {
    if (!item?.fileName) return false;
    const ext = item.fileName.split('.').pop()?.toLowerCase();
    return ['mp4', 'm4v', 'mov', 'webm'].includes(ext || '');
  }, [item?.fileName]);

  const hasTmdbId = React.useMemo(() => {
    if (!item?.metadata) return false;
    const m = item.metadata;
    if (m.tmdbId) return true;
    if (m.tmdb && m.tmdb.id) return true;
    // Check for numeric id that looks like TMDB (not starting with tt)
    if (m.id && typeof m.id === 'number') return true;
    if (m.id && typeof m.id === 'string' && !m.id.startsWith('tt') && /^\d+$/.test(m.id)) return true;
    return false;
  }, [item?.metadata]);

  const handleVlcOpen = () => {
    if (!item) return;
    const token = localStorage.getItem('cinemacore_token');
    const streamUrl = new URL(`/api/stream/${item.id}?token=${token}`, window.location.origin).href;
    window.location.href = `vlc://${encodeURIComponent(streamUrl)}`;
  };

  const handleWatchTrailer = async () => {
    if (!item) return;
    setTrailerError(null);
    setLoadingTrailer(true);
    try {
      const res = await authFetch(`/api/trailer/${item.id}`);
      const data = await res.json();
      if (data.ok && data.youtubeKey) {
        setTrailerKey(data.youtubeKey);
        setShowTrailer(true);
      } else {
        setTrailerError("No trailer available");
        setTimeout(() => setTrailerError(null), 3000);
      }
    } catch (e) {
      console.error(e);
      setTrailerError("Error loading trailer");
      setTimeout(() => setTrailerError(null), 3000);
    } finally {
      setLoadingTrailer(false);
    }
  };

  // Metadata Helpers
  const getPlot = () => item?.metadata?.overview || item?.metadata?.plot;
  const getGenres = () => {
    const g = item?.metadata?.genres || item?.metadata?.genre_names;
    if (Array.isArray(g)) return g.map((x: any) => typeof x === 'string' ? x : x.name);
    return [];
  };
  const getDirector = () => {
    if (item?.metadata?.director) return item.metadata.director;
    const crew = item?.metadata?.credits?.crew;
    if (Array.isArray(crew)) {
      const d = crew.find((x: any) => x.job === 'Director');
      return d ? d.name : null;
    }
    return null;
  };
  const getCast = () => {
    const c = item?.metadata?.cast || item?.metadata?.credits?.cast;
    if (Array.isArray(c)) return c.slice(0, 10).map((x: any) => typeof x === 'string' ? x : x.name);
    return [];
  };
  const getRuntime = () => item?.metadata?.runtime || item?.metadata?.duration;
  const getRating = () => item?.metadata?.vote_average || item?.metadata?.imdbRating;

  if (loading) return <div className="min-h-screen flex items-center justify-center text-primary">Loading...</div>;
  if (!item) return <div className="min-h-screen flex items-center justify-center text-red-500">Item not found</div>;

  const token = localStorage.getItem('cinemacore_token');
  const streamUrl = `/api/stream/${item.id}?token=${token}`;

  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 bg-surface/50 backdrop-blur-md sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold truncate">{item.title}</h1>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {!isPlaying ? (
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Left Column: Poster & Actions */}
            <div className="w-full md:w-1/3 flex flex-col items-center gap-6">
              <div className="w-full max-w-sm aspect-[2/3] rounded-xl overflow-hidden shadow-2xl relative group">
                {item.poster ? (
                  <img src={item.poster} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-surface flex items-center justify-center text-gray-500">No Poster</div>
                )}
                {isHtml5Playable && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                      onClick={() => setIsPlaying(true)}
                      className="bg-primary text-black rounded-full p-4 transform scale-90 group-hover:scale-100 transition-transform"
                    >
                      <Play size={48} fill="currentColor" />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 w-full max-w-xs">
                {isHtml5Playable ? (
                  <button 
                    onClick={() => setIsPlaying(true)}
                    className="flex items-center justify-center gap-2 bg-primary text-black font-bold py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Play size={20} fill="currentColor" />
                    Play Now
                  </button>
                ) : (
                  <div className="text-center text-sm text-yellow-500 bg-yellow-500/10 p-2 rounded border border-yellow-500/20 mb-2">
                    Format not supported in browser
                  </div>
                )}

                <button 
                  onClick={handleVlcOpen}
                  className="flex items-center justify-center gap-2 bg-orange-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Play size={20} fill="currentColor" />
                  Open in VLC
                </button>
                <p className="text-xs text-center text-gray-500 -mt-1">Requires VLC installed</p>

                <button 
                  onClick={handleWatchTrailer}
                  disabled={!hasTmdbId || loadingTrailer}
                  title={!hasTmdbId ? "Trailer requires TMDB metadata" : "Watch Trailer"}
                  className={`flex items-center justify-center gap-2 bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-colors mt-2 ${(!hasTmdbId || loadingTrailer) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'}`}
                >
                  <Film size={20} />
                  {loadingTrailer ? "Loading..." : "Watch Trailer"}
                </button>
                {trailerError && <p className="text-xs text-center text-red-500 animate-pulse">{trailerError}</p>}
                
                <a 
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(item.title + " trailer")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-center text-gray-500 hover:text-white transition-colors"
                >
                  Open in YouTube
                </a>
              </div>
            </div>

            {/* Right Column: Metadata */}
            <div className="w-full md:w-2/3 space-y-6">
              <div>
                <h1 className="text-4xl font-bold mb-2">{item.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-gray-400 text-sm">
                  {item.year && <span>{item.year}</span>}
                  {getRuntime() && (
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{getRuntime()} min</span>
                    </div>
                  )}
                  {getRating() && (
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star size={14} fill="currentColor" />
                      <span>{getRating()}</span>
                    </div>
                  )}
                </div>
                {item.seriesTitle && (
                  <p className="text-primary text-lg mt-2 font-medium">{item.seriesTitle} • S{item.seasonNumber} E{item.episodeNumber}</p>
                )}
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2">
                {getGenres().map((g: string) => (
                  <span key={g} className="px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-gray-300">
                    {g}
                  </span>
                ))}
              </div>

              {/* Plot */}
              {getPlot() && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Overview</h3>
                  <p className="text-gray-300 leading-relaxed">{getPlot()}</p>
                </div>
              )}

              {/* Director & Cast */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {getDirector() && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Director</h3>
                    <div className="flex items-center gap-2 text-white">
                      <Film size={16} className="text-primary" />
                      <span>{getDirector()}</span>
                    </div>
                  </div>
                )}
                
                {getCast().length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wider">Cast</h3>
                    <div className="flex flex-wrap gap-2">
                      {getCast().map((actor: string) => (
                        <span key={actor} className="text-sm text-gray-300 bg-surface px-2 py-1 rounded">
                          {actor}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
            <video 
              src={streamUrl} 
              controls 
              autoPlay 
              className="w-full h-full"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        )}
      </div>

      {/* Trailer Modal */}
      {showTrailer && trailerKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
            <button 
              onClick={() => setShowTrailer(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <iframe 
              src={`https://www.youtube.com/embed/${trailerKey}?playsinline=1&rel=0&modestbranding=1`}
              className="w-full h-full"
              allowFullScreen
              title="Trailer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
