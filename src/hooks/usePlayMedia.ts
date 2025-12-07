import { useCallback } from 'react';
import { MovieFile, PlaybackSettings } from '@/types';

export const usePlayMedia = () => {
  const playMedia = useCallback(async (file: MovieFile) => {
    if (!window.cinemacore) {
      console.warn("Playback is only available in the desktop application.");
      return;
    }

    try {
      const settings: PlaybackSettings = await window.cinemacore.settings.getPlaybackSettings();
      
      if (settings.playbackMode === 'custom' && settings.customPlayerPath) {
        await window.cinemacore.media.playWithCustomPlayer(settings.customPlayerPath, file.fullPath);
      } else {
        await window.cinemacore.media.playWithSystemDefault(file.fullPath);
      }
    } catch (error) {
      console.error("Failed to play media:", error);
    }
  }, []);

  return { playMedia };
};
