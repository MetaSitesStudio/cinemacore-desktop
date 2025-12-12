import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../lib/api';
import { PosterCard, MediaItem } from '../components/PosterCard';
import { Film, Tv, ChevronRight, Play } from 'lucide-react';

interface LibraryResponse {
  movies: MediaItem[];
  series: MediaItem[];
}

export const HomePage: React.FC = () => {
  const [data, setData] = useState<LibraryResponse>({ movies: [], series: [] });
  const [loading, setLoading] = useState(true);
  const [heroIndex, setHeroIndex] = useState(0);
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

  const heroItems = React.useMemo(() => {
    return data.movies.filter(m => m.poster).slice(0, 10);
  }, [data.movies]);

  useEffect(() => {
    if (heroItems.length === 0) return;
    const interval = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % heroItems.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [heroItems]);

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center text-primary">Loading...</div>;

  const recentMovies = data.movies.slice(0, 24);
  const recentSeries = data.series.slice(0, 24);
  const currentHero = heroItems[heroIndex];

  return (
    <div className="pb-24">
      {/* Hero Section */}
      {currentHero && (
        <div className="relative w-full h-[50vh] md:h-[60vh] overflow-hidden mb-8 group">
          <div className="absolute inset-0">
            <img 
              src={currentHero.poster} 
              alt={currentHero.title} 
              className="w-full h-full object-cover transition-transform duration-[10000ms] ease-linear scale-100 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 flex flex-col items-start justify-end h-full z-10">
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg line-clamp-2 max-w-2xl">
              {currentHero.title}
            </h1>
            {currentHero.year && (
              <p className="text-gray-300 text-lg mb-6 font-medium drop-shadow-md">
                {currentHero.year}
              </p>
            )}
            <button 
              onClick={() => navigate(`/item/${currentHero.id}`)}
              className="flex items-center gap-2 bg-primary text-black font-bold py-3 px-8 rounded-lg hover:bg-primary/90 transition-all transform hover:scale-105 shadow-lg shadow-primary/20"
            >
              <Play size={20} fill="currentColor" />
              Play Now
            </button>
          </div>

          {/* Indicators */}
          <div className="absolute bottom-4 right-6 flex gap-2 z-20">
            {heroItems.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-500 ${idx === heroIndex ? 'w-6 bg-primary' : 'w-1.5 bg-white/30'}`} 
              />
            ))}
          </div>
        </div>
      )}

      <div className="px-6 space-y-10">
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-primary">
              <Film size={20} />
              <h2 className="text-xl font-semibold text-white">Movies</h2>
            </div>
            <button onClick={() => navigate('/movies')} className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
              View All <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recentMovies.map(m => (
              <PosterCard key={m.id} item={m} onClick={() => navigate(`/item/${m.id}`)} />
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-primary">
              <Tv size={20} />
              <h2 className="text-xl font-semibold text-white">Series</h2>
            </div>
            <button onClick={() => navigate('/series-index')} className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
              View All <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recentSeries.map(s => (
              <PosterCard key={s.id} item={s} onClick={() => navigate(`/series?title=${encodeURIComponent(s.title)}`)} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
