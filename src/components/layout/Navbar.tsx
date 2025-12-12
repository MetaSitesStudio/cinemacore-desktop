import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, User, X } from 'lucide-react';
import logo from '@/assets/logo.svg';
import { useSearch } from '@/context/SearchContext';
import { useTheme } from '@/context/ThemeContext';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { searchQuery, setSearchQuery } = useSearch();
  const { currentTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) => 
    `hover:text-text transition-colors ${isActive ? 'text-text font-semibold' : ''}`;

  const clearSearch = () => {
    setSearchQuery('');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    // If user starts typing and is not on a main library page, redirect to home for global search
    if (value.length > 0 && !['/', '/movies', '/series'].includes(location.pathname)) {
      navigate('/');
    }
  };

  return (
    <nav className={`fixed top-0 w-full z-50 transition-colors duration-300 ${
      isScrolled || searchQuery ? 'bg-background/95 backdrop-blur-sm shadow-lg' : 'bg-gradient-to-b from-background/80 to-transparent'
    }`}>
      <div className="px-4 md:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2" onClick={clearSearch}>
            <img src={logo} alt="CinemaCore" className="h-8 w-8" />
            <span className="text-primary text-2xl font-bold hidden sm:block">CinemaCore</span>
            {currentTheme === 'christmas' && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-600/90 text-amber-200 uppercase tracking-wide">
                Xmas
              </span>
            )}
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
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('');
                  e.currentTarget.blur();
                }
              }}
              placeholder="Search library..."
              className="bg-[var(--input-bg)] text-text border border-white/10 rounded-full pl-10 pr-10 py-2 text-sm w-48 focus:w-72 focus:outline-none focus:border-primary transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text/50 hover:text-text"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <Bell className="w-5 h-5 cursor-pointer hover:text-text/70" />
          <div className="flex items-center gap-2 cursor-pointer hover:text-text/70">
            <div className="w-8 h-8 bg-secondary rounded flex items-center justify-center text-white">
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
