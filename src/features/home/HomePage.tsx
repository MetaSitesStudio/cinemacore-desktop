import { useEffect, useState, useCallback } from 'react';
import { Hero } from '@/features/home/Hero';
import { MovieRow } from '@/features/home/MovieRow';
import { MovieDetailOverlay } from '@/features/details/MovieDetailOverlay';
import { useServices } from '@/services/ServiceContext';
import { Movie, MovieFile } from '@/types';
import { ManualMetadataEditor } from '@/features/settings/ManualMetadataEditor';
import { DeleteConfirmationDialog } from '@/components/dialogs/DeleteConfirmationDialog';

export const HomePage = () => {
  const { movieService, libraryService } = useServices();
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  const [recentMovies, setRecentMovies] = useState<Movie[]>([]);
  const [continueWatching, setContinueWatching] = useState<Movie[]>([]);
  const [actionMovies, setActionMovies] = useState<Movie[]>([]);
  const [dramaMovies, setDramaMovies] = useState<Movie[]>([]);
  
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  // Editor State
  const [editingFile, setEditingFile] = useState<MovieFile | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Delete State
  const [movieToDelete, setMovieToDelete] = useState<Movie | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const loadData = useCallback(async () => {
    const featured = await movieService.getFeaturedMovie();
    const recent = await movieService.getRecentMovies();
    const watching = await movieService.getContinueWatching();
    const action = await movieService.getMoviesByGenre('Action');
    const drama = await movieService.getMoviesByGenre('Drama');

    setFeaturedMovie(featured);
    setRecentMovies(recent);
    setContinueWatching(watching);
    setActionMovies(action);
    setDramaMovies(drama);
  }, [movieService]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      loadData();
    }
    setIsDeleteDialogOpen(false);
    setMovieToDelete(null);
  };

  const handleConfirmDiskDelete = async () => {
    if (!movieToDelete) return;
    const allFiles = await libraryService.getAllFiles();
    const file = allFiles.find(f => f.id === movieToDelete.id);
    if (file) {
      const success = await libraryService.deleteFileFromDisk(file);
      if (!success) {
        console.error("Failed to delete file from disk");
        alert("Failed to delete file from disk. Check console for details.");
      }
      loadData();
    }
    setIsDeleteDialogOpen(false);
    setMovieToDelete(null);
  };

  if (!featuredMovie) return <div className="flex items-center justify-center h-screen text-text">Loading...</div>;

  return (
    <>
      <Hero 
        movie={featuredMovie} 
        onDetailsClick={() => setSelectedMovie(featuredMovie)}
      />
      
      <div className="pb-20 -mt-32 relative z-10">
        {continueWatching.length > 0 && (
          <MovieRow 
            title="Continue Watching" 
            movies={continueWatching} 
            onMovieClick={setSelectedMovie}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
        
        <MovieRow 
          title="Recently Added" 
          movies={recentMovies} 
          onMovieClick={setSelectedMovie}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        
        <MovieRow 
          title="Action Thrillers" 
          movies={actionMovies} 
          onMovieClick={setSelectedMovie}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
        
        <MovieRow 
          title="Dramatic Hits" 
          movies={dramaMovies} 
          onMovieClick={setSelectedMovie}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      <MovieDetailOverlay 
        movie={selectedMovie} 
        onClose={() => setSelectedMovie(null)} 
        onUpdate={loadData}
      />

      {editingFile && (
        <ManualMetadataEditor
          file={editingFile}
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={async (updatedFile) => {
            await libraryService.addOrUpdateFiles([updatedFile]);
            loadData();
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
    </>
  );
};
