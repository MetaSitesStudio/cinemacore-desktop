import React from 'react';
import { Button } from '../ui/Button';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  itemName: string;
  isElectron: boolean;
  onConfirmLibraryOnly: () => void;
  onConfirmDiskDelete: () => void;
}

export const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  onClose,
  title = "Remove File?",
  itemName,
  isElectron,
  onConfirmLibraryOnly,
  onConfirmDiskDelete
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface p-6 rounded-lg shadow-2xl max-w-md w-full border border-text/10 animate-in fade-in zoom-in duration-200">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-text/70 mb-6">
          Are you sure you want to remove <span className="text-text font-medium">"{itemName}"</span>?
        </p>
        
        <div className="space-y-3">
          <Button 
            variant="secondary" 
            className="w-full justify-start"
            onClick={onConfirmLibraryOnly}
          >
            Remove from library only (keep file)
          </Button>
          
          {isElectron && (
            <div className="space-y-1">
              <Button 
                className="w-full justify-start bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20"
                onClick={onConfirmDiskDelete}
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
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
