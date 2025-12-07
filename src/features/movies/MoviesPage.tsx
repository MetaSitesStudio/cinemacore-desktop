import React, { useEffect, useState, useCallback } from 'react';
import { useServices } from '@/services/ServiceContext';
import { Movie, MovieFile } from '@/types';
import { MovieCard } from '@/features/home/MovieCard';
import { MovieDetailOverlay } from '@/features/details/MovieDetailOverlay';
import { ManualMetadataEditor } from '@/features/settings/ManualMetadataEditor';
import { DeleteConfirmationDialog } from '@/components/dialogs/DeleteConfirmationDialog';

export const MoviesPage: React.FC = () => {
  const { libraryService } = useServices();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [sortBy, setSortBy] = useState<'year' | 'title'>('year');
  
  // Editor State
  const [editingFile, setEditingFile] = useState<MovieFile | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Delete State
  const [movieToDelete, setMovieToDelete] = useState<Movie | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const loadMovies = useCallback(async () => {
    const allFiles = await libraryService.getAllFiles();
    
    // Filter for movies only and map to Movie type
    const movieFiles = allFiles.filter(f => 
      (f.mediaType === 'movie' || !f.mediaType) && !f.isHidden
    );

    const mappedMovies: Movie[] = movieFiles.map(f => ({
      id: f.id,
      title: f.metadata?.title || f.guessedTitle || f.fileName,
      year: f.metadata?.year || f.guessedYear || 0,
      description: f.metadata?.plot || '',
      posterUrl: f.tmdbPosterUrl || f.metadata?.posterUrl || '',
      backdropUrl: f.tmdbBackdropUrl || '',
      rating: parseFloat(f.metadata?.rating || '0') || 0,
      runtime: f.metadata?.runtimeMinutes || 0,
      genres: f.metadata?.genres || [],
      isWatched: false
    }));

    setMovies(mappedMovies);
  }, [libraryService]);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  const handleEdit = async (movie: Movie) => {
    const allFiles = await libraryService.getAllFiles();
    const file = allFiles.find(f => f.id === movie.id);
    if (file) {
      setEditingFile(file);
      setIsEditorOpen(true);
    }
  };

  const handleDelete = (movie: Movie) => {
    setMovieToDelete(movie);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmLibraryDelete = async () => {
    if (!movieToDelete) return;
    const allFiles = await libraryService.getAllFiles();
    const file = allFiles.find(f => f.id === movieToDelete.id);
    if (file) {
      await libraryService.hideFile(file.id);
      loadMovies();
    }
    setIsDeleteDialogOpen(false);
    setMovieToDelete(null);
  };

  const handleConfirmDiskDelete = async () => {
    if (!movieToDelete) return;
    const allFiles = await libraryService.getAllFiles();
    const file = allFiles.find(f => f.id === movieToDelete.id);
    if (file) {
      await libraryService.deleteFileFromDisk(file);
      loadMovies();
    }
    setIsDeleteDialogOpen(false);
    setMovieToDelete(null);
  };

  const sortedMovies = [...movies].sort((a, b) => {
    if (sortBy === 'year') return b.year - a.year;
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="pt-24 px-6 md:px-12 min-h-screen bg-background text-text">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
            Movies
          </h1>
          <p className="text-text/60 mt-2 text-lg">
            {movies.length} {movies.length === 1 ? 'Movie' : 'Movies'} in your library
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-surface/50 p-1.5 rounded-lg backdrop-blur-sm border border-white/5">
          <select 
            className="bg-transparent text-text/80 border-none outline-none px-3 py-1.5 text-sm font-medium cursor-pointer hover:text-primary transition-colors"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'year' | 'title')}
          >
            <option value="year" className="bg-surface text-text">Sort by Year</option>
            <option value="title" className="bg-surface text-text">Sort by Title</option>
          </select>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-6 md:gap-8 pb-20">
        {sortedMovies.map(movie => (
          <MovieCard 
            key={movie.id}
            movie={movie} 
            onClick={setSelectedMovie} 
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <MovieDetailOverlay 
        movie={selectedMovie} 
        onClose={() => setSelectedMovie(null)} 
        onUpdate={loadMovies}
      />

      {editingFile && (
        <ManualMetadataEditor
          file={editingFile}
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={async (updatedFile) => {
            await libraryService.addOrUpdateFiles([updatedFile]);
            await loadMovies();
          }}
        />
      )}

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setMovieToDelete(null);
        }}
        itemName={movieToDelete?.title || 'Movie'}
        isElectron={typeof window !== "undefined" && !!window.cinemacore?.deleteFile}
        onConfirmLibraryOnly={handleConfirmLibraryDelete}
        onConfirmDiskDelete={handleConfirmDiskDelete}
      />
    </div>
  );
};
