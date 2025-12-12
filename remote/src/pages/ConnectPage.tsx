import React, { useState } from 'react';
import { Wifi, Lock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ConnectPage: React.FC = () => {
  const navigate = useNavigate();
  const [serverUrl, setServerUrl] = useState(localStorage.getItem('cc_server_base') || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    if (!serverUrl || !code) return;
    setLoading(true);
    setError('');

    try {
      // Clean URL
      const baseUrl = serverUrl.replace(/\/$/, '');
      
      const res = await fetch(`${baseUrl}/api/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      if (!res.ok) {
        throw new Error('Invalid code or server unreachable');
      }

      const data = await res.json();
      if (data.token) {
        localStorage.setItem('cc_server_base', baseUrl);
        localStorage.setItem('cc_token', data.token);
        navigate('/home');
      } else {
        throw new Error('No token received');
      }
    } catch (e) {
      setError('Connection failed. Check URL and Code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-text">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter text-white">
            CinemaCore <span className="text-primary">Remote</span>
          </h1>
          <p className="text-lg text-gray-400">Connect to your Home Server</p>
        </div>

        <div className="bg-surface p-8 rounded-2xl shadow-2xl space-y-6 border border-white/5">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Wifi size={16} /> Server Address
              </label>
              <input 
                type="text" 
                value={serverUrl}
                onChange={e => setServerUrl(e.target.value)}
                placeholder="http://192.168.1.x:17890"
                className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-white placeholder-gray-600"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Lock size={16} /> Pairing Code
              </label>
              <input 
                type="text" 
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="XXXX"
                className="w-full px-4 py-3 bg-background border border-white/10 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all text-white placeholder-gray-600 font-mono tracking-widest uppercase text-center text-lg"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button 
            onClick={handleConnect}
            disabled={loading}
            className="w-full py-3.5 bg-primary hover:bg-primary/90 text-background font-bold rounded-lg transition-all transform active:scale-[0.98] shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Connect'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-600">
          v0.0.1 • CinemaCore PWA Client
        </p>
      </div>
    </div>
  );
};
