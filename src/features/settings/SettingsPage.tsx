import React, { useEffect, useState } from 'react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { LibraryScannerSection } from './LibraryScannerSection';
import { LibraryFoldersSection } from './LibraryFoldersSection';
import { DuplicatesSection } from './DuplicatesSection';
import { PlaybackSettingsSection } from './PlaybackSettingsSection';
import { ScreensaverSection } from './ScreensaverSection';
import { Button } from '@/components/ui/Button';
import { Edit2, Check, X } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [tmdbKey, setTmdbKey] = useState('');
  const [omdbKey, setOmdbKey] = useState('');
  const [pairingCode, setPairingCode] = useState('');
  const [devices, setDevices] = useState<any[]>([]);
  
  // Inline editing state
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const fetchDevices = async () => {
    if (window.cinemacore?.settings?.getDevices) {
      const list = await window.cinemacore.settings.getDevices();
      setDevices(list);
    }
  };

  useEffect(() => {
    // Load TMDB Key from Backend
    if (window.cinemacore?.settings?.getSetting) {
      window.cinemacore.settings.getSetting('tmdbApiKey').then((key) => {
        if (key) setTmdbKey(key);
      });
      
      // Poll for pairing code
      const fetchCode = async () => {
        const code = await window.cinemacore.settings.getPairingCode();
        setPairingCode(code);
      };
      fetchCode();
      const interval = setInterval(fetchCode, 5000);
      
      fetchDevices();

      return () => clearInterval(interval);
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

  const handleRevoke = async (id: string) => {
    if (confirm('Are you sure you want to revoke this device?')) {
      await window.cinemacore.settings.revokeDevice(id);
      fetchDevices();
    }
  };

  const handleRevokeAll = async () => {
    if (confirm('Are you sure you want to revoke ALL devices? This will disconnect all remotes.')) {
      await window.cinemacore.settings.revokeAllDevices();
      fetchDevices();
    }
  };

  const startEditing = (id: string, currentName: string) => {
    setEditingDeviceId(id);
    setEditingName(currentName);
  };

  const cancelEditing = () => {
    setEditingDeviceId(null);
    setEditingName('');
  };

  const saveEditing = async (id: string) => {
    if (editingName.trim()) {
      await window.cinemacore.settings.renameDevice(id, editingName.trim());
      fetchDevices();
    }
    cancelEditing();
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
          <ScreensaverSection />
        </section>

        <section className="bg-surface p-6 rounded-lg shadow-lg">
          <LibraryScannerSection />
        </section>

        <section className="bg-surface p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold mb-4">Home Server</h3>
          <div className="bg-background/50 p-4 rounded-lg border border-white/5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-text">Pairing Code</h4>
                <p className="text-xs text-text/60 mt-1">Enter this code in CinemaCore Remote to pair.</p>
              </div>
              <div className="text-2xl font-mono font-bold tracking-widest text-primary">
                {pairingCode || "----"}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
               <h4 className="text-sm font-medium text-text">Paired Devices</h4>
               {devices.length > 0 && (
                   <Button size="sm" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20 h-7 text-xs" onClick={handleRevokeAll}>Revoke All</Button>
               )}
            </div>
            
            {devices.length === 0 ? (
                <p className="text-xs text-text/50 italic">No devices paired.</p>
            ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {devices.map(d => (
                        <div key={d.id} className="flex items-center justify-between bg-background/30 p-3 rounded border border-white/5">
                            <div className="flex-1">
                                {editingDeviceId === d.id ? (
                                  <div className="flex items-center gap-2">
                                    <input 
                                      type="text" 
                                      value={editingName}
                                      onChange={(e) => setEditingName(e.target.value)}
                                      className="bg-input border border-text/20 rounded px-2 py-1 text-sm text-text focus:outline-none focus:border-primary w-40"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveEditing(d.id);
                                        if (e.key === 'Escape') cancelEditing();
                                      }}
                                    />
                                    <button onClick={() => saveEditing(d.id)} className="text-green-500 hover:text-green-400">
                                      <Check size={16} />
                                    </button>
                                    <button onClick={cancelEditing} className="text-red-500 hover:text-red-400">
                                      <X size={16} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                      <div className="text-sm font-medium text-text/90">{d.deviceName || 'Unknown Device'}</div>
                                      <button 
                                          onClick={() => startEditing(d.id, d.deviceName || 'Unknown Device')}
                                          className="text-text/30 hover:text-primary transition-colors"
                                          title="Rename Device"
                                      >
                                          <Edit2 size={12} />
                                      </button>
                                  </div>
                                )}
                                <div className="text-xs text-text/50 mt-0.5">
                                    Last seen: {new Date(d.lastSeenAt).toLocaleDateString()} {new Date(d.lastSeenAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                            </div>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-500/10 h-8 px-3 text-xs" onClick={() => handleRevoke(d.id)}>
                                Revoke
                            </Button>
                        </div>
                    ))}
                </div>
            )}
          </div>
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
