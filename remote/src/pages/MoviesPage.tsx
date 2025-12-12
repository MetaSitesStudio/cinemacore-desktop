import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../lib/api';
import { PosterCard, MediaItem } from '../components/PosterCard';
import { Film } from 'lucide-react';

interface LibraryResponse {
  movies: MediaItem[];
  series: MediaItem[];
}

export const MoviesPage: React.FC = () => {
  const [data, setData] = useState<LibraryResponse>({ movies: [], series: [] });
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
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

  const genres = React.useMemo(() => {
    const allGenres = new Set<string>();
    data.movies.forEach(m => {
      m.genres?.forEach((g: any) => {
        const name = typeof g === 'string' ? g : g.name;
        if (name) allGenres.add(name);
      });
    });
    return Array.from(allGenres).sort();
  }, [data.movies]);

  const filteredMovies = React.useMemo(() => {
    if (!selectedGenre) return data.movies;
    return data.movies.filter(m => m.genres?.some((g: any) => {
      const name = typeof g === 'string' ? g : g.name;
      return name === selectedGenre;
    }));
  }, [data.movies, selectedGenre]);

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center text-primary">Loading Movies...</div>;

  return (
    <div className="p-6">
      <header className="mb-8 space-y-4">
        <div className="flex items-center gap-3">
          <Film size={28} className="text-primary" />
          <h1 className="text-3xl font-bold text-white">All Movies</h1>
        </div>

        {/* Genre Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setSelectedGenre(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedGenre === null 
                ? 'bg-primary text-black' 
                : 'bg-surface text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            All
          </button>
          {genres.map(genre => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
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
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredMovies.map(m => (
          <PosterCard key={m.id} item={m} onClick={() => navigate(`/item/${m.id}`)} />
        ))}
        {filteredMovies.length === 0 && <p className="text-gray-500 text-sm col-span-full">No movies found.</p>}
      </div>
    </div>
  );
};
