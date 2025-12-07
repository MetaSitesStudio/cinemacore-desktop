import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useServices } from '@/services/ServiceContext';
import { Series, MovieFile } from '@/types';
import { SeriesCard } from './SeriesCard';
import { SeriesDetailOverlay } from './SeriesDetailOverlay';
import { Button } from '@/components/ui/Button';
import { ManualMetadataEditor } from '@/features/settings/ManualMetadataEditor';
import { DeleteConfirmationDialog } from '@/components/dialogs/DeleteConfirmationDialog';

export const SeriesPage: React.FC = () => {
  const { libraryService } = useServices();
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [episodeFiles, setEpisodeFiles] = useState<MovieFile[]>([]);
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);
  const [sortBy, setSortBy] = useState<'year' | 'title'>('year');

  // Editor State
  const [editingFile, setEditingFile] = useState<MovieFile | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Delete State
  const [itemToDelete, setItemToDelete] = useState<{ type: 'series' | 'episode', data: Series | MovieFile } | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const loadSeries = useCallback(async () => {
    const allFiles = await libraryService.getAllFiles();
    
    // Filter for episodes only
    const episodes = allFiles.filter(f => 
      f.mediaType === 'episode' && !f.isHidden && f.seriesTitle
    );
    
    setEpisodeFiles(episodes);

    // Group by series title
    const seriesMap = new Map<string, MovieFile[]>();
    episodes.forEach(f => {
      const title = f.seriesTitle!;
      if (!seriesMap.has(title)) {
        seriesMap.set(title, []);
      }
      seriesMap.get(title)!.push(f);
    });

    // Convert to Series objects
    const mappedSeries: Series[] = Array.from(seriesMap.entries()).map(([title, files]) => {
      // Use metadata from the first file that has it, or fallback
      const metaFile = files.find(f => f.metadata) || files[0];
      
      return {
        id: title, // Use title as ID for grouping for now
        title: title,
        year: metaFile.metadata?.year || metaFile.guessedYear || 0,
        description: metaFile.metadata?.plot || `${files.length} episodes available`,
        posterUrl: metaFile.metadata?.posterUrl || '',
        backdropUrl: '', // We don't have backdrops yet
        rating: parseFloat(metaFile.metadata?.rating || '0') || 0,
        seasons: new Set(files.map(f => f.seasonNumber).filter(Boolean)).size,
        genres: metaFile.metadata?.genres || [],
        isWatched: false
      };
    });

    setSeriesList(mappedSeries);
  }, [libraryService]);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  const handleDeleteSeries = (series: Series) => {
    setItemToDelete({ type: 'series', data: series });
    setIsDeleteDialogOpen(true);
  };

  const handleEditSeries = (series: Series) => {
    alert(`Batch editing for series "${series.title}" is not yet implemented. Please edit individual episodes.`);
  };

  const handleDeleteEpisode = (file: MovieFile) => {
    setItemToDelete({ type: 'episode', data: file });
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmLibraryDelete = async () => {
    if (!itemToDelete) return;
    
    if (itemToDelete.type === 'series') {
      const series = itemToDelete.data as Series;
      const episodes = episodeFiles.filter(f => f.seriesTitle === series.title);
      for (const ep of episodes) {
        await libraryService.hideFile(ep.id);
      }
      setSelectedSeries(null);
    } else {
      const file = itemToDelete.data as MovieFile;
      await libraryService.hideFile(file.id);
    }
    
    loadSeries();
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleConfirmDiskDelete = async () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'series') {
      const series = itemToDelete.data as Series;
      const episodes = episodeFiles.filter(f => f.seriesTitle === series.title);
      for (const ep of episodes) {
        await libraryService.deleteFileFromDisk(ep);
      }
      setSelectedSeries(null);
    } else {
      const file = itemToDelete.data as MovieFile;
      await libraryService.deleteFileFromDisk(file);
    }

    loadSeries();
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleEditEpisode = (file: MovieFile) => {
    setEditingFile(file);
    setIsEditorOpen(true);
  };

  const sortedSeries = useMemo(() => {
    return [...seriesList].sort((a, b) => {
      if (sortBy === 'year') return b.year - a.year;
      return a.title.localeCompare(b.title);
    });
  }, [seriesList, sortBy]);

  const selectedEpisodes = useMemo(() => {
    if (!selectedSeries) return [];
    return episodeFiles.filter(f => f.seriesTitle === selectedSeries.title);
  }, [selectedSeries, episodeFiles]);

  // Find the best metadata to pass to the overlay (e.g. from the first episode that has it)
  const selectedSeriesMetadata = useMemo(() => {
    if (!selectedEpisodes.length) return null;
    const metaFile = selectedEpisodes.find(f => f.metadata);
    return metaFile?.metadata || null;
  }, [selectedEpisodes]);

  return (
    <div className="pt-24 px-4 md:px-12 min-h-screen bg-background text-text">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">TV Series</h1>
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
        {sortedSeries.map(series => (
          <div key={series.id} className="flex justify-center">
            <SeriesCard 
              series={series} 
              onClick={setSelectedSeries} 
              onDelete={handleDeleteSeries}
              onEdit={handleEditSeries}
            />
          </div>
        ))}
      </div>

      <SeriesDetailOverlay 
        isOpen={!!selectedSeries}
        onClose={() => setSelectedSeries(null)}
        seriesTitle={selectedSeries?.title || ''}
        episodes={selectedEpisodes}
        seriesMetadata={selectedSeriesMetadata}
        onDeleteEpisode={handleDeleteEpisode}
        onEditEpisode={handleEditEpisode}
        onDeleteSeries={() => selectedSeries && handleDeleteSeries(selectedSeries)}
        onEditSeries={() => selectedSeries && handleEditSeries(selectedSeries)}
      />

      {editingFile && (
        <ManualMetadataEditor
          file={editingFile}
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={async (updatedFile) => {
            await libraryService.addOrUpdateFiles([updatedFile]);
            loadSeries();
          }}
        />
      )}

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setItemToDelete(null);
        }}
        itemName={itemToDelete?.type === 'series' ? (itemToDelete.data as Series).title : (itemToDelete?.data as MovieFile)?.fileName || 'Episode'}
        isElectron={typeof window !== "undefined" && !!window.cinemacore?.deleteFile}
        onConfirmLibraryOnly={handleConfirmLibraryDelete}
        onConfirmDiskDelete={handleConfirmDiskDelete}
      />
    </div>
  );
};
