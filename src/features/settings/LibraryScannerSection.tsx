import React, { useState, useEffect, useCallback } from 'react';
import { useServices } from '@/services/ServiceContext';
import { ScanJob, MovieFile } from '@/types';
import { MetadataQueueStats } from '@/services/metadata/MetadataQueueService';
import { Button } from '@/components/ui/Button';
import { formatGuessedTitle } from '@/utils/filenameParser';
import { Loader2, AlertCircle, CheckCircle2, FolderSearch, Play, Pause, Star, Trash2, Eye, EyeOff, Edit2 } from 'lucide-react';
import { ManualMetadataEditor } from './ManualMetadataEditor';

export const LibraryScannerSection: React.FC = () => {
  const { fileScannerService, libraryService, metadataService, metadataQueueService } = useServices();
  
  const [scanJob, setScanJob] = useState<ScanJob | null>(null);
  const [libraryFiles, setLibraryFiles] = useState<MovieFile[]>([]);
  const [scanPaths, setScanPaths] = useState<string[]>([]);
  const [fetchingMetadataId, setFetchingMetadataId] = useState<string | null>(null);
  const [metadataStats, setMetadataStats] = useState<MetadataQueueStats | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  
  // Delete Dialog State
  const [filePendingDelete, setFilePendingDelete] = useState<MovieFile | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const isElectron = typeof window !== "undefined" && !!window.cinemacore?.deleteFile;

  // Manual Editor State
  const [editingFile, setEditingFile] = useState<MovieFile | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Load library files on mount
  const loadLibraryFiles = useCallback(async () => {
    try {
      const files = await libraryService.getAllFiles();
      // Filter hidden files unless showHidden is true
      const visibleFiles = showHidden ? files : files.filter(f => !f.isHidden);
      setLibraryFiles(visibleFiles);
    } catch (error) {
      console.error("Failed to load library files", error);
    }
  }, [libraryService, showHidden]);

  // Subscribe to metadata queue stats
  useEffect(() => {
    if (!metadataQueueService) return;

    setMetadataStats(metadataQueueService.getStats());
    const unsubscribe = metadataQueueService.onStatsChanged((stats) => {
      setMetadataStats(stats);
      // Refresh library files when metadata is processed to show updates
      if (stats.processed > 0) {
        loadLibraryFiles();
      }
    });

    return unsubscribe;
  }, [metadataQueueService, loadLibraryFiles]);

  useEffect(() => {
    loadLibraryFiles();
    // Load saved paths
    const savedPaths = localStorage.getItem('cinemacore-library-folders');
    if (savedPaths) {
      try {
        setScanPaths(JSON.parse(savedPaths));
      } catch (e) {
        console.error("Failed to parse saved paths", e);
      }
    }
  }, [loadLibraryFiles]);

  const handleAddFolder = async () => {
    if (window.cinemacore?.dialog) {
      try {
        const paths = await window.cinemacore.dialog.chooseFolders();
        if (paths.length > 0) {
          const newPaths = [...new Set([...scanPaths, ...paths])];
          setScanPaths(newPaths);
          localStorage.setItem('cinemacore-library-folders', JSON.stringify(newPaths));
        }
      } catch (error) {
        console.error("Failed to choose folders", error);
      }
    } else {
      // Web fallback - maybe prompt user or just add a dummy path
      const path = prompt("Enter folder path (Web Mode):", "C:/Movies");
      if (path) {
        const newPaths = [...new Set([...scanPaths, path])];
        setScanPaths(newPaths);
        localStorage.setItem('cinemacore-library-folders', JSON.stringify(newPaths));
      }
    }
  };

  const handleRemoveFolder = (pathToRemove: string) => {
    const newPaths = scanPaths.filter(p => p !== pathToRemove);
    setScanPaths(newPaths);
    localStorage.setItem('cinemacore-library-folders', JSON.stringify(newPaths));
  };

  // Start a new scan
  const handleStartScan = async () => {
    if (scanPaths.length === 0) return;
    
    try {
      const job = await fileScannerService.startScan({ 
        paths: scanPaths
      });
      setScanJob(job);
    } catch (error) {
      console.error("Failed to start scan", error);
    }
  };

  // Poll for scan status
  useEffect(() => {
    if (!scanJob || scanJob.status !== 'running') return;

    const intervalId = setInterval(async () => {
      try {
        const updatedJob = await fileScannerService.getScanJob(scanJob.id);
        if (updatedJob) {
          setScanJob(updatedJob);
          
          // If job just completed, process results
          if (updatedJob.status === 'completed') {
            const results = await fileScannerService.getScanResults(updatedJob.id);
            await libraryService.addOrUpdateFiles(results);
            await loadLibraryFiles();

            // Auto-enqueue for metadata if available
            if (metadataQueueService) {
              // We need to re-fetch from library to know if they are hidden (since results from scanner don't know about library state)
              // But wait, addOrUpdateFiles merges state. So we should fetch fresh from library.
              const allFiles = await libraryService.getAllFiles();
              // Find the files that correspond to this scan result and are NOT hidden
              const filesToEnqueue = allFiles.filter(f => 
                results.some(r => r.fullPath === f.fullPath) && !f.isHidden
              );
              
              metadataQueueService.enqueue(filesToEnqueue);
              metadataQueueService.start();
            }
          }
        }
      } catch (error) {
        console.error("Error polling scan job", error);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [scanJob, fileScannerService, libraryService, loadLibraryFiles, metadataQueueService]);

  const handleFetchMetadata = async (file: MovieFile) => {
    if (!metadataService) return;
    
    setFetchingMetadataId(file.id);
    try {
      const metadata = await metadataService.findBestMatchForFile(file);
      if (metadata) {
        const updatedFile = { ...file, metadata };
        await libraryService.addOrUpdateFiles([updatedFile]);
        await loadLibraryFiles();
      } else {
        alert(`No metadata found for "${file.guessedTitle}"`);
      }
    } catch (error) {
      console.error("Failed to fetch metadata", error);
    } finally {
      setFetchingMetadataId(null);
    }
  };

  const handleToggleFavorite = async (file: MovieFile) => {
    if (libraryService.toggleFavorite) {
      await libraryService.toggleFavorite(file.id);
      await loadLibraryFiles();
    }
  };

  const handleHideFile = (file: MovieFile) => {
    setFilePendingDelete(file);
    setIsDeleteDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-400';
      case 'completed': return 'text-green-400';
      case 'error': return 'text-red-400';
      default: return 'text-text/70';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">Library & Scanner</h3>
          <p className="text-text/70 text-sm">
            Manage your local library and scan for new content.
          </p>
        </div>
      </div>

      {/* Folder Selection */}
      <div className="bg-background/30 p-4 rounded-md border border-text/10 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">Library Folders</h4>
          <Button onClick={handleAddFolder} size="sm" variant="secondary">
            Add Folder
          </Button>
        </div>
        
        {scanPaths.length === 0 ? (
          <div className="text-xs text-text/50 italic">No folders selected.</div>
        ) : (
          <ul className="space-y-2">
            {scanPaths.map(path => (
              <li key={path} className="flex items-center justify-between bg-background/50 px-3 py-2 rounded text-sm">
                <span className="truncate font-mono text-xs">{path}</span>
                <button 
                  onClick={() => handleRemoveFolder(path)}
                  className="text-text/50 hover:text-red-400 transition-colors"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="pt-2 border-t border-text/10">
          <Button 
            onClick={handleStartScan} 
            disabled={scanJob?.status === 'running' || scanPaths.length === 0}
            className="w-full gap-2"
          >
            {scanJob?.status === 'running' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FolderSearch className="w-4 h-4" />
            )}
            {scanJob?.status === 'running' ? 'Scanning...' : 'Scan Library'}
          </Button>
        </div>
      </div>

      {/* Scan Status */}
      {scanJob && (
        <div className="bg-background/50 p-4 rounded-md border border-text/10">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm">Scan Status:</span>
            <span className={`text-sm font-bold capitalize flex items-center gap-2 ${getStatusColor(scanJob.status)}`}>
              {scanJob.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
              {scanJob.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
              {scanJob.status === 'error' && <AlertCircle className="w-3 h-3" />}
              {scanJob.status}
            </span>
          </div>
          
          {scanJob.status === 'running' && (
            <div className="w-full bg-background h-2 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-primary transition-all duration-500 animate-pulse"
                style={{ width: '100%' }} 
              />
            </div>
          )}
          
          <div className="mt-2 text-xs text-text/60">
            {scanJob.status === 'running' ? (
               <span>Scan: scanning {scanJob.totalFilesFound || 0} files...</span>
            ) : (
               <div className="flex gap-4">
                 <span>Scan completed.</span>
                 <span>Found: {scanJob.totalFilesFound || 0}</span>
                 <span className="text-green-400">Indexed: {scanJob.totalFilesKept || 0}</span>
               </div>
            )}
            {scanJob.errorMessage && <div className="text-red-400 mt-1">{scanJob.errorMessage}</div>}
          </div>
        </div>
      )}

      {/* Metadata Queue Status */}
      {metadataQueueService && metadataStats && (
        <div className="bg-background/50 p-4 rounded-md border border-text/10">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-sm">Metadata Enrichment:</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold capitalize ${metadataStats.running ? 'text-blue-400' : 'text-text/70'}`}>
                {metadataStats.running ? 'Processing...' : 'Idle'}
              </span>
              {metadataStats.running ? (
                <Button size="sm" variant="secondary" onClick={() => metadataQueueService.pause()} className="h-6 w-6 p-0">
                  <Pause className="w-3 h-3" />
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => metadataQueueService.start()} className="h-6 w-6 p-0">
                  <Play className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
          
          {metadataStats.running && (
            <div className="w-full bg-background h-2 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${metadataStats.total > 0 ? (metadataStats.processed / metadataStats.total) * 100 : 0}%` }}
              />
            </div>
          )}
          
          <div className="text-xs text-text/60 flex gap-4">
            <span>Queue: {metadataStats.total - metadataStats.processed} / {metadataStats.total}</span>
            <span className="text-green-400">Succeeded: {metadataStats.succeeded}</span>
            <span className="text-red-400">Failed: {metadataStats.failed}</span>
          </div>
        </div>
      )}

      {/* Library Table */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium flex items-center gap-2">
            Indexed Files 
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
              {libraryFiles.length}
            </span>
          </h4>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => setShowHidden(!showHidden)}
            className="text-xs text-text/60 hover:text-text"
          >
            {showHidden ? (
              <><EyeOff className="w-3 h-3 mr-1" /> Hide Removed</>
            ) : (
              <><Eye className="w-3 h-3 mr-1" /> Show Removed</>
            )}
          </Button>
        </div>
        
        {libraryFiles.length === 0 ? (
          <div className="text-center py-8 text-text/50 bg-background/30 rounded-lg border border-dashed border-text/10">
            No files indexed yet. Run a scan to build your library.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-text/70 uppercase bg-background/50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">File Name</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Guessed Title</th>
                  <th className="px-4 py-3">Resolution</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3 rounded-tr-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-text/10">
                {libraryFiles.map((file) => (
                  <tr key={file.id} className={`bg-surface hover:bg-background/50 transition-colors ${file.isHidden ? 'opacity-50 grayscale' : ''}`}>
                    <td className="px-4 py-3 font-mono text-xs text-text/80 truncate max-w-[200px]" title={file.fileName}>
                      {file.fileName}
                      {file.isHidden && <span className="ml-2 text-[10px] uppercase border border-text/20 px-1 rounded">Hidden</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {file.mediaType === 'episode' ? (
                        <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                          {file.seasonNumber != null && file.episodeNumber != null 
                            ? `S${String(file.seasonNumber).padStart(2, '0')}E${String(file.episodeNumber).padStart(2, '0')}`
                            : 'Series'}
                        </span>
                      ) : (
                        <span className="text-text/40">Movie</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {file.metadata ? (
                        <div className="flex items-center gap-2">
                          {file.metadata.posterUrl && (
                            <img src={file.metadata.posterUrl} alt="" className="w-6 h-9 object-cover rounded" />
                          )}
                          <div>
                            <div className="text-primary font-bold">{file.metadata.title}</div>
                            <div className="text-xs text-text/60">{file.metadata.year} • {file.metadata.rating}</div>
                          </div>
                        </div>
                      ) : (
                        formatGuessedTitle(file)
                      )}
                    </td>
                    <td className="px-4 py-3 text-text/70">
                      {file.videoResolution || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-background rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              (file.parsingConfidence || 0) > 0.8 ? 'bg-green-500' : 
                              (file.parsingConfidence || 0) > 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${(file.parsingConfidence || 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-text/60">
                          {Math.round((file.parsingConfidence || 0) * 100)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleToggleFavorite(file)}
                          className={`p-1.5 rounded-full transition-colors ${file.isFavorite ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-text/30 hover:text-yellow-400 hover:bg-yellow-400/10'}`}
                          title={file.isFavorite ? "Remove from favorites" : "Add to favorites"}
                        >
                          <Star className={`w-4 h-4 ${file.isFavorite ? 'fill-current' : ''}`} />
                        </button>
                        
                        {!file.isHidden && (
                          <button 
                            onClick={() => { setEditingFile(file); setIsEditorOpen(true); }}
                            className="p-1.5 rounded-full text-text/30 hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Edit Metadata"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}

                        {!file.isHidden && (
                          <button 
                            onClick={() => handleHideFile(file)}
                            className="p-1.5 rounded-full text-text/30 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Remove from library"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        {metadataService && !file.metadata && !file.isHidden && file.metadataSource !== 'manual' && (
                          <Button 
                            size="sm" 
                            variant="secondary"
                            disabled={fetchingMetadataId === file.id}
                            onClick={() => handleFetchMetadata(file)}
                            className="h-7 text-xs px-2"
                          >
                            {fetchingMetadataId === file.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'Fetch'
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Metadata Editor */}
      {editingFile && (
        <ManualMetadataEditor
          file={editingFile}
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={async (updatedFile) => {
            await libraryService.addOrUpdateFiles([updatedFile]);
            await loadLibraryFiles();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {isDeleteDialogOpen && filePendingDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsDeleteDialogOpen(false)} />
          <div className="relative bg-surface p-6 rounded-lg shadow-2xl max-w-md w-full border border-text/10 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold mb-2">Remove File?</h3>
            <p className="text-text/70 mb-6">
              Are you sure you want to remove <span className="text-text font-medium">"{filePendingDelete.fileName}"</span>?
            </p>
            
            <div className="space-y-3">
              <Button 
                variant="secondary" 
                className="w-full justify-start"
                onClick={async () => {
                  await libraryService.hideFile(filePendingDelete.id);
                  await loadLibraryFiles();
                  setIsDeleteDialogOpen(false);
                  setFilePendingDelete(null);
                }}
              >
                Remove from library only (keep file)
              </Button>
              
              {isElectron && (
                <div className="space-y-1">
                  <Button 
                    className="w-full justify-start bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20"
                    onClick={async () => {
                      const success = await libraryService.deleteFileFromDisk(filePendingDelete);
                      if (success) {
                        await loadLibraryFiles();
                      } else {
                        alert("Failed to delete file from disk.");
                      }
                      setIsDeleteDialogOpen(false);
                      setFilePendingDelete(null);
                    }}
                  >
                    Remove and delete file from disk
                  </Button>
                  <p className="text-[10px] text-text/40 px-1">
                    This will move the file to your system trash.
                  </p>
                </div>
              )}
              
              <div className="pt-2 border-t border-text/10 mt-2">
                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => {
                    setIsDeleteDialogOpen(false);
                    setFilePendingDelete(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
