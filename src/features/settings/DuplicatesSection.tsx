import React, { useEffect, useState } from 'react';
import { AlertTriangle, FileVideo } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DuplicateGroup, MovieFile } from '@/types';

export const DuplicatesSection: React.FC = () => {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);

  const loadDuplicates = async () => {
    try {
      if (window.cinemacore?.library) {
        const dups = await window.cinemacore.library.getDuplicates();
        setDuplicates(dups);
      }
    } catch (err) {
      console.error("Failed to load duplicates", err);
    }
  };

  useEffect(() => {
    loadDuplicates();
  }, []);

  const handleRemoveFromLibrary = async (file: MovieFile) => {
    if (!confirm(`Remove "${file.fileName}" from library database? (File will remain on disk)`)) return;
    
    try {
      await window.cinemacore.library.removeFile(file.id);
      // Reload duplicates
      loadDuplicates();
    } catch (err) {
      console.error("Failed to remove file", err);
    }
  };

  if (duplicates.length === 0) return null;

  return (
    <div className="space-y-4 mt-8">
      <div className="flex items-center gap-2 text-yellow-500">
        <AlertTriangle className="w-5 h-5" />
        <h3 className="text-lg font-semibold text-text">Duplicate Files Detected</h3>
      </div>
      
      <div className="space-y-4">
        {duplicates.map((group, idx) => (
          <div key={idx} className="bg-background/30 border border-yellow-500/20 rounded-lg p-4">
            <div className="text-sm text-text/60 mb-2 flex justify-between">
              <span>Group: {group.normalizedName}</span>
              <span>{(group.fileSize / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            
            <div className="space-y-2">
              {group.files.map(file => (
                <div key={file.id} className="flex items-center justify-between bg-background/50 p-2 rounded">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileVideo className="w-4 h-4 text-text/40 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{file.fileName}</div>
                      <div className="text-xs text-text/50 truncate">{file.fullPath}</div>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => handleRemoveFromLibrary(file)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
