import React, { useEffect, useState, useCallback } from 'react';
import { useServices } from '@/services/ServiceContext';
import { Movie, MovieFile } from '@/types';
import { MovieCard } from '@/features/home/MovieCard';
import { MovieDetailOverlay } from '@/features/details/MovieDetailOverlay';
import { Button } from '@/components/ui/Button';
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
      posterUrl: f.metadata?.posterUrl || '',
      backdropUrl: '', // We don't have backdrops yet
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
    <div className="pt-24 px-4 md:px-12 min-h-screen bg-background text-text">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">Movies</h1>
        <div className="flex gap-4">
          <select 
            className="bg-surface text-text border border-text/20 rounded px-3 py-1.5"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'year' | 'title')}
          >
            <option value="year">Sort by Year</option>
            <option value="title">Sort by Title</option>
          </select>
          <Button variant="secondary" size="sm">Filter</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {sortedMovies.map(movie => (
          <div key={movie.id} className="flex justify-center">
            <MovieCard 
              movie={movie} 
              onClick={setSelectedMovie} 
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>
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
