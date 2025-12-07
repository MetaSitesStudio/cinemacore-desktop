import React, { useState, useEffect } from 'react';
import { useServices } from '@/services/ServiceContext';
import { Button } from '@/components/ui/Button';
import { FolderSearch } from 'lucide-react';
import { ScanProgressModal } from '@/components/modals/ScanProgressModal';

export const LibraryScannerSection: React.FC = () => {
  const { libraryService, metadataQueueService } = useServices();
  
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [scanLogs, setScanLogs] = useState<string[]>([]);
  const [scanIsRunning, setScanIsRunning] = useState(false);
  const [scanTotalFiles, setScanTotalFiles] = useState<number | null>(null);
  const [scanProcessed, setScanProcessed] = useState(0);
  const [scanCurrentFile, setScanCurrentFile] = useState<string | undefined>();
  const [isMetadataScanning, setIsMetadataScanning] = useState(false);

  // Listen for IPC progress events
  useEffect(() => {
    if (!window.cinemacore?.onScanProgress) return;

    const unsubscribe = window.cinemacore.onScanProgress((_event, payload) => {
      switch (payload.type) {
        case "start":
          setScanLogs([]);
          setScanTotalFiles(payload.totalFiles ?? null);
          setScanProcessed(0);
          setScanIsRunning(true);
          break;
        case "file":
          setScanCurrentFile(payload.filePath);
          setScanProcessed(prev => prev + 1);
          setScanLogs(prev => [...prev, `Found: ${payload.filePath}`]);
          break;
        case "log":
          setScanLogs(prev => [...prev, payload.message]);
          break;
        case "error":
          setScanLogs(prev => [...prev, `ERROR: ${payload.message}`]);
          break;
        case "done":
          setScanIsRunning(false);
          setScanLogs(prev => [...prev, "Disk scan complete."]);
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Also listen to MetadataQueueService logs if possible, or just status
  useEffect(() => {
      if (!metadataQueueService) return;
      
      const unsubscribe = metadataQueueService.onStatsChanged((stats) => {
          setIsMetadataScanning(stats.running);
          
          if (stats.running && stats.processed > 0) {
             // Optional: Add log for metadata progress if needed, 
             // but be careful not to spam logs if stats update frequently
          }
          
          if (!stats.running && stats.total > 0 && stats.processed === stats.total) {
              setScanLogs(prev => {
                  if (!prev.includes("Metadata fetching complete.")) {
                      return [...prev, "Metadata fetching complete."];
                  }
                  return prev;
              });
          }
      });
      return unsubscribe;
  }, [metadataQueueService]);

  const handleStartScan = async () => {
    setIsScanModalOpen(true);
    setScanLogs(["Starting scan..."]);
    setScanIsRunning(true);
    
    try {
        const folders = await libraryService.getFolders();
        if (folders.length === 0) {
            setScanLogs(prev => [...prev, "No library folders configured. Please add folders in the Library Folders section."]);
            setScanIsRunning(false);
            return;
        }

        for (const folder of folders) {
            setScanLogs(prev => [...prev, `Scanning folder: ${folder.path}`]);
            await libraryService.rescanFolder(folder.id);
        }
        
        // Enqueue files for metadata
        setScanLogs(prev => [...prev, "Checking for files needing metadata or artwork..."]);
        const allFiles = await libraryService.getAllFiles();
        // Check for files missing metadata OR missing ALL artwork
        const filesNeedingMetadata = allFiles.filter(f => {
            const hasMetadata = !!f.metadata;
            const hasOmdbPoster = !!f.metadata?.posterUrl && f.metadata.posterUrl !== 'N/A';
            const hasTmdbPoster = !!f.tmdbPosterUrl;
            const hasTmdbBackdrop = !!f.tmdbBackdropUrl;
            const hasAnyArtwork = hasOmdbPoster || hasTmdbPoster || hasTmdbBackdrop;

            return (!hasMetadata || !hasAnyArtwork) && 
                   !f.isHidden && 
                   f.metadataSource !== 'manual';
        });
        
        if (filesNeedingMetadata.length > 0) {
             setScanLogs(prev => [...prev, `Enqueuing ${filesNeedingMetadata.length} files for metadata fetching...`]);
             metadataQueueService?.enqueue(filesNeedingMetadata);
             metadataQueueService?.start();
             // setIsMetadataScanning will be updated by the effect
        } else {
             setScanLogs(prev => [...prev, "All files have metadata and artwork."]);
        }

    } catch (error) {
        setScanLogs(prev => [...prev, `Error: ${error}`]);
        setScanIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">Library Scanner</h3>
          <p className="text-text/70 text-sm">
            Scan your configured folders for new content.
          </p>
        </div>
        <Button onClick={handleStartScan} disabled={scanIsRunning || isMetadataScanning}>
            <FolderSearch className="w-4 h-4 mr-2" />
            Scan Library
        </Button>
      </div>

      <ScanProgressModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        totalFiles={scanTotalFiles}
        processedFiles={scanProcessed}
        currentFileName={scanCurrentFile}
        logs={scanLogs}
        isScanning={scanIsRunning || isMetadataScanning}
      />
    </div>
  );
};
