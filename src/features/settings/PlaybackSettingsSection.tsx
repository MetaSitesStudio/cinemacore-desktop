import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PlaybackSettings } from '@/types';

export const PlaybackSettingsSection: React.FC = () => {
  const [settings, setSettings] = useState<PlaybackSettings>({
    playbackMode: 'systemDefault',
    customPlayerPath: null,
    customPlayerLabel: null
  });

  useEffect(() => {
    const loadSettings = async () => {
      if (window.cinemacore) {
        const saved = await window.cinemacore.settings.getPlaybackSettings();
        setSettings(saved);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async (newSettings: PlaybackSettings) => {
    setSettings(newSettings);
    if (window.cinemacore) {
      await window.cinemacore.settings.savePlaybackSettings(newSettings);
    }
  };

  const handleChoosePlayer = async () => {
    if (!window.cinemacore) return;
    
    const result = await window.cinemacore.media.selectCustomPlayer();
    if (!result.canceled && result.path) {
      handleSave({
        ...settings,
        playbackMode: 'custom',
        customPlayerPath: result.path,
        customPlayerLabel: result.label || result.path
      });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Preferred Player</h3>
      
      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input 
            type="radio" 
            name="playbackMode"
            checked={settings.playbackMode === 'systemDefault'}
            onChange={() => handleSave({ ...settings, playbackMode: 'systemDefault' })}
            className="w-4 h-4 text-primary focus:ring-primary bg-background border-text/20"
          />
          <span className="text-text">System default player</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input 
            type="radio" 
            name="playbackMode"
            checked={settings.playbackMode === 'custom'}
            onChange={() => handleSave({ ...settings, playbackMode: 'custom' })}
            className="w-4 h-4 text-primary focus:ring-primary bg-background border-text/20"
          />
          <span className="text-text">Custom external player</span>
        </label>

        {settings.playbackMode === 'custom' && (
          <div className="ml-7 space-y-2">
            <div className="flex items-center gap-4">
              <Button variant="secondary" onClick={handleChoosePlayer}>
                Choose player...
              </Button>
              {settings.customPlayerLabel && (
                <span className="text-sm text-text/70">
                  Current: {settings.customPlayerLabel}
                </span>
              )}
            </div>
            {settings.customPlayerPath && (
              <p className="text-xs text-text/40 font-mono">
                {settings.customPlayerPath}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
