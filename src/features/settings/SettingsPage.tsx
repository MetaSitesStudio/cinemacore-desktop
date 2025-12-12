import React, { useEffect, useState } from 'react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { LibraryScannerSection } from './LibraryScannerSection';
import { LibraryFoldersSection } from './LibraryFoldersSection';
import { DuplicatesSection } from './DuplicatesSection';
import { PlaybackSettingsSection } from './PlaybackSettingsSection';
import { Button } from '@/components/ui/Button';

export const SettingsPage: React.FC = () => {
  const [tmdbKey, setTmdbKey] = useState('');
  const [omdbKey, setOmdbKey] = useState('');

  useEffect(() => {
    // Load TMDB Key from Backend
    if (window.cinemacore?.settings?.getSetting) {
      window.cinemacore.settings.getSetting('tmdbApiKey').then((key) => {
        if (key) setTmdbKey(key);
      });
    } else {
      // Fallback for dev/mock
      const savedTmdbKey = localStorage.getItem('cinemacore-tmdb-api-key');
      if (savedTmdbKey) setTmdbKey(savedTmdbKey);
    }

    const savedOmdbKey = localStorage.getItem('cinemacore-omdb-api-key');
    if (savedOmdbKey) setOmdbKey(savedOmdbKey);
    
    // Load OMDb Key from Backend
    if (window.cinemacore?.settings?.getSetting) {
      window.cinemacore.settings.getSetting('omdbApiKey').then((key) => {
        if (key) setOmdbKey(key);
      });
    }
  }, []);

  const handleSaveTmdbKey = async () => {
    if (window.cinemacore?.settings?.saveSetting) {
      await window.cinemacore.settings.saveSetting('tmdbApiKey', tmdbKey);
      alert('TMDB API Key saved to backend!');
    } else {
      localStorage.setItem('cinemacore-tmdb-api-key', tmdbKey);
      alert('TMDB API Key saved (local)!');
    }
  };

  const handleSaveOmdbKey = async () => {
    if (window.cinemacore?.settings?.saveSetting) {
      await window.cinemacore.settings.saveSetting('omdbApiKey', omdbKey);
      // Also save to local storage for frontend fallback/ServiceContext
      localStorage.setItem('cinemacore-omdb-api-key', omdbKey);
      alert('OMDb API Key saved to backend!');
      window.location.reload();
    } else {
      localStorage.setItem('cinemacore-omdb-api-key', omdbKey);
      window.location.reload();
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 pt-24 min-h-screen bg-background text-text">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Row 1: Appearance & Library Folders */}
        <section className="bg-surface p-6 rounded-lg shadow-lg">
          <ThemeSwitcher />
        </section>

        <section className="bg-surface p-6 rounded-lg shadow-lg">
          <LibraryFoldersSection />
          <div className="mt-6 pt-6 border-t border-white/10">
            <DuplicatesSection />
          </div>
        </section>

        {/* Row 2: Player & Scanner */}
        <section className="bg-surface p-6 rounded-lg shadow-lg">
          <PlaybackSettingsSection />
        </section>

        <section className="bg-surface p-6 rounded-lg shadow-lg">
          <LibraryScannerSection />
        </section>

        {/* Row 3: Metadata & About */}
        <section className="bg-surface p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Metadata Providers</h3>
          
          <div className="space-y-4">
            {/* TMDB */}
            <div>
              <h4 className="text-sm font-medium mb-1">TMDB Integration</h4>
              <p className="text-text/70 text-xs mb-2">
                Enter your TMDB API Key to fetch metadata.
              </p>
              <div className="flex gap-3">
                <input 
                  type="password" 
                  value={tmdbKey}
                  onChange={(e) => setTmdbKey(e.target.value)}
                  placeholder="Enter TMDB API Key"
                  className="flex-1 bg-input border border-text/20 rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
                />
                <Button size="sm" onClick={handleSaveTmdbKey}>Save</Button>
              </div>
            </div>

            {/* OMDb */}
            <div>
              <h4 className="text-sm font-medium mb-1">OMDb Integration</h4>
              <p className="text-text/70 text-xs mb-2">
                Enter your OMDb API Key to fetch metadata.
              </p>
              <div className="flex gap-3">
                <input 
                  type="password" 
                  value={omdbKey}
                  onChange={(e) => setOmdbKey(e.target.value)}
                  placeholder="Enter OMDb API Key"
                  className="flex-1 bg-input border border-text/20 rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
                />
                <Button size="sm" onClick={handleSaveOmdbKey}>Save</Button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface p-6 rounded-lg shadow-lg h-fit">
          <h3 className="text-lg font-semibold mb-2">About</h3>
          <p className="text-text/70 text-sm">
            CinemaCore Desktop v0.1.0
          </p>
        </section>
      </div>
    </div>
  );
};
