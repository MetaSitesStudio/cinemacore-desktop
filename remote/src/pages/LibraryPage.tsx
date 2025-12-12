import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../lib/api';
import { Film, Tv } from 'lucide-react';

interface MediaItem {
  id: string;
  title: string;
  year?: number;
  poster?: string;
  mediaType: 'movie' | 'series';
}

interface LibraryResponse {
  movies: MediaItem[];
  series: MediaItem[];
}

const PosterCard: React.FC<{ item: MediaItem; onClick: () => void }> = ({ item, onClick }) => (
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
      <h3 className="text-white text-sm font-bold line-clamp-2 leading-tight">{item.title}</h3>
      {item.year && <p className="text-xs text-gray-400 mt-1">{item.year}</p>}
    </div>
  </div>
);

export const LibraryPage: React.FC = () => {
  const [data, setData] = useState<LibraryResponse>({ movies: [], series: [] });
  const [loading, setLoading] = useState(true);
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
        // handled by authFetch
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-primary">Loading Library...</div>;

  return (
    <div className="min-h-screen bg-background p-6 pb-24">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Library</h1>
      </header>

      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4 text-primary">
          <Film size={20} />
          <h2 className="text-xl font-semibold text-white">Movies</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {data.movies.map(m => (
            <PosterCard key={m.id} item={m} onClick={() => navigate(`/item/${m.id}`)} />
          ))}
          {data.movies.length === 0 && <p className="text-gray-500 text-sm col-span-full">No movies found.</p>}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-4 text-primary">
          <Tv size={20} />
          <h2 className="text-xl font-semibold text-white">Series</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {data.series.map(s => (
            <PosterCard key={s.id} item={s} onClick={() => navigate(`/series?title=${encodeURIComponent(s.title)}`)} />
          ))}
          {data.series.length === 0 && <p className="text-gray-500 text-sm col-span-full">No series found.</p>}
        </div>
      </section>
    </div>
  );
};
