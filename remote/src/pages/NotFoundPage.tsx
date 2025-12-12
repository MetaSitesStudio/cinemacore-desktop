import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-white p-6 text-center">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <p className="text-xl text-gray-400 mb-8">Page not found</p>
      <button 
        onClick={() => navigate('/home')}
        className="flex items-center gap-2 bg-primary text-black font-bold py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors"
      >
        <Home size={20} />
        Go Home
      </button>
    </div>
  );
};
