import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Search, Bell, User, Filter, X } from 'lucide-react';
import logo from '@/assets/logo.svg';
import { useSearch } from '@/context/SearchContext';
import { useServices } from '@/services/ServiceContext';
import { LibraryFolder } from '@/types';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { query, setQuery, mediaType, setMediaType, yearFrom, setYearFrom, yearTo, setYearTo, folderId, setFolderId, isActive } = useSearch();
  const [showFilters, setShowFilters] = useState(false);
  
  const { libraryService } = useServices();
  const [folders, setFolders] = useState<LibraryFolder[]>([]);

  useEffect(() => {
    libraryService.getFolders().then(setFolders).catch(console.error);
  }, [libraryService]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-show filters if active but query is empty (e.g. filtering by type only)
  useEffect(() => {
    if (isActive && !query && !showFilters) {
      // Optional: setShowFilters(true);
    }
  }, [isActive, query]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) => 
    `hover:text-text transition-colors ${isActive ? 'text-text font-semibold' : ''}`;

  const clearSearch = () => {
    setQuery('');
    setMediaType('all');
    setYearFrom(undefined);
    setYearTo(undefined);
    setFolderId(undefined);
    setShowFilters(false);
  };

  return (
    <nav className={`fixed top-0 w-full z-50 transition-colors duration-300 ${
      isScrolled || isActive ? 'bg-background/95 backdrop-blur-sm shadow-lg' : 'bg-gradient-to-b from-background/80 to-transparent'
    }`}>
      <div className="px-4 md:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2" onClick={clearSearch}>
            <img src={logo} alt="CinemaCore" className="h-8 w-8" />
            <span className="text-primary text-2xl font-bold hidden sm:block">CinemaCore</span>
          </Link>
          <div className="hidden md:flex gap-6 text-sm text-text/70">
            <NavLink to="/" className={navLinkClass} end onClick={clearSearch}>Home</NavLink>
            <NavLink to="/movies" className={navLinkClass} onClick={clearSearch}>Movies</NavLink>
            <NavLink to="/series" className={navLinkClass} onClick={clearSearch}>Series</NavLink>
            <NavLink to="/settings" className={navLinkClass} onClick={clearSearch}>Settings</NavLink>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-text">
          {/* Search Bar */}
          <div className="relative group hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text/50 group-focus-within:text-primary transition-colors" />
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search library..."
              className="bg-surface/50 border border-white/10 rounded-full pl-10 pr-10 py-2 text-sm w-48 focus:w-72 focus:outline-none focus:border-primary transition-all"
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text/50 hover:text-text"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-full transition-colors ${showFilters || (isActive && !query) ? 'bg-primary/20 text-primary' : 'hover:bg-surface/50 text-text/70'}`}
            title="Filters"
          >
            <Filter className="w-5 h-5" />
          </button>

          <Bell className="w-5 h-5 cursor-pointer hover:text-text/70" />
          <div className="flex items-center gap-2 cursor-pointer hover:text-text/70">
            <div className="w-8 h-8 bg-secondary rounded flex items-center justify-center text-white">
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="border-t border-white/5 bg-surface/95 backdrop-blur-md animate-in slide-in-from-top-2">
          <div className="px-4 md:px-12 py-4 flex flex-wrap items-center gap-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text/50 uppercase tracking-wider">Type</span>
              <select 
                value={mediaType}
                onChange={(e) => setMediaType(e.target.value as any)}
                className="bg-background border border-white/10 rounded px-3 py-1.5 text-sm focus:border-primary outline-none"
              >
                <option value="all">All Media</option>
                <option value="movie">Movies</option>
                <option value="series">Episodes</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text/50 uppercase tracking-wider">Year</span>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  placeholder="From"
                  value={yearFrom || ''}
                  onChange={(e) => setYearFrom(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="bg-background border border-white/10 rounded px-3 py-1.5 text-sm w-20 focus:border-primary outline-none"
                />
                <span className="text-text/30">-</span>
                <input 
                  type="number" 
                  placeholder="To"
                  value={yearTo || ''}
                  onChange={(e) => setYearTo(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="bg-background border border-white/10 rounded px-3 py-1.5 text-sm w-20 focus:border-primary outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text/50 uppercase tracking-wider">Folder</span>
              <select 
                value={folderId || ''}
                onChange={(e) => setFolderId(e.target.value || undefined)}
                className="bg-background border border-white/10 rounded px-3 py-1.5 text-sm focus:border-primary outline-none max-w-[200px]"
              >
                <option value="">All Folders</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.path}</option>
                ))}
              </select>
            </div>

            {isActive && (
              <button 
                onClick={clearSearch}
                className="ml-auto text-xs text-red-400 hover:text-red-300 font-medium"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
