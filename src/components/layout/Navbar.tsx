import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Search, Bell, User } from 'lucide-react';
import logo from '@/assets/logo.svg';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) => 
    `hover:text-text transition-colors ${isActive ? 'text-text font-semibold' : ''}`;

  return (
    <nav className={`fixed top-0 w-full z-50 transition-colors duration-300 ${
      isScrolled ? 'bg-background/95 backdrop-blur-sm' : 'bg-gradient-to-b from-background/80 to-transparent'
    }`}>
      <div className="px-4 md:px-12 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="CinemaCore" className="h-8 w-8" />
            <span className="text-primary text-2xl font-bold hidden sm:block">CinemaCore</span>
          </Link>
          <div className="hidden md:flex gap-6 text-sm text-text/70">
            <NavLink to="/" className={navLinkClass} end>Home</NavLink>
            <NavLink to="/movies" className={navLinkClass}>Movies</NavLink>
            <NavLink to="/series" className={navLinkClass}>Series</NavLink>
            <NavLink to="/settings" className={navLinkClass}>Settings</NavLink>
          </div>
        </div>
        
        <div className="flex items-center gap-6 text-text">
          <Search className="w-5 h-5 cursor-pointer hover:text-text/70" />
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
