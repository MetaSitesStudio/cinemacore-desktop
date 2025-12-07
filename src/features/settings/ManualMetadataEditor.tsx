import React, { useState, useEffect } from 'react';
import { MovieFile } from '@/types';
import { Button } from '@/components/ui/Button';
import { X, Save } from 'lucide-react';

interface ManualMetadataEditorProps {
  file: MovieFile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedFile: MovieFile) => void;
}

export const ManualMetadataEditor: React.FC<ManualMetadataEditorProps> = ({
  file,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState({
    title: '',
    year: '',
    rating: '',
    genres: '',
    plot: '',
    posterUrl: ''
  });

  useEffect(() => {
    if (isOpen && file) {
      setFormData({
        title: file.metadata?.title || file.guessedTitle || '',
        year: (file.metadata?.year || file.guessedYear || '').toString(),
        rating: file.metadata?.rating || '',
        genres: file.metadata?.genres?.join(', ') || '',
        plot: file.metadata?.plot || '',
        posterUrl: file.metadata?.posterUrl || ''
      });
    }
  }, [isOpen, file]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedFile: MovieFile = {
      ...file,
      metadataSource: 'manual',
      metadata: {
        ...file.metadata,
        title: formData.title,
        year: parseInt(formData.year) || null,
        rating: formData.rating || null,
        genres: formData.genres.split(',').map(g => g.trim()).filter(Boolean),
        plot: formData.plot || null,
        posterUrl: formData.posterUrl || null,
        runtimeMinutes: file.metadata?.runtimeMinutes || null,
        imdbId: file.metadata?.imdbId || null
      }
    };

    onSave(updatedFile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-text/10 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-text/10">
          <h3 className="font-semibold text-lg">Edit Metadata</h3>
          <button onClick={onClose} className="text-text/50 hover:text-text">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-text/70">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                className="w-full bg-background/50 border border-text/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-text/70">Year</label>
              <input
                type="number"
                value={formData.year}
                onChange={e => setFormData({...formData, year: e.target.value})}
                className="w-full bg-background/50 border border-text/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-text/70">Rating</label>
              <input
                type="text"
                value={formData.rating}
                onChange={e => setFormData({...formData, rating: e.target.value})}
                placeholder="e.g. PG-13"
                className="w-full bg-background/50 border border-text/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-text/70">Genres (comma separated)</label>
              <input
                type="text"
                value={formData.genres}
                onChange={e => setFormData({...formData, genres: e.target.value})}
                placeholder="Action, Drama"
                className="w-full bg-background/50 border border-text/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-text/70">Poster URL</label>
            <input
              type="text"
              value={formData.posterUrl}
              onChange={e => setFormData({...formData, posterUrl: e.target.value})}
              className="w-full bg-background/50 border border-text/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-text/70">Plot</label>
            <textarea
              value={formData.plot}
              onChange={e => setFormData({...formData, plot: e.target.value})}
              rows={4}
              className="w-full bg-background/50 border border-text/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-primary resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-text/10">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
