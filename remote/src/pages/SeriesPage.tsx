import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authFetch } from '../lib/api';
import { ArrowLeft, Play } from 'lucide-react';

interface Episode {
  id: string;
  season: number;
  episode: number;
  title: string;
  poster?: string;
}

interface SeriesDetails {
  title: string;
  poster?: string;
  episodes: Episode[];
}

export const SeriesPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const title = searchParams.get('title');
  const navigate = useNavigate();
  
  const [data, setData] = useState<SeriesDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!title) {
      navigate('/series-index');
      return;
    }

    const load = async () => {
      try {
        const res = await authFetch(`/api/series?title=${encodeURIComponent(title)}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (e) {
        // handled
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [title, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-primary">Loading Series...</div>;
  if (!data) return null;

  // Group by season
  const seasons: Record<number, Episode[]> = {};
  data.episodes.forEach(ep => {
    if (!seasons[ep.season]) seasons[ep.season] = [];
    seasons[ep.season].push(ep);
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero / Header */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        {data.poster && (
          <div className="absolute inset-0">
            <img src={data.poster} className="w-full h-full object-cover opacity-30 blur-sm" alt="" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
          </div>
        )}
        
        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <button 
            onClick={() => navigate(-1)}
            className="absolute top-6 left-6 flex items-center gap-2 text-white/80 hover:text-white bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full transition-colors"
          >
            <ArrowLeft size={16} /> Back
          </button>
          
          <div className="flex gap-6 items-end">
            {data.poster && (
              <img src={data.poster} alt={data.title} className="w-24 md:w-32 rounded-lg shadow-2xl ring-1 ring-white/10" />
            )}
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 shadow-black drop-shadow-lg">{data.title}</h1>
          </div>
        </div>
      </div>

      {/* Episodes List */}
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        {Object.entries(seasons).map(([seasonNum, episodes]) => (
          <div key={seasonNum}>
            <h3 className="text-xl font-semibold text-primary mb-4 border-b border-white/10 pb-2">
              Season {seasonNum}
            </h3>
            <div className="space-y-2">
              {episodes.map(ep => (
                <div 
                  key={ep.id} 
                  onClick={() => navigate(`/item/${ep.id}`)}
                  className="flex items-center gap-4 p-3 bg-surface rounded-lg hover:bg-white/5 transition-colors group cursor-pointer"
                >
                  <div className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-full text-primary group-hover:bg-primary group-hover:text-background transition-colors">
                    <Play size={12} className="ml-0.5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-3">
                      <span className="text-sm font-mono text-gray-400">S{ep.season.toString().padStart(2, '0')}E{ep.episode.toString().padStart(2, '0')}</span>
                      <span className="text-white font-medium">{ep.title}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
