import React, { useEffect, useState } from 'react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { LibraryScannerSection } from './LibraryScannerSection';
import { PlaybackSettingsSection } from './PlaybackSettingsSection';
import { Button } from '@/components/ui/Button';

export const SettingsPage: React.FC = () => {
  const [tmdbKey, setTmdbKey] = useState('');
  const [omdbKey, setOmdbKey] = useState('');

  useEffect(() => {
    const savedTmdbKey = localStorage.getItem('cinemacore-tmdb-api-key');
    if (savedTmdbKey) setTmdbKey(savedTmdbKey);

    const savedOmdbKey = localStorage.getItem('cinemacore-omdb-api-key');
    if (savedOmdbKey) setOmdbKey(savedOmdbKey);
  }, []);

  const handleSaveTmdbKey = () => {
    localStorage.setItem('cinemacore-tmdb-api-key', tmdbKey);
    alert('TMDB API Key saved!');
  };

  const handleSaveOmdbKey = () => {
    localStorage.setItem('cinemacore-omdb-api-key', omdbKey);
    // Force reload to update ServiceContext
    window.location.reload();
  };

  return (
    <div className="pt-24 px-4 md:px-12 min-h-screen bg-background text-text">
      <h1 className="text-4xl font-bold mb-8">Settings</h1>
      
      <div className="max-w-2xl space-y-8">
        <section className="bg-surface p-6 rounded-lg shadow-lg">
          <ThemeSwitcher />
        </section>

        <section className="bg-surface p-6 rounded-lg shadow-lg">
          <PlaybackSettingsSection />
        </section>

        <section className="bg-surface p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Metadata Providers</h3>
          
          <div className="space-y-6">
            {/* TMDB */}
            <div>
              <h4 className="text-sm font-medium mb-2">TMDB Integration</h4>
              <p className="text-text/70 text-xs mb-2">
                Enter your TMDB API Key to fetch metadata.
              </p>
              <div className="flex gap-4">
                <input 
                  type="password" 
                  value={tmdbKey}
                  onChange={(e) => setTmdbKey(e.target.value)}
                  placeholder="Enter TMDB API Key"
                  className="flex-1 bg-background border border-text/20 rounded px-4 py-2 text-text focus:outline-none focus:border-primary"
                />
                <Button onClick={handleSaveTmdbKey}>Save</Button>
              </div>
            </div>

            {/* OMDb */}
            <div>
              <h4 className="text-sm font-medium mb-2">OMDb Integration</h4>
              <p className="text-text/70 text-xs mb-2">
                Enter your OMDb API Key to fetch metadata.
              </p>
              <div className="flex gap-4">
                <input 
                  type="password" 
                  value={omdbKey}
                  onChange={(e) => setOmdbKey(e.target.value)}
                  placeholder="Enter OMDb API Key"
                  className="flex-1 bg-background border border-text/20 rounded px-4 py-2 text-text focus:outline-none focus:border-primary"
                />
                <Button onClick={handleSaveOmdbKey}>Save</Button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface p-6 rounded-lg shadow-lg">
          <LibraryScannerSection />
        </section>
        
        <section className="bg-surface p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-4">About</h3>
          <p className="text-text/70">
            CinemaCore Desktop v0.1.0
          </p>
        </section>
      </div>
    </div>
  );
};
