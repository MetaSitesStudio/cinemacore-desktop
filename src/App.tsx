import { Routes, Route } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { HomePage } from '@/features/home/HomePage';
import { MoviesPage } from '@/features/movies/MoviesPage';
import { SeriesPage } from '@/features/series/SeriesPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { ScreensaverOverlay } from '@/components/ScreensaverOverlay';
import { useServices } from '@/services/ServiceContext';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Movie } from '@/types';

function App() {
  const { movieService } = useServices();
  const [showScreensaver, setShowScreensaver] = useState(false);
  const [screensaverMovies, setScreensaverMovies] = useState<Movie[]>([]);
  const [screensaverConfig, setScreensaverConfig] = useState({ enabled: false, minutes: 5 });
  
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const loadScreensaverSettings = useCallback(async () => {
    let enabled = false;
    let minutes = 5;

    if (window.cinemacore?.settings?.getSetting) {
      const enabledVal = await window.cinemacore.settings.getSetting('screensaverEnabled');
      const minutesVal = await window.cinemacore.settings.getSetting('screensaverIdleMinutes');
      if (enabledVal !== null) enabled = enabledVal === 'true';
      if (minutesVal !== null) minutes = parseInt(minutesVal, 10);
    } else {
      const savedEnabled = localStorage.getItem('cinemacore-screensaver-enabled');
      const savedMinutes = localStorage.getItem('cinemacore-screensaver-minutes');
      if (savedEnabled !== null) enabled = savedEnabled === 'true';
      if (savedMinutes !== null) minutes = parseInt(savedMinutes, 10);
    }
    setScreensaverConfig({ enabled, minutes });
  }, []);

  useEffect(() => {
    loadScreensaverSettings();
    
    const handleSettingsChange = () => loadScreensaverSettings();
    window.addEventListener('screensaver-settings-changed', handleSettingsChange);
    return () => window.removeEventListener('screensaver-settings-changed', handleSettingsChange);
  }, [loadScreensaverSettings]);

  // Fetch movies for screensaver
  useEffect(() => {
    if (screensaverConfig.enabled && screensaverMovies.length === 0) {
      movieService.getAllMovies().then(movies => {
        // Shuffle and pick 20
        const shuffled = [...movies].sort(() => 0.5 - Math.random());
        setScreensaverMovies(shuffled.slice(0, 20));
      });
    }
  }, [screensaverConfig.enabled, movieService, screensaverMovies.length]);

  // Idle Detection
  useEffect(() => {
    if (!screensaverConfig.enabled) {
      setShowScreensaver(false);
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
      return;
    }

    const checkIdle = () => {
      const now = Date.now();
      const idleTime = now - lastActivityRef.current;
      if (idleTime > screensaverConfig.minutes * 60 * 1000) {
        setShowScreensaver(true);
      }
    };

    idleTimerRef.current = setInterval(checkIdle, 10000); // Check every 10s

    const resetIdle = () => {
      lastActivityRef.current = Date.now();
      setShowScreensaver(false);
    };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);
    window.addEventListener('click', resetIdle);
    window.addEventListener('wheel', resetIdle);

    return () => {
      if (idleTimerRef.current) clearInterval(idleTimerRef.current);
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('click', resetIdle);
      window.removeEventListener('wheel', resetIdle);
    };
  }, [screensaverConfig]);

  return (
    <Layout>
      {showScreensaver && <ScreensaverOverlay movies={screensaverMovies} onClose={() => setShowScreensaver(false)} />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/movies" element={<MoviesPage />} />
        <Route path="/series" element={<SeriesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
