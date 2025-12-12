import { useEffect, useState, useCallback, useMemo } from 'react';
import { Hero } from '@/features/home/Hero';
import { MovieRow } from '@/features/home/MovieRow';
import { MovieCard } from '@/features/home/MovieCard';
import { MovieDetailOverlay } from '@/features/details/MovieDetailOverlay';
import { useServices } from '@/services/ServiceContext';
import { Movie, MovieFile } from '@/types';
import { ManualMetadataEditor } from '@/features/settings/ManualMetadataEditor';
import { DeleteConfirmationDialog } from '@/components/dialogs/DeleteConfirmationDialog';
import { useSearch } from '@/context/SearchContext';
import { matchesSearchQuery } from '@/domain/searchUtils';

const GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime", 
  "Documentary", "Drama", "Family", "Fantasy", "History", 
  "Horror", "Music", "Mystery", "Romance", "Sci-Fi", 
  "Thriller", "War", "Western"
];

export const HomePage = () => {
  const { movieService, libraryService } = useServices();
  const { searchQuery } = useSearch();
  const [allFiles, setAllFiles] = useState<MovieFile[]>([]);
  
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  const [recentMovies, setRecentMovies] = useState<Movie[]>([]);
  const [continueWatching, setContinueWatching] = useState<Movie[]>([]);
  const [genreRows, setGenreRows] = useState<{ title: string; movies: Movie[] }[]>([]);
  
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

  // Editor State
  const [editingFile, setEditingFile] = useState<MovieFile | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Delete State
  const [movieToDelete, setMovieToDelete] = useState<Movie | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const loadData = useCallback(async () => {
    const files = await libraryService.getAllFiles();
    setAllFiles(files);

    const featured = await movieService.getFeaturedMovie();
    const recent = await movieService.getRecentMovies();
    const watching = await movieService.getContinueWatching();
    
    // Fetch all genres in parallel
    const genreResults = await Promise.all(
      GENRES.map(async (genre) => {
        const movies = await movieService.getMoviesByGenre(genre);
        return { title: genre, movies };
      })
    );

    // Filter out empty genres
    const nonEmptyGenres = genreResults.filter(g => g.movies.length > 0);

    setFeaturedMovie(featured);
    setRecentMovies(recent);
    setContinueWatching(watching);
    setGenreRows(nonEmptyGenres);
  }, [movieService, libraryService]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return [];
    return allFiles
      .filter(f => matchesSearchQuery(f, searchQuery))
      .map(f => ({
        id: f.id,
        title: f.metadata?.title || f.guessedTitle || f.fileName,
        year: f.metadata?.year || f.guessedYear || 0,
        description: f.metadata?.plot || '',
        overview: f.metadata?.plot || '',
        posterUrl: f.tmdbPosterUrl || f.metadata?.posterUrl || '',
        backdropUrl: f.tmdbBackdropUrl || '',
        rating: parseFloat(f.metadata?.rating || '0') || 0,
        runtime: f.metadata?.runtimeMinutes || 0,
        genres: f.metadata?.genres || [],
        isWatched: false,
        fullPath: f.fullPath,
        isFavorite: f.isFavorite,
        isHidden: f.isHidden
      }));
  }, [allFiles, searchQuery]);

  const handleEdit = async (movie: Movie) => {
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

  if (!featuredMovie && searchQuery.length < 2) return <div className="flex items-center justify-center h-screen text-text">Loading...</div>;

  if (searchQuery.length >= 2) {
    return (
      <>
        <div className="pt-24 px-4 md:px-12 pb-20 min-h-screen">
          <h2 className="text-2xl font-bold text-text mb-6">Search results for "{searchQuery}"</h2>
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {searchResults.map(movie => (
                <MovieCard 
                  key={movie.id} 
                  movie={movie} 
                  onClick={setSelectedMovie}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
             <div className="text-text/50">No results found.</div>
          )}
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
  }

  return (
    <>
      <Hero 
        movie={featuredMovie!} 
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
            onUpdate={loadData}
          />
        )}
        
        <MovieRow 
          title="Recently Added" 
          movies={recentMovies} 
          onMovieClick={setSelectedMovie}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onUpdate={loadData}
        />
        
        {genreRows.map((row) => (
          <MovieRow 
            key={row.title}
            title={row.title} 
            movies={row.movies} 
            onMovieClick={setSelectedMovie}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onUpdate={loadData}
          />
        ))}
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
