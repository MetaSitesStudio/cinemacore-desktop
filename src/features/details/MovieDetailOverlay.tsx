import React, { useState, useEffect } from 'react';
import { X, Play, Check, Trash2, Edit2, Film } from 'lucide-react';
import { Movie, MovieFile } from '@/types';
import { Button } from '@/components/ui/Button';
import { useServices } from '@/services/ServiceContext';
import { usePlayMedia } from '@/hooks/usePlayMedia';
import { ManualMetadataEditor } from '@/features/settings/ManualMetadataEditor';
import { DeleteConfirmationDialog } from '@/components/dialogs/DeleteConfirmationDialog';

interface MovieDetailOverlayProps {
  movie: Movie | null;
  onClose: () => void;
  onUpdate?: () => void; // Callback to refresh parent list
}

export const MovieDetailOverlay: React.FC<MovieDetailOverlayProps> = ({ movie, onClose, onUpdate }) => {
  const { libraryService } = useServices();
  const { playMedia } = usePlayMedia();
  
  // Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<MovieFile | null>(null);

  // Delete State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<MovieFile | null>(null);

  // Image Error Handling
  const [tmdbBackdropFailed, setTmdbBackdropFailed] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  // Trailer State
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerKey, setTrailerKey] = useState<string | null>(null);
  const [trailerError, setTrailerError] = useState<string | null>(null);
  const [loadingTrailer, setLoadingTrailer] = useState(false);

  useEffect(() => {
    setTmdbBackdropFailed(false);
    setShowFallback(false);
    setTrailerKey(null);
    setTrailerError(null);
  }, [movie?.id]);

  if (!movie) return null;

  const activeBackdrop = (!tmdbBackdropFailed && movie.tmdbBackdropUrl) 
    ? movie.tmdbBackdropUrl 
    : movie.backdropUrl;

  const getFile = async () => {
    const allFiles = await libraryService.getAllFiles();
    return allFiles.find(f => f.id === movie.id);
  };

  const handleWatchTrailer = async () => {
    if (!window.cinemacore) {
      setTrailerError("Not supported in web mode");
      return;
    }
    
    setLoadingTrailer(true);
    setTrailerError(null);
    
    try {
      const res = await window.cinemacore.media.getTrailer(movie.id);
      if (res.ok && res.youtubeKey) {
        setTrailerKey(res.youtubeKey);
        setShowTrailer(true);
      } else {
        setTrailerError(res.error === "NO_TRAILER" ? "No trailer found" : "Error loading trailer");
        // Auto clear error after 3s
        setTimeout(() => setTrailerError(null), 3000);
      }
    } catch (e) {
      console.error(e);
      setTrailerError("Failed to load trailer");
    } finally {
      setLoadingTrailer(false);
    }
  };

  const handlePlay = async () => {
    const file = await getFile();
    if (file) {
      playMedia(file);
    } else {
      console.error("Could not find file for movie", movie.id);
    }
  };

  const handleEdit = async () => {
    const file = await getFile();
    if (file) {
      setEditingFile(file);
      setIsEditorOpen(true);
    }
  };

  const handleDelete = async () => {
    const file = await getFile();
    if (file) {
      setFileToDelete(file);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleSaveMetadata = async (updatedFile: MovieFile) => {
    await libraryService.addOrUpdateFiles([updatedFile]);
    if (onUpdate) onUpdate();
    // Close overlay as data might have changed significantly
    onClose();
  };

  const handleConfirmLibraryDelete = async () => {
    if (fileToDelete) {
      await libraryService.hideFile(fileToDelete.id);
      if (onUpdate) onUpdate();
      onClose();
    }
    setIsDeleteDialogOpen(false);
  };

  const handleConfirmDiskDelete = async () => {
    if (fileToDelete) {
      const success = await libraryService.deleteFileFromDisk(fileToDelete);
      if (success) {
        if (onUpdate) onUpdate();
        onClose();
      } else {
        alert("Failed to delete file from disk. It might be in use or locked. Check the console for details.");
      }
    }
    setIsDeleteDialogOpen(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-8">
        <div 
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <div className="relative w-full max-w-4xl bg-surface rounded-lg shadow-2xl overflow-hidden max-h-full overflow-y-auto detail-overlay-scroll animate-in fade-in zoom-in duration-200">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-background/50 rounded-full hover:bg-text/20 transition-colors"
          >
            <X className="w-6 h-6 text-text" />
          </button>

          {/* Hero Image */}
          <div className="relative aspect-video w-full overflow-hidden bg-black">
            {activeBackdrop && !showFallback ? (
              <img 
                src={activeBackdrop} 
                alt={movie.title} 
                className="w-full h-full object-cover"
                onError={() => {
                  if (!tmdbBackdropFailed && movie.tmdbBackdropUrl) {
                    setTmdbBackdropFailed(true);
                  } else {
                    setShowFallback(true);
                  }
                }}
              />
            ) : (
              // Fallback: Blurred Poster or Gradient
              <div className="w-full h-full relative">
                 {movie.tmdbPosterUrl || movie.posterUrl ? (
                    <img 
                      src={movie.tmdbPosterUrl || movie.posterUrl} 
                      alt="" 
                      className="w-full h-full object-cover blur-3xl opacity-50 scale-110"
                    />
                 ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-background" />
                 )}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
            
            <div className="absolute bottom-8 left-8">
              <h2 className="text-4xl font-bold mb-4 text-text">{movie.title}</h2>
              <div className="flex gap-4">
                <Button className="gap-2" onClick={handlePlay}>
                  <Play className="w-5 h-5 fill-current" /> Play
                </Button>
                <Button 
                  variant="secondary" 
                  className="gap-2" 
                  onClick={handleWatchTrailer}
                  disabled={loadingTrailer}
                >
                  <Film className="w-5 h-5" /> 
                  {loadingTrailer ? "Loading..." : "Trailer"}
                </Button>
                {trailerError && (
                   <span className="text-red-500 text-sm self-center animate-pulse">{trailerError}</span>
                )}
                <Button variant="secondary" className="gap-2">
                  <Check className="w-5 h-5" /> Mark as Watched
                </Button>
                <Button variant="secondary" className="gap-2" onClick={handleEdit}>
                  <Edit2 className="w-5 h-5" /> Edit
                </Button>
                <Button 
                  className="gap-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20" 
                  onClick={handleDelete}
                >
                  <Trash2 className="w-5 h-5" /> Delete
                </Button>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="p-8 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8">
            <div className="space-y-6">
              <div className="flex items-center gap-4 text-sm text-text/60">
                <span>{movie.year}</span>
                <span>{Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>
                <span className="border border-text/30 px-1.5 rounded text-xs">HD</span>
              </div>
              
              <p className="text-lg text-text/70 leading-relaxed">
                {movie.description}
              </p>
            </div>

            <div className="space-y-4 text-sm text-text/60">
              <div>
                <span className="block text-text/50 mb-1">Genres:</span>
                <span className="text-text">{movie.genres.join(', ')}</span>
              </div>
              {/* @ts-ignore */}
              {movie.director && (
                <div>
                  <span className="block text-text/50 mb-1">Director:</span>
                  {/* @ts-ignore */}
                  <span className="text-text">{movie.director}</span>
                </div>
              )}
              {/* @ts-ignore */}
              {movie.cast && movie.cast.length > 0 && (
                <div>
                  <span className="block text-text/50 mb-1">Cast:</span>
                  {/* @ts-ignore */}
                  <span className="text-text">{movie.cast.map(c => c.name).join(', ')}</span>
                </div>
              )}
              <div>
                <span className="block text-text/50 mb-1">Original Language:</span>
                <span className="text-text">English</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editingFile && (
        <ManualMetadataEditor
          file={editingFile}
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSaveMetadata}
        />
      )}

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        itemName={movie.title}
        isElectron={!!window.cinemacore}
        onConfirmLibraryOnly={handleConfirmLibraryDelete}
        onConfirmDiskDelete={handleConfirmDiskDelete}
      />

      {/* Trailer Modal */}
      {showTrailer && trailerKey && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl">
            <button 
              onClick={() => setShowTrailer(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <iframe 
              src={`https://www.youtube.com/embed/${trailerKey}?playsinline=1&rel=0&modestbranding=1`}
              className="w-full h-full"
              allowFullScreen
              title="Trailer"
            />
          </div>
        </div>
      )}
    </>
  );
};
