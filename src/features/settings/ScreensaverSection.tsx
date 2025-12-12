import React, { useEffect, useState } from 'react';

export const ScreensaverSection: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState(5);

  useEffect(() => {
    const loadSettings = async () => {
      if (window.cinemacore?.settings?.getSetting) {
        const enabledVal = await window.cinemacore.settings.getSetting('screensaverEnabled');
        const minutesVal = await window.cinemacore.settings.getSetting('screensaverIdleMinutes');
        
        if (enabledVal !== null) setEnabled(enabledVal === 'true');
        if (minutesVal !== null) setIdleMinutes(parseInt(minutesVal, 10));
      } else {
        // Fallback for dev/mock
        const savedEnabled = localStorage.getItem('cinemacore-screensaver-enabled');
        const savedMinutes = localStorage.getItem('cinemacore-screensaver-minutes');
        
        if (savedEnabled !== null) setEnabled(savedEnabled === 'true');
        if (savedMinutes !== null) setIdleMinutes(parseInt(savedMinutes, 10));
      }
    };
    loadSettings();
  }, []);

  const handleSaveEnabled = async (value: boolean) => {
    setEnabled(value);
    if (window.cinemacore?.settings?.saveSetting) {
      await window.cinemacore.settings.saveSetting('screensaverEnabled', String(value));
    } else {
      localStorage.setItem('cinemacore-screensaver-enabled', String(value));
    }
    // Dispatch event so App.tsx can react immediately
    window.dispatchEvent(new Event('screensaver-settings-changed'));
  };

  const handleSaveMinutes = async (value: number) => {
    setIdleMinutes(value);
    if (window.cinemacore?.settings?.saveSetting) {
      await window.cinemacore.settings.saveSetting('screensaverIdleMinutes', String(value));
    } else {
      localStorage.setItem('cinemacore-screensaver-minutes', String(value));
    }
    // Dispatch event so App.tsx can react immediately
    window.dispatchEvent(new Event('screensaver-settings-changed'));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold mb-4">Screensaver</h3>
      
      <div className="space-y-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input 
            type="checkbox" 
            checked={enabled}
            onChange={(e) => handleSaveEnabled(e.target.checked)}
            className="w-4 h-4 text-primary focus:ring-primary bg-background border-text/20 rounded"
          />
          <span className="text-text">Enable Screensaver</span>
        </label>

        {enabled && (
          <div className="ml-7 space-y-2">
            <label className="block text-sm text-text/70">
              Start after {idleMinutes} minutes of inactivity
            </label>
            <input 
              type="range" 
              min="1" 
              max="60" 
              value={idleMinutes}
              onChange={(e) => handleSaveMinutes(parseInt(e.target.value, 10))}
              className="w-full max-w-xs h-2 bg-background rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        )}
      </div>
    </div>
  );
};
