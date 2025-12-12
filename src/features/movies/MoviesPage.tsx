import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useServices } from '@/services/ServiceContext';
import { Movie, MovieFile } from '@/types';
import { MovieCard } from '@/features/home/MovieCard';
import { MovieDetailOverlay } from '@/features/details/MovieDetailOverlay';
import { ManualMetadataEditor } from '@/features/settings/ManualMetadataEditor';
import { DeleteConfirmationDialog } from '@/components/dialogs/DeleteConfirmationDialog';
import { useSearch } from '@/context/SearchContext';
import { matchesSearchQuery } from '@/domain/searchUtils';
import { Heart } from 'lucide-react';

export const MoviesPage: React.FC = () => {
  const { libraryService } = useServices();
  const { searchQuery } = useSearch();
  const [rawFiles, setRawFiles] = useState<MovieFile[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [sortBy, setSortBy] = useState<'year' | 'title'>('year');

  const [filters, setFilters] = useState({
    favoritesOnly: false,
    hideHidden: true,
    genre: "all",
  });
  
  // Editor State
  const [editingFile, setEditingFile] = useState<MovieFile | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Delete State
  const [movieToDelete, setMovieToDelete] = useState<Movie | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const loadMovies = useCallback(async () => {
    const allFiles = await libraryService.getAllFiles();
    setRawFiles(allFiles);
  }, [libraryService]);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    rawFiles.forEach(f => {
      const genres = f.metadata?.genres || [];
      genres.forEach(g => {
        if (typeof g === 'string') {
          set.add(g);
        } else if (typeof g === 'object' && (g as any).name) {
          set.add((g as any).name);
        }
      });
    });
    return Array.from(set).sort();
  }, [rawFiles]);

  const movies = useMemo(() => {
    let filtered = rawFiles;

    // 1. Search
    if (searchQuery.length >= 2) {
      filtered = filtered.filter(f => matchesSearchQuery(f, searchQuery));
    }

    // 2. Filters
    filtered = filtered.filter(f => {
      // Always filter for movies on this page
      if (f.mediaType && f.mediaType !== 'movie') return false;
      
      if (filters.favoritesOnly && !f.isFavorite) return false;
      if (filters.hideHidden && f.isHidden) return false;

      if (filters.genre !== "all") {
        const genres = f.metadata?.genres || [];
        // Handle both string[] and {name: string}[] just in case
        const names = genres.map(g => typeof g === 'string' ? g : (g as any).name).filter(Boolean);
        if (!names.includes(filters.genre)) return false;
      }

      return true;
    });
    
    return filtered.map(f => ({
      id: f.id,
      title: f.metadata?.title || f.guessedTitle || f.fileName,
      year: f.metadata?.year || f.guessedYear || 0,
      description: f.metadata?.plot || '',
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
  }, [rawFiles, searchQuery, filters]);

  const handleEdit = async (movie: Movie) => {
    const file = rawFiles.find(f => f.id === movie.id);
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
    const file = rawFiles.find(f => f.id === movieToDelete.id);
    if (file) {
      await libraryService.hideFile(file.id);
      loadMovies();
    }
    setIsDeleteDialogOpen(false);
    setMovieToDelete(null);
  };

  const handleConfirmDiskDelete = async () => {
    if (!movieToDelete) return;
    const file = rawFiles.find(f => f.id === movieToDelete.id);
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
        
        <div className="flex items-center gap-4 bg-[var(--input-bg)] p-1.5 rounded-lg backdrop-blur-sm border border-white/5">
          {/* Favorites Toggle */}
          <button
            onClick={() => setFilters(prev => ({ ...prev, favoritesOnly: !prev.favoritesOnly }))}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${filters.favoritesOnly 
                ? 'bg-amber-500 text-black' 
                : 'text-text/80 hover:text-primary hover:bg-white/5'}
            `}
            title="Show Favorites Only"
          >
            <Heart size={16} className={filters.favoritesOnly ? "fill-black" : ""} />
            <span className="hidden sm:inline">Favorites</span>
          </button>

          <div className="w-px h-6 bg-white/10" />

          {/* Genre Dropdown */}
          <select 
            className="bg-transparent text-text/80 border-none outline-none px-3 py-1.5 text-sm font-medium cursor-pointer hover:text-primary transition-colors max-w-[150px]"
            value={filters.genre}
            onChange={(e) => setFilters(prev => ({ ...prev, genre: e.target.value }))}
          >
            <option value="all" className="bg-surface text-text">All Genres</option>
            {availableGenres.map(g => (
              <option key={g} value={g} className="bg-surface text-text">{g}</option>
            ))}
          </select>

          <div className="w-px h-6 bg-white/10" />

          {/* Sort Dropdown */}
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
            onUpdate={loadMovies}
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
