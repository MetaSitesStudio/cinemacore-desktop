import React, { useEffect, useRef, useState } from 'react';
import { usePlayer } from './PlayerContext';
import { X } from 'lucide-react';

export const PlayerOverlay: React.FC = () => {
  const { state, closePlayer } = usePlayer();
  const { currentFile, isOpen } = state;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fileUrl, setFileUrl] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    const loadUrl = async () => {
      if (!isOpen || !currentFile) return;
      
      // Reset URL to prevent playing previous video or stale state
      setFileUrl(""); 
      
      if (window.cinemacore?.getFileUrl) {
        const url = await window.cinemacore.getFileUrl(currentFile.fullPath);
        if (mounted) {
          setFileUrl(url);
        }
      }
    };
    loadUrl();
    return () => { mounted = false; };
  }, [isOpen, currentFile]);

  useEffect(() => {
    if (isOpen && videoRef.current && fileUrl) {
      videoRef.current.play().catch(err => console.error("Auto-play failed:", err));
    }
  }, [isOpen, fileUrl]);

  if (!isOpen || !currentFile) return null;

  const isElectron = typeof window !== "undefined" && !!window.cinemacore?.getFileUrl;

  const title = currentFile.mediaType === 'episode'
    ? `${currentFile.seriesTitle} - S${currentFile.seasonNumber}E${currentFile.episodeNumber} ${currentFile.episodeTitle || ''}`
    : (currentFile.metadata?.title || currentFile.guessedTitle || currentFile.fileName);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col animate-in fade-in duration-300">
      {/* Header / Controls Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent z-10 pointer-events-none">
        <h2 className="text-white text-lg font-medium drop-shadow-md px-2 pointer-events-auto">
          {title}
        </h2>
        <button 
          onClick={closePlayer}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors pointer-events-auto backdrop-blur-sm"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Video Player */}
      <div className="flex-1 flex items-center justify-center bg-black">
        {isElectron && fileUrl ? (
          <video
            key={fileUrl} // Force recreation when URL changes
            ref={videoRef}
            src={fileUrl}
            controls
            autoPlay
            className="w-full h-full object-contain focus:outline-none"
            onEnded={() => {
              // Optional: close on end or show replay
            }}
          />
        ) : (
          <div className="text-white text-center p-8">
            <p className="text-xl mb-2">Playback Unavailable</p>
            <p className="text-white/60">
              {!isElectron 
                ? "Video playback is only available in the desktop application." 
                : "Could not generate file URL."}
            </p>
            <p className="text-xs text-white/40 mt-4 font-mono">{currentFile.fullPath}</p>
          </div>
        )}
      </div>
    </div>
  );
};
