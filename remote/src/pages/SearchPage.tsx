import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../lib/api';
import { PosterCard, MediaItem } from '../components/PosterCard';
import { Search, Film, Tv, Users, X } from 'lucide-react';

interface LibraryResponse {
  movies: MediaItem[];
  series: MediaItem[];
}

type Tab = 'movies' | 'series' | 'cast';

export const SearchPage: React.FC = () => {
  const [data, setData] = useState<LibraryResponse>({ movies: [], series: [] });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('movies');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedCast, setSelectedCast] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch('/api/library');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Helpers
  const getGenres = (items: MediaItem[]) => {
    const allGenres = new Set<string>();
    items.forEach(item => {
      item.genres?.forEach((g: any) => {
        const name = typeof g === 'string' ? g : g.name;
        if (name) allGenres.add(name);
      });
    });
    return Array.from(allGenres).sort();
  };

  const getCastName = (c: any): string => {
    return typeof c === 'string' ? c : c.name;
  };

  const hasCast = (item: MediaItem, castName: string) => {
    return item.cast?.some((c: any) => getCastName(c).toLowerCase() === castName.toLowerCase());
  };

  const matchesQuery = (item: MediaItem, q: string) => {
    if (!q) return true;
    const lowerQ = q.toLowerCase();
    if (item.title.toLowerCase().includes(lowerQ)) return true;
    if (item.cast?.some((c: any) => getCastName(c).toLowerCase().includes(lowerQ))) return true;
    return false;
  };

  // Derived Data
  const genres = useMemo(() => {
    return getGenres([...data.movies, ...data.series]);
  }, [data]);

  const allCast = useMemo(() => {
    const castSet = new Set<string>();
    [...data.movies, ...data.series].forEach(item => {
      item.cast?.forEach((c: any) => {
        const name = getCastName(c);
        if (name) castSet.add(name);
      });
    });
    return Array.from(castSet).sort();
  }, [data]);

  const filteredMovies = useMemo(() => {
    return data.movies.filter(m => {
      if (selectedGenre && !m.genres?.some((g: any) => (typeof g === 'string' ? g : g.name) === selectedGenre)) return false;
      if (selectedCast && !hasCast(m, selectedCast)) return false;
      return matchesQuery(m, query);
    });
  }, [data.movies, selectedGenre, selectedCast, query]);

  const filteredSeries = useMemo(() => {
    return data.series.filter(s => {
      if (selectedGenre && !s.genres?.some((g: any) => (typeof g === 'string' ? g : g.name) === selectedGenre)) return false;
      if (selectedCast && !hasCast(s, selectedCast)) return false;
      return matchesQuery(s, query);
    });
  }, [data.series, selectedGenre, selectedCast, query]);

  const filteredCast = useMemo(() => {
    if (!query) return allCast.slice(0, 50); // Show top 50 if no query
    const lowerQ = query.toLowerCase();
    return allCast.filter(c => c.toLowerCase().includes(lowerQ));
  }, [allCast, query]);

  const handleCastClick = (castName: string) => {
    setSelectedCast(castName);
    setActiveTab('movies');
    setQuery(''); // Clear query to show all items for this actor
  };

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center text-primary">Loading...</div>;

  return (
    <div className="p-6 pb-24 min-h-screen bg-background text-white">
      {/* Search Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-md z-20 pb-4 -mx-6 px-6 pt-4 space-y-4 border-b border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search movies, series, people..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-surface border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {query && (
            <button 
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {/* Active Cast Filter Chip */}
          {selectedCast && (
            <button
              onClick={() => setSelectedCast(null)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-primary text-black whitespace-nowrap"
            >
              <Users size={14} />
              {selectedCast}
              <X size={14} />
            </button>
          )}

          {/* Genre Filters */}
          <button
            onClick={() => setSelectedGenre(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedGenre === null && !selectedCast
                ? 'bg-white/20 text-white' 
                : 'bg-surface text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            All Genres
          </button>
          {genres.map(genre => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre === selectedGenre ? null : genre)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedGenre === genre 
                  ? 'bg-primary text-black' 
                  : 'bg-surface text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            onClick={() => setActiveTab('movies')}
            className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'movies' ? 'text-primary' : 'text-gray-400 hover:text-white'
            }`}
          >
            Movies ({filteredMovies.length})
            {activeTab === 'movies' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
          <button
            onClick={() => setActiveTab('series')}
            className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'series' ? 'text-primary' : 'text-gray-400 hover:text-white'
            }`}
          >
            Series ({filteredSeries.length})
            {activeTab === 'series' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
          <button
            onClick={() => setActiveTab('cast')}
            className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
              activeTab === 'cast' ? 'text-primary' : 'text-gray-400 hover:text-white'
            }`}
          >
            Cast ({filteredCast.length})
            {activeTab === 'cast' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6">
        {activeTab === 'movies' && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredMovies.map(m => (
              <PosterCard key={m.id} item={m} onClick={() => navigate(`/item/${m.id}`)} />
            ))}
            {filteredMovies.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-500">
                No movies found matching your criteria.
              </div>
            )}
          </div>
        )}

        {activeTab === 'series' && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {filteredSeries.map(s => (
              <PosterCard key={s.id} item={s} onClick={() => navigate(`/series?title=${encodeURIComponent(s.title)}`)} />
            ))}
            {filteredSeries.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-500">
                No series found matching your criteria.
              </div>
            )}
          </div>
        )}

        {activeTab === 'cast' && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredCast.map(actor => (
              <button
                key={actor}
                onClick={() => handleCastClick(actor)}
                className="flex items-center gap-3 p-3 bg-surface rounded-lg hover:bg-white/10 transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-primary group-hover:text-black transition-colors">
                  <Users size={20} />
                </div>
                <span className="font-medium text-sm truncate">{actor}</span>
              </button>
            ))}
            {filteredCast.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-500">
                No cast members found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
