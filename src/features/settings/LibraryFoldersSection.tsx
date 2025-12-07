import React, { useEffect, useState } from 'react';
import { FolderPlus, Trash2, RefreshCw, Folder } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LibraryFolder } from '@/types';

export const LibraryFoldersSection: React.FC = () => {
  const [folders, setFolders] = useState<LibraryFolder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rescanStatus, setRescanStatus] = useState<string | null>(null);

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    if (window.cinemacore?.library) {
      const list = await window.cinemacore.library.getFolders();
      setFolders(list);
    }
  };

  const handleAddFolder = async () => {
    setIsLoading(true);
    try {
      const updated = await window.cinemacore.library.addFolder();
      if (updated) {
        setFolders(updated);
      }
    } catch (err) {
      console.error("Failed to add folder", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFolder = async (folder: LibraryFolder) => {
    if (!confirm(`Remove folder "${folder.displayName || folder.path}" from library settings?`)) return;

    const deleteFiles = confirm("Do you also want to remove all movies associated with this folder from the library database?");

    setIsLoading(true);
    try {
      const updated = await window.cinemacore.library.removeFolder(folder.id, deleteFiles);
      setFolders(updated);
    } catch (err) {
      console.error("Failed to remove folder", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRescan = async (folderId: string) => {
    setRescanStatus("Scanning...");
    try {
      const stats = await window.cinemacore.library.rescanFolder(folderId);
      setRescanStatus(`Done: +${stats.new}, ~${stats.updated}, -${stats.removed}`);
      setTimeout(() => setRescanStatus(null), 5000);
    } catch (err) {
      console.error("Rescan failed", err);
      setRescanStatus("Failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Library Folders</h3>
        <Button onClick={handleAddFolder} disabled={isLoading} variant="primary" className="flex items-center gap-2">
          <FolderPlus className="w-4 h-4" />
          Add Folder
        </Button>
      </div>

      {folders.length === 0 ? (
        <div className="text-center p-8 border-2 border-dashed border-text/20 rounded-lg text-text/50">
          No library folders added yet.
        </div>
      ) : (
        <div className="space-y-2">
          {folders.map(folder => (
            <div key={folder.id} className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-text/10">
              <div className="flex items-center gap-3 overflow-hidden">
                <Folder className="w-5 h-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium truncate">{folder.displayName || folder.path}</div>
                  <div className="text-xs text-text/60 truncate">{folder.path}</div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleRescan(folder.id)}
                  title="Rescan folder"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                  onClick={() => handleRemoveFolder(folder)}
                  title="Remove folder"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {rescanStatus && (
        <div className="text-sm text-primary animate-pulse">
          {rescanStatus}
        </div>
      )}
    </div>
  );
};
