import React, { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, Film, Tv, Search } from 'lucide-react';

export const Layout: React.FC = () => {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/ping');
        setIsOnline(res.ok);
      } catch {
        setIsOnline(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-white pb-20 md:pb-0">
      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between px-6 py-4 bg-surface/50 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold text-primary tracking-tight">CinemaCore <span className="text-white font-light">Remote</span></h1>
          <nav className="flex items-center gap-6">
            <NavLink to="/home" className={({ isActive }) => `text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-gray-400'}`}>Home</NavLink>
            <NavLink to="/movies" className={({ isActive }) => `text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-gray-400'}`}>Movies</NavLink>
            <NavLink to="/series-index" className={({ isActive }) => `text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-gray-400'}`}>Series</NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
            <span className="text-xs font-medium text-gray-400">{isOnline ? 'Connected' : 'Offline'}</span>
          </div>
          <NavLink to="/search" className={({ isActive }) => `p-2 transition-colors ${isActive ? 'text-primary' : 'text-gray-400 hover:text-white'}`}>
            <Search size={20} />
          </NavLink>
        </div>
      </header>

      {/* Mobile Header (Status Only) */}
      <div className="md:hidden absolute top-4 right-4 z-50 pointer-events-none">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-xl border-t border-white/10 z-50 flex justify-around items-center p-2 pb-safe">
        <NavLink to="/home" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${isActive ? 'text-primary' : 'text-gray-500'}`}>
          <Home size={24} />
          <span className="text-[10px] font-medium">Home</span>
        </NavLink>
        <NavLink to="/movies" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${isActive ? 'text-primary' : 'text-gray-500'}`}>
          <Film size={24} />
          <span className="text-[10px] font-medium">Movies</span>
        </NavLink>
        <NavLink to="/series-index" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${isActive ? 'text-primary' : 'text-gray-500'}`}>
          <Tv size={24} />
          <span className="text-[10px] font-medium">Series</span>
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => `flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${isActive ? 'text-primary' : 'text-gray-500'}`}>
          <Search size={24} />
          <span className="text-[10px] font-medium">Search</span>
        </NavLink>
      </nav>

      <main>
        <Outlet />
      </main>
    </div>
  );
};
